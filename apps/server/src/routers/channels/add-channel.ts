import {
  ActivityLogType,
  ChannelType,
  Permission
} from '@connectmessager/shared';
import { randomUUIDv7 } from 'bun';
import { desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannel } from '../../db/publishers';
import { getPrimaryUserRole } from '../../db/queries/roles';
import { channels } from '../../db/schema';
import {
  FILTER_ALL,
  canManageGroupWithFilter,
  normalizeVisibilityFilter
} from '../../helpers/user-visibility';
import { fileManager } from '../../utils/file-manager';
import { invariant } from '../../utils/invariant';
import { enqueueActivityLog } from '../../queues/activity-log';
import { VoiceRuntime } from '../../runtimes/voice';
import { protectedProcedure } from '../../utils/trpc';

const addChannelRoute = protectedProcedure
  .input(
    z.object({
      type: z.enum(ChannelType),
      name: z.string().min(1).max(27),
      categoryId: z.number().nullable().optional(),
      isGroupChannel: z.boolean().optional().default(false),
      groupDescription: z.string().max(280).nullish(),
      groupFilter: z.string().max(64).nullish(),
      groupAvatarTempFileId: z.string().nullish()
    })
  )
  .mutation(async ({ input, ctx }) => {
    if (input.isGroupChannel) {
      await ctx.needsPermission(Permission.MANAGE_GROUP_CHATS);
    } else {
      await ctx.needsPermission(Permission.MANAGE_CHANNELS);
    }

    invariant(!input.isGroupChannel || input.type === ChannelType.TEXT, {
      code: 'BAD_REQUEST',
      message: 'Groups can only be created as text channels.'
    });

    const normalizedGroupFilter = input.isGroupChannel
      ? normalizeVisibilityFilter({ scope: 'filter', filter: input.groupFilter ?? '' })
      : FILTER_ALL;

    if (input.isGroupChannel) {
      const currentRole = await getPrimaryUserRole(ctx.user.id);
      const currentFilter = normalizeVisibilityFilter(currentRole);

      invariant(canManageGroupWithFilter(currentFilter, normalizedGroupFilter), {
        code: 'FORBIDDEN',
        message: 'You can only create groups for your own visibility filter.'
      });
    }

    const savedGroupAvatar = input.groupAvatarTempFileId
      ? await fileManager.saveFile(input.groupAvatarTempFileId, ctx.user.id)
      : null;

    const channel = await db.transaction(async (tx) => {
      const maxPositionChannel = await tx
        .select()
        .from(channels)
        .orderBy(desc(channels.position))
        .where(
          input.categoryId == null
            ? isNull(channels.categoryId)
            : eq(channels.categoryId, input.categoryId)
        )
        .limit(1)
        .get();

      const now = Date.now();

      const newChannel = await tx
        .insert(channels)
        .values({
          position:
            maxPositionChannel?.position !== undefined
              ? maxPositionChannel.position + 1
              : 0,
          name: input.name,
          type: input.type,
          topic: input.isGroupChannel ? null : undefined,
          isGroupChannel: input.isGroupChannel,
          groupDescription: input.isGroupChannel ? input.groupDescription ?? null : null,
          groupFilter: normalizedGroupFilter,
          groupAvatarId: savedGroupAvatar?.id ?? null,
          fileAccessToken: randomUUIDv7(),
          fileAccessTokenUpdatedAt: now,
          categoryId: input.categoryId ?? null,
          createdAt: now
        })
        .returning()
        .get();

      return newChannel;
    });

    if (channel.type === ChannelType.VOICE) {
      const runtime = new VoiceRuntime(channel.id);

      await runtime.init();
    }

    publishChannel(channel.id, 'create');
    enqueueActivityLog({
      type: ActivityLogType.CREATED_CHANNEL,
      userId: ctx.user.id,
      details: {
        channelId: channel.id,
        channelName: channel.name,
        type: channel.type as ChannelType
      }
    });

    return channel.id;
  });

export { addChannelRoute };


