import {
  ChannelPermission,
  DEFAULT_MESSAGES_LIMIT,
  ServerEvents,
  type TMessage
} from '@connectmessager/shared';
import { and, count, desc, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';
import { db } from '../../db';
import { getChannelsReadStatesForUser } from '../../db/queries/channels';
import { assertDmChannel } from '../../db/queries/dms';
import { joinMessagesWithRelations } from '../../db/queries/messages';
import { channelReadStates, channels, messages } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { pubsub } from '../../utils/pubsub';
import { protectedProcedure } from '../../utils/trpc';

const getMessagesRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number(),
      cursor: z.number().nullish(),
      targetMessageId: z.number().nullish(),
      limit: z.number().default(DEFAULT_MESSAGES_LIMIT)
    })
  )
  .meta({ infinite: true })
  .query(async ({ ctx, input }) => {
    await Promise.all([
      assertDmChannel(input.channelId, ctx.userId),
      ctx.needsChannelPermission(
        input.channelId,
        ChannelPermission.VIEW_CHANNEL
      )
    ]);

    const { channelId, cursor, limit, targetMessageId } = input;

    const channel = await db
      .select({
        private: channels.private,
        fileAccessToken: channels.fileAccessToken
      })
      .from(channels)
      .where(eq(channels.id, channelId))
      .get();

    invariant(channel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    const baseWhere = and(
      eq(messages.channelId, channelId),
      isNull(messages.parentMessageId)
    );

    let rows: TMessage[];
    let nextCursor: number | null = null;

    if (targetMessageId) {
      // history/jump mode: fetch a window around the target id
      const targetMessage = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.id, targetMessageId),
            eq(messages.channelId, channelId)
          )
        )
        .get();

      invariant(targetMessage, {
        code: 'NOT_FOUND',
        message: 'Target message not found'
      });

      invariant(!targetMessage.parentMessageId, {
        code: 'BAD_REQUEST',
        message: 'Target message must be a root message'
      });

      const newerLimit = Math.max(Math.floor(limit / 2), 1);
      const olderLimit = Math.max(limit - newerLimit, 1);

      // keep context near target, not near the latest message
      const newerMessagesAsc = await db
        .select()
        .from(messages)
        .where(and(baseWhere, gte(messages.id, targetMessage.id)))
        .orderBy(messages.id)
        .limit(newerLimit);

      const olderMessages = await db
        .select()
        .from(messages)
        .where(and(baseWhere, lt(messages.id, targetMessage.id)))
        .orderBy(desc(messages.id))
        .limit(olderLimit + 1);

      const hasMoreOlder = olderMessages.length > olderLimit;
      const trimmedOlderMessages = hasMoreOlder
        ? olderMessages.slice(0, olderLimit)
        : olderMessages;

      rows = [...[...newerMessagesAsc].reverse(), ...trimmedOlderMessages];

      if (hasMoreOlder && rows.length > 0) {
        // cursor points to the oldest message currently included
        nextCursor = rows[rows.length - 1]!.id;
      } else {
        nextCursor = null;
      }
    } else {
      // standard cursor-based pagination
      rows = await db
        .select()
        .from(messages)
        .where(cursor ? and(baseWhere, lt(messages.id, cursor)) : baseWhere)
        .orderBy(desc(messages.id))
        .limit(limit + 1);

      if (rows.length > limit) {
        rows = rows.slice(0, limit);
        // cursor points to the oldest message currently included
        nextCursor = rows[rows.length - 1]!.id;
      }
    }

    if (rows.length === 0) {
      return { messages: [], nextCursor };
    }

    const messagesWithRelations = await joinMessagesWithRelations(
      rows,
      channel
    );

    const messageIds = rows.map((m) => m.id);
    const replies = alias(messages, 'replies');

    const replyCountRows = await db
      .select({
        parentMessageId: replies.parentMessageId,
        count: count()
      })
      .from(replies)
      .where(inArray(replies.parentMessageId, messageIds))
      .groupBy(replies.parentMessageId);

    const replyCountByMessage = replyCountRows.reduce<Record<number, number>>(
      (acc, r) => {
        if (r.parentMessageId !== null) {
          acc[r.parentMessageId] = r.count;
        }
        return acc;
      },
      {}
    );

    const messagesWithReplyCounts = messagesWithRelations.map((msg) => ({
      ...msg,
      replyCount: replyCountByMessage[msg.id] ?? 0
    }));

    // always update read state to the absolute latest message in the channel
    // (not just the newest in this batch, in case user is scrolling back through history)
    // this is not ideal, but it's good enough for now
    const latestMessage = await db
      .select()
      .from(messages)
      .where(
        and(eq(messages.channelId, channelId), isNull(messages.parentMessageId))
      )
      .orderBy(desc(messages.id))
      .limit(1)
      .get();

    if (latestMessage) {
      await db
        .insert(channelReadStates)
        .values({
          channelId,
          userId: ctx.userId,
          lastReadMessageId: latestMessage.id,
          lastReadAt: Date.now()
        })
        .onConflictDoUpdate({
          target: [channelReadStates.channelId, channelReadStates.userId],
          set: {
            lastReadMessageId: latestMessage.id,
            lastReadAt: Date.now()
          }
        });

      const updatedReadStates = await getChannelsReadStatesForUser(
        ctx.userId,
        channelId
      );

      pubsub.publishFor(ctx.userId, ServerEvents.CHANNEL_READ_STATES_UPDATE, {
        channelId,
        count: updatedReadStates[channelId] ?? 0
      });
    }

    return { messages: messagesWithReplyCounts, nextCursor };
  });

export { getMessagesRoute };


