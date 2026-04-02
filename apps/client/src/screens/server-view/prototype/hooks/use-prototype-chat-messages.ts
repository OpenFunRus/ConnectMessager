import { getTRPCClient } from '@/lib/trpc';
import { CURRENT_MESSAGES_LIMIT, HISTORY_MESSAGES_LIMIT, MAIN_GROUP_CHAT_ID, MAX_VISIBLE_MESSAGES, NOTES_CHAT_ID } from '../constants';
import type { TChatPagingState, TMessage } from '../types';
import {
  createDefaultPagingState,
  getDmUserIdFromChatId,
  getGroupChannelIdFromChatId,
  mergeMessagesAsc
} from '../utils';
import { useCallback, useEffect, useRef, useState } from 'react';

type TRawMessage = {
  id: number;
  userId: number;
  content: string | null;
  createdAt: number;
  files?: TMessage['files'];
  reactions?: TMessage['reactions'];
  pinned?: boolean | null;
  pinnedAt?: number | null;
  pinnedBy?: number | null;
};

type TUsePrototypeChatMessagesParams = {
  ownUserId?: number;
  activeChatId: string | null;
  contactsLength: number;
  mainGroupChannelId: number | null;
  groupChannelByChatId: Record<string, number>;
  mapRawMessagesToAsc: (rawMessages: TRawMessage[]) => TMessage[];
};

const usePrototypeChatMessages = ({
  ownUserId,
  activeChatId,
  contactsLength,
  mainGroupChannelId,
  groupChannelByChatId,
  mapRawMessagesToAsc
}: TUsePrototypeChatMessagesParams) => {
  const [dmChannelByChatId, setDmChannelByChatId] = useState<Record<string, number>>({});
  const [messagesByChatId, setMessagesByChatId] = useState<Record<string, TMessage[]>>({});
  const [dmUnreadByChatId, setDmUnreadByChatId] = useState<Record<string, number>>({});
  const [pagingByChatId, setPagingByChatId] = useState<Record<string, TChatPagingState>>({});

  const messagesByChatIdRef = useRef<Record<string, TMessage[]>>({});
  const pagingByChatIdRef = useRef<Record<string, TChatPagingState>>({});
  const dmChannelByChatIdRef = useRef<Record<string, number>>({});

  const getHasMoreAfter = useCallback(
    (chatId: string) => {
      const paging = pagingByChatId[chatId];
      if (!paging) return false;

      const visibleMessages = messagesByChatId[chatId] || [];
      const visibleNewestId =
        visibleMessages.length > 0 ? visibleMessages[visibleMessages.length - 1]!.id : null;

      if (paging.afterBuffer.length > 0) {
        return true;
      }

      return (
        paging.currentWindowNewestId !== null &&
        visibleNewestId !== null &&
        visibleNewestId < paging.currentWindowNewestId
      );
    },
    [messagesByChatId, pagingByChatId]
  );

  const loadCurrentWindowForChat = useCallback(
    async (chatId: string, channelId: number) => {
      const data = await getTRPCClient().messages.get.query({
        channelId,
        cursor: null,
        targetMessageId: null,
        limit: CURRENT_MESSAGES_LIMIT
      });

      const mapped = mapRawMessagesToAsc(data.messages);
      const newestId = data.messages[0]?.id ?? null;

      setMessagesByChatId((prev) => ({
        ...prev,
        [chatId]: mapped
      }));

      setPagingByChatId((prev) => ({
        ...prev,
        [chatId]: {
          cursor: data.nextCursor,
          hasMore: data.nextCursor !== null,
          beforeBuffer: [],
          afterBuffer: [],
          currentWindowNewestId: newestId
        }
      }));
    },
    [mapRawMessagesToAsc]
  );

  const loadOlderWindowForChat = useCallback(
    async (chatId: string, channelId: number) => {
      const paging = pagingByChatIdRef.current[chatId] ?? createDefaultPagingState();
      if (paging.beforeBuffer.length > 0) {
        const bufferedOlder = paging.beforeBuffer.slice(
          Math.max(paging.beforeBuffer.length - HISTORY_MESSAGES_LIMIT, 0)
        );
        const remainingBefore = paging.beforeBuffer.slice(
          0,
          Math.max(paging.beforeBuffer.length - HISTORY_MESSAGES_LIMIT, 0)
        );
        const currentVisible = messagesByChatIdRef.current[chatId] || [];
        const merged = mergeMessagesAsc(bufferedOlder, currentVisible);
        const nextVisible =
          merged.length > MAX_VISIBLE_MESSAGES ? merged.slice(0, MAX_VISIBLE_MESSAGES) : merged;
        const overflowNewest =
          merged.length > MAX_VISIBLE_MESSAGES ? merged.slice(MAX_VISIBLE_MESSAGES) : [];

        setMessagesByChatId((prev) => ({
          ...prev,
          [chatId]: nextVisible
        }));
        setPagingByChatId((prev) => {
          const current = prev[chatId] ?? createDefaultPagingState();
          return {
            ...prev,
            [chatId]: {
              ...current,
              beforeBuffer: remainingBefore,
              afterBuffer:
                overflowNewest.length > 0
                  ? mergeMessagesAsc(current.afterBuffer, overflowNewest)
                  : current.afterBuffer
            }
          };
        });
        return;
      }

      if (!paging.hasMore) return;

      const data = await getTRPCClient().messages.get.query({
        channelId,
        cursor: paging.cursor,
        targetMessageId: null,
        limit: HISTORY_MESSAGES_LIMIT
      });

      const olderAsc = mapRawMessagesToAsc(data.messages);
      const fetchedNewestId = data.messages[0]?.id ?? null;
      const currentVisible = messagesByChatIdRef.current[chatId] || [];
      const merged = mergeMessagesAsc(olderAsc, currentVisible);
      const nextVisible = merged.slice(0, MAX_VISIBLE_MESSAGES);
      const overflowNewest =
        merged.length > MAX_VISIBLE_MESSAGES ? merged.slice(MAX_VISIBLE_MESSAGES) : [];

      setMessagesByChatId((prev) => ({
        ...prev,
        [chatId]: nextVisible
      }));

      setPagingByChatId((prev) => {
        const current = prev[chatId] ?? createDefaultPagingState();
        return {
          ...prev,
          [chatId]: {
            ...current,
            afterBuffer:
              overflowNewest.length > 0
                ? mergeMessagesAsc(current.afterBuffer, overflowNewest)
                : current.afterBuffer,
            cursor: data.nextCursor,
            hasMore: data.nextCursor !== null,
            currentWindowNewestId:
              fetchedNewestId === null
                ? current.currentWindowNewestId
                : Math.max(current.currentWindowNewestId ?? 0, fetchedNewestId)
          }
        };
      });
    },
    [mapRawMessagesToAsc]
  );

  const loadNewerWindowForChat = useCallback(
    async (chatId: string, channelId: number) => {
      const paging = pagingByChatIdRef.current[chatId] ?? createDefaultPagingState();
      const currentVisible = messagesByChatIdRef.current[chatId] || [];
      if (currentVisible.length === 0) return;

      const bufferedNextMessages = paging.afterBuffer.slice(0, HISTORY_MESSAGES_LIMIT);
      if (bufferedNextMessages.length > 0) {
        const remainingAfterBuffer = paging.afterBuffer.slice(bufferedNextMessages.length);
        const merged = mergeMessagesAsc(currentVisible, bufferedNextMessages);
        const nextVisible =
          merged.length > MAX_VISIBLE_MESSAGES
            ? merged.slice(merged.length - MAX_VISIBLE_MESSAGES)
            : merged;
        const overflowOldest =
          merged.length > MAX_VISIBLE_MESSAGES
            ? merged.slice(0, merged.length - MAX_VISIBLE_MESSAGES)
            : [];

        setMessagesByChatId((prev) => ({
          ...prev,
          [chatId]: nextVisible
        }));
        setPagingByChatId((prev) => ({
          ...prev,
          [chatId]: {
            ...(prev[chatId] ?? createDefaultPagingState()),
            beforeBuffer:
              overflowOldest.length > 0
                ? mergeMessagesAsc(
                    (prev[chatId] ?? createDefaultPagingState()).beforeBuffer,
                    overflowOldest
                  )
                : (prev[chatId] ?? createDefaultPagingState()).beforeBuffer,
            afterBuffer: remainingAfterBuffer
          }
        }));
        return;
      }

      if (
        paging.currentWindowNewestId === null ||
        currentVisible[currentVisible.length - 1]!.id >= paging.currentWindowNewestId
      ) {
        return;
      }

      const middleLoaded = currentVisible[Math.floor(currentVisible.length / 2)]?.id;
      if (!middleLoaded) return;
      const forwardAnchor = Math.min(middleLoaded + 25, paging.currentWindowNewestId);
      if (forwardAnchor <= middleLoaded) return;

      const data = await getTRPCClient().messages.get.query({
        channelId,
        cursor: null,
        targetMessageId: forwardAnchor,
        limit: HISTORY_MESSAGES_LIMIT
      });

      const page = mapRawMessagesToAsc(data.messages);
      if (page.length === 0) return;
      const pageOldestId = page[0]!.id;
      const droppedOlderFromCurrent = currentVisible.filter((message) => message.id < pageOldestId);

      setMessagesByChatId((prev) => ({
        ...prev,
        [chatId]: page
      }));
      setPagingByChatId((prev) => ({
        ...prev,
        [chatId]: {
          ...(prev[chatId] ?? createDefaultPagingState()),
          beforeBuffer:
            droppedOlderFromCurrent.length > 0
              ? mergeMessagesAsc(
                  (prev[chatId] ?? createDefaultPagingState()).beforeBuffer,
                  droppedOlderFromCurrent
                )
              : (prev[chatId] ?? createDefaultPagingState()).beforeBuffer,
          afterBuffer: [],
          cursor: data.nextCursor,
          hasMore: data.nextCursor !== null,
          currentWindowNewestId:
            data.messages[0]?.id ?? (prev[chatId] ?? createDefaultPagingState()).currentWindowNewestId
        }
      }));
    },
    [mapRawMessagesToAsc]
  );

  const ensureDmChannelForChat = useCallback(
    async (chatId: string): Promise<number | null> => {
      const existing = dmChannelByChatIdRef.current[chatId];
      if (existing) {
        return existing;
      }

      const userId = getDmUserIdFromChatId(chatId, ownUserId);
      if (!userId) {
        return null;
      }

      const result = await getTRPCClient().dms.open.mutate({ userId });
      dmChannelByChatIdRef.current = {
        ...dmChannelByChatIdRef.current,
        [chatId]: result.channelId
      };
      setDmChannelByChatId((prev) => ({
        ...prev,
        [chatId]: result.channelId
      }));

      return result.channelId;
    },
    [ownUserId]
  );

  const resolveChannelIdForChat = useCallback(
    async (chatId: string): Promise<number | null> => {
      if (chatId === MAIN_GROUP_CHAT_ID) {
        return mainGroupChannelId;
      }

      const directGroupChannelId = groupChannelByChatId[chatId] ?? getGroupChannelIdFromChatId(chatId);
      if (directGroupChannelId) {
        return directGroupChannelId;
      }

      return ensureDmChannelForChat(chatId);
    },
    [ensureDmChannelForChat, groupChannelByChatId, mainGroupChannelId]
  );

  const getChatIdByChannelId = useCallback(
    (channelId: number): string | null => {
      if (mainGroupChannelId && channelId === mainGroupChannelId) {
        return MAIN_GROUP_CHAT_ID;
      }

      const matchedGroupChatId =
        Object.entries(groupChannelByChatId).find(([, mappedChannelId]) => mappedChannelId === channelId)?.[0] ??
        null;
      if (matchedGroupChatId) {
        return matchedGroupChatId;
      }

      return (
        Object.entries(dmChannelByChatIdRef.current).find(
          ([, mappedChannelId]) => mappedChannelId === channelId
        )?.[0] ?? null
      );
    },
    [groupChannelByChatId, mainGroupChannelId]
  );

  const refreshDmConversations = useCallback(async () => {
    if (!ownUserId) return;

    const conversations = await getTRPCClient().dms.get.query();
    const nextUnread: Record<string, number> = {};
    const nextChannels: Record<string, number> = {};

    conversations.forEach((conversation) => {
      const chatId =
        conversation.userId === ownUserId ? NOTES_CHAT_ID : `contact-${conversation.userId}`;
      nextUnread[chatId] = conversation.unreadCount ?? 0;
      nextChannels[chatId] = conversation.channelId;
    });

    setDmUnreadByChatId(nextUnread);
    dmChannelByChatIdRef.current = {
      ...dmChannelByChatIdRef.current,
      ...nextChannels
    };
    setDmChannelByChatId((prev) => ({
      ...prev,
      ...nextChannels
    }));

    return {
      conversations,
      nextUnread,
      nextChannels
    };
  }, [ownUserId]);

  useEffect(() => {
    messagesByChatIdRef.current = messagesByChatId;
  }, [messagesByChatId]);

  useEffect(() => {
    pagingByChatIdRef.current = pagingByChatId;
  }, [pagingByChatId]);

  useEffect(() => {
    dmChannelByChatIdRef.current = dmChannelByChatId;
  }, [dmChannelByChatId]);

  useEffect(() => {
    if (!ownUserId) return;

    let cancelled = false;

    const bootstrapDmState = async () => {
      try {
        await refreshDmConversations();
        const notesChannelId = await ensureDmChannelForChat(NOTES_CHAT_ID);
        if (!notesChannelId || cancelled) return;
        await loadCurrentWindowForChat(NOTES_CHAT_ID, notesChannelId);
      } catch {
        // ignore temporary connection/router errors
      }
    };

    void bootstrapDmState();

    return () => {
      cancelled = true;
    };
  }, [ensureDmChannelForChat, loadCurrentWindowForChat, ownUserId, refreshDmConversations]);

  useEffect(() => {
    if (!activeChatId) return;

    let cancelled = false;

    const ensureActiveChatLoaded = async () => {
      try {
        const channelId = await resolveChannelIdForChat(activeChatId);
        if (!channelId || cancelled) return;
        await loadCurrentWindowForChat(activeChatId, channelId);
      } catch {
        // ignore temporary load errors
      }
    };

    void ensureActiveChatLoaded();

    return () => {
      cancelled = true;
    };
  }, [activeChatId, contactsLength, loadCurrentWindowForChat, ownUserId, resolveChannelIdForChat]);

  return {
    dmChannelByChatId,
    messagesByChatId,
    dmUnreadByChatId,
    pagingByChatId,
    setMessagesByChatId,
    setPagingByChatId,
    messagesByChatIdRef,
    pagingByChatIdRef,
    dmChannelByChatIdRef,
    getHasMoreAfter,
    loadCurrentWindowForChat,
    loadOlderWindowForChat,
    loadNewerWindowForChat,
    ensureDmChannelForChat,
    resolveChannelIdForChat,
    getChatIdByChannelId,
    refreshDmConversations
  };
};

export { usePrototypeChatMessages };
