import { ActivityLogType, Permission } from '@connectmessager/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { removeFile } from '../../db/mutations/files';
import { getFileIdsByChannelId, isFileOrphaned } from '../../db/queries/files';
import { getPrimaryUserRole } from '../../db/queries/roles';
import { publishChannel } from '../../db/publishers';
import { isDirectMessageChannel } from '../../db/queries/dms';
import { channels } from '../../db/schema';
import {
  canManageGroupWithFilter,
  normalizeVisibilityFilter
} from '../../helpers/user-visibility';
import { enqueueActivityLog } from '../../queues/activity-log';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const deleteChannelRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const isDmChannel = await isDirectMessageChannel(input.channelId);

    invariant(!isDmChannel, {
      code: 'FORBIDDEN',
      message: 'Cannot delete DM channels'
    });

    const targetChannel = await db
      .select({
        id: channels.id,
        name: channels.name,
        isGroupChannel: channels.isGroupChannel,
        groupFilter: channels.groupFilter,
        groupAvatarId: channels.groupAvatarId
      })
      .from(channels)
      .where(eq(channels.id, input.channelId))
      .get();

    invariant(targetChannel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    if (targetChannel.isGroupChannel) {
      await ctx.needsPermission(Permission.MANAGE_GROUP_CHATS);

      const currentRole = await getPrimaryUserRole(ctx.user.id);
      const currentFilter = normalizeVisibilityFilter(currentRole);

      invariant(canManageGroupWithFilter(currentFilter, targetChannel.groupFilter), {
        code: 'FORBIDDEN',
        message: 'You can only delete groups for your own visibility filter.'
      });
    } else {
      await ctx.needsPermission(Permission.MANAGE_CHANNELS);
    }

    const relatedFileIds = await getFileIdsByChannelId(input.channelId);
    if (targetChannel.groupAvatarId) {
      relatedFileIds.push(targetChannel.groupAvatarId);
    }

    const removedChannel = await db
      .delete(channels)
      .where(eq(channels.id, input.channelId))
      .returning()
      .get();

    invariant(removedChannel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    for (const fileId of [...new Set(relatedFileIds)]) {
      if (await isFileOrphaned(fileId)) {
        await removeFile(fileId);
      }
    }

    const runtime = VoiceRuntime.findById(removedChannel.id);

    if (runtime) {
      runtime.destroy();
    }

    publishChannel(removedChannel.id, 'delete');
    enqueueActivityLog({
      type: ActivityLogType.DELETED_CHANNEL,
      userId: ctx.user.id,
      details: {
        channelId: removedChannel.id,
        channelName: removedChannel.name
      }
    });
  });

export { deleteChannelRoute };


