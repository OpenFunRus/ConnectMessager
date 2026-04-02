import {
  ActivityLogType,
  DELETED_USER_IDENTITY_AND_NAME,
  DisconnectCode,
  Permission,
  ServerEvents
} from '@connectmessager/shared';
import { and, eq, notInArray } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import z from 'zod';
import { db } from '../../db';
import { publishChannel, publishUser } from '../../db/publishers';
import { getDirectMessageChannelIdsForUser } from '../../db/queries/dms';
import { getUserByIdentity } from '../../db/queries/users';
import {
  channels,
  emojis,
  files,
  messageReactions,
  messages,
  users
} from '../../db/schema';
import { PUBLIC_PATH } from '../../helpers/paths';
import { getThumbnailCachePath } from '../../helpers/thumbnails';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { pubsub } from '../../utils/pubsub';
import { protectedProcedure } from '../../utils/trpc';

const ensureDeletedUser = async (): Promise<number> => {
  const existingDeletedUser = await getUserByIdentity(
    DELETED_USER_IDENTITY_AND_NAME
  );

  if (existingDeletedUser) {
    return existingDeletedUser.id;
  }

  const insertedDeletedUser = await db
    .insert(users)
    .values({
      identity: DELETED_USER_IDENTITY_AND_NAME,
      password: Bun.randomUUIDv7(),
      name: DELETED_USER_IDENTITY_AND_NAME,
      avatarId: null,
      bannerId: null,
      bio: null,
      bannerColor: null,
      createdAt: Date.now()
    })
    .returning({ id: users.id })
    .get();

  if (!insertedDeletedUser) {
    throw new Error('Failed to create deleted user placeholder');
  }

  await publishUser(insertedDeletedUser.id, 'create');

  return insertedDeletedUser.id;
};

const ACCOUNT_DELETED_REASON = 'Ваш аккаунт удалён';

const deleteUserRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      wipe: z.boolean().default(false)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    invariant(input.userId !== ctx.user.id, {
      code: 'BAD_REQUEST',
      message: 'Нельзя удалить самого себя.'
    });

    const targetUser = await db
      .select({
        id: users.id,
        identity: users.identity
      })
      .from(users)
      .where(eq(users.id, input.userId))
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found.'
    });

    invariant(targetUser.identity !== DELETED_USER_IDENTITY_AND_NAME, {
      code: 'BAD_REQUEST',
      message: 'Cannot delete the deleted user placeholder.'
    });

    const userWs = ctx.getUserWs(input.userId);
    const dmChannelIds = input.wipe
      ? await getDirectMessageChannelIdsForUser(input.userId)
      : [];
    const ownedFiles = input.wipe
      ? await db
          .select({
            id: files.id,
            name: files.name
          })
          .from(files)
          .where(eq(files.userId, input.userId))
      : [];

    const deletedUserId = input.wipe ? input.userId : await ensureDeletedUser();

    await db.transaction(async (tx) => {
      if (!input.wipe) {
        // Reassign everything to deleted user placeholder

        await tx
          .update(messages)
          .set({ userId: deletedUserId })
          .where(eq(messages.userId, input.userId));

        await tx
          .update(emojis)
          .set({ userId: deletedUserId })
          .where(eq(emojis.userId, input.userId));

        await tx
          .update(messageReactions)
          .set({ userId: deletedUserId })
          .where(eq(messageReactions.userId, input.userId));

        await tx
          .update(files)
          .set({ userId: deletedUserId })
          .where(eq(files.userId, input.userId));
      } else {
        if (dmChannelIds.length > 0) {
          await tx.delete(messages).where(
            and(
              eq(messages.userId, input.userId),
              notInArray(messages.channelId, dmChannelIds)
            )
          );
        } else {
          await tx.delete(messages).where(eq(messages.userId, input.userId));
        }

        for (const channelId of dmChannelIds) {
          await tx.delete(channels).where(eq(channels.id, channelId));
        }
        await tx.delete(users).where(eq(users.id, input.userId));
        await tx.delete(files).where(eq(files.userId, input.userId));
        return;
      }

      await tx.delete(users).where(eq(users.id, input.userId));
    });

    for (const file of ownedFiles) {
      const filePath = path.join(PUBLIC_PATH, file.name);
      await fs.unlink(filePath).catch(() => undefined);

      const thumbnailPath = getThumbnailCachePath(file.name);
      await fs.unlink(thumbnailPath).catch(() => undefined);
    }

    pubsub.publish(ServerEvents.USER_DELETE, {
      isWipe: input.wipe,
      userId: input.userId,
      deletedUserId
    });

    if (input.wipe) {
      for (const channelId of dmChannelIds) {
        await publishChannel(channelId, 'delete');
      }
    }

    if (userWs) {
      userWs.close(DisconnectCode.KICKED, ACCOUNT_DELETED_REASON);
    }

    enqueueActivityLog({
      type: ActivityLogType.USER_DELETED,
      userId: ctx.userId,
      details: {
        reason: ACCOUNT_DELETED_REASON,
        deletedBy: ctx.userId
      }
    });
  });

export { deleteUserRoute };


