import { ActivityLogType, ChannelPermission, Permission } from '@connectmessager/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { removeFile } from '../../db/mutations/files';
import { getAffectedUserIdsForChannel } from '../../db/queries/channels';
import { isFileOrphaned } from '../../db/queries/files';
import { getPrimaryUserRole } from '../../db/queries/roles';
import { publishChannel } from '../../db/publishers';
import { isDirectMessageChannel } from '../../db/queries/dms';
import { channels } from '../../db/schema';
import {
  canManageGroupWithFilter,
  normalizeVisibilityFilter
} from '../../helpers/user-visibility';
import { enqueueActivityLog } from '../../queues/activity-log';
import { fileManager } from '../../utils/file-manager';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const updateChannelRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number().min(1),
      name: z.string().min(1).max(27).optional(),
      topic: z.string().max(128).nullable().optional(),
      private: z.boolean().optional(),
      groupDescription: z.string().max(280).nullable().optional(),
      groupFilter: z.string().max(64).nullable().optional(),
      groupAvatarTempFileId: z.string().nullable().optional(),
      clearGroupAvatar: z.boolean().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const isDmChannel = await isDirectMessageChannel(input.channelId);

    invariant(!isDmChannel, {
      code: 'FORBIDDEN',
      message: 'Cannot update DM channels'
    });

    const oldChannel = await db
      .select({
        private: channels.private,
        isGroupChannel: channels.isGroupChannel,
        groupAvatarId: channels.groupAvatarId,
        groupFilter: channels.groupFilter
      })
      .from(channels)
      .where(eq(channels.id, input.channelId))
      .get();

    invariant(oldChannel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    if (oldChannel.isGroupChannel) {
      await ctx.needsPermission(Permission.MANAGE_GROUP_CHATS);

      const currentRole = await getPrimaryUserRole(ctx.user.id);
      const currentFilter = normalizeVisibilityFilter(currentRole);
      const requestedGroupFilter =
        input.groupFilter !== undefined
          ? normalizeVisibilityFilter({ scope: 'filter', filter: input.groupFilter ?? '' })
          : oldChannel.groupFilter;

      invariant(canManageGroupWithFilter(currentFilter, oldChannel.groupFilter), {
        code: 'FORBIDDEN',
        message: 'You can only edit groups for your own visibility filter.'
      });
      invariant(canManageGroupWithFilter(currentFilter, requestedGroupFilter), {
        code: 'FORBIDDEN',
        message: 'You can only move groups within your own visibility filter.'
      });
    } else {
      await ctx.needsPermission(Permission.MANAGE_CHANNELS);
    }

    const nextGroupAvatar = input.groupAvatarTempFileId
      ? await fileManager.saveFile(input.groupAvatarTempFileId, ctx.user.id)
      : null;

    const nextGroupFilter =
      oldChannel.isGroupChannel && input.groupFilter !== undefined
        ? normalizeVisibilityFilter({ scope: 'filter', filter: input.groupFilter ?? '' })
        : undefined;
    const ensureUserAccessCandidate =
      input.private !== undefined && input.private !== oldChannel.private ||
      (nextGroupFilter !== undefined && nextGroupFilter !== oldChannel.groupFilter);
    const previousAffectedUserIds = ensureUserAccessCandidate
      ? await getAffectedUserIdsForChannel(input.channelId, {
          permission: ChannelPermission.VIEW_CHANNEL
        })
      : undefined;

    const updatedChannel = await db
      .update(channels)
      .set({
        name: input.name,
        topic: input.topic,
        private: input.private,
        groupDescription:
          oldChannel.isGroupChannel && input.groupDescription !== undefined
            ? input.groupDescription
            : undefined,
        groupFilter: nextGroupFilter,
        groupAvatarId:
          oldChannel.isGroupChannel && (input.clearGroupAvatar || nextGroupAvatar)
            ? (nextGroupAvatar?.id ?? null)
            : undefined
      })
      .where(eq(channels.id, input.channelId))
      .returning()
      .get();

    // privacy setting changed
    const ensureUserAccess =
      updatedChannel.private !== oldChannel.private ||
      (nextGroupFilter !== undefined && nextGroupFilter !== oldChannel.groupFilter);

    publishChannel(updatedChannel.id, 'update', ensureUserAccess, previousAffectedUserIds);

    if (
      oldChannel.groupAvatarId &&
      oldChannel.groupAvatarId !== updatedChannel.groupAvatarId &&
      (await isFileOrphaned(oldChannel.groupAvatarId))
    ) {
      await removeFile(oldChannel.groupAvatarId);
    }

    enqueueActivityLog({
      type: ActivityLogType.UPDATED_CHANNEL,
      userId: ctx.user.id,
      details: {
        channelId: updatedChannel.id,
        values: {
          name: input.name,
          topic: input.topic,
          private: input.private,
          groupDescription: input.groupDescription,
          groupFilter: nextGroupFilter
        }
      }
    });
  });

export { updateChannelRoute };


