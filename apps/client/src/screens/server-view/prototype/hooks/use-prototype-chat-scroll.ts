import { getTRPCClient } from '@/lib/trpc';
import type { TFile } from '@connectmessager/shared';
import { CURRENT_MESSAGES_LIMIT, SCROLL_BOTTOM_THRESHOLD_PX, SCROLL_TOP_LOAD_THRESHOLD_PX } from '../constants';
import type { TChatPagingState, TMessage } from '../types';
import { createDefaultPagingState, getTopVisibleAnchor, mergeMessagesAsc } from '../utils';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type TRawMessage = {
  id: number;
  userId: number;
  content: string | null;
  createdAt: number;
  files?: TFile[];
  pinned?: boolean | null;
  pinnedAt?: number | null;
  pinnedBy?: number | null;
};

type TUsePrototypeChatScrollParams = {
  activeChatId: string | null;
  ownUserId?: number;
  visibleMessagesLength: number;
  messagesByChatId: Record<string, TMessage[]>;
  setMessagesByChatId: Dispatch<SetStateAction<Record<string, TMessage[]>>>;
  messagesByChatIdRef: MutableRefObject<Record<string, TMessage[]>>;
  setPagingByChatId: Dispatch<SetStateAction<Record<string, TChatPagingState>>>;
  pagingByChatIdRef: MutableRefObject<Record<string, TChatPagingState>>;
  unreadMessageIdsByChatIdRef: MutableRefObject<Record<string, number[]>>;
  serverUnreadByChatId: Record<string, number>;
  serverUnreadDismissedByChatId: Record<string, boolean>;
  setServerUnreadDismissedByChatId: Dispatch<SetStateAction<Record<string, boolean>>>;
  addUnreadMessageIds: (chatId: string, messageIds: number[]) => void;
  removeUnreadMessageIds: (chatId: string, messageIds: number[]) => void;
  isMessageContextMenuOpen: boolean;
  closeMessageContextMenu: () => void;
  loadCurrentWindowForChat: (chatId: string, channelId: number) => Promise<void>;
  loadOlderWindowForChat: (chatId: string, channelId: number) => Promise<void>;
  loadNewerWindowForChat: (chatId: string, channelId: number) => Promise<void>;
  getHasMoreAfter: (chatId: string) => boolean;
  getLoadedChannelIdForChat: (chatId: string) => number | null;
  resolveChannelIdForChat: (chatId: string) => Promise<number | null>;
  mapRawMessagesToAsc: (rawMessages: TRawMessage[]) => TMessage[];
};

const usePrototypeChatScroll = ({
  activeChatId,
  ownUserId,
  visibleMessagesLength,
  messagesByChatId,
  setMessagesByChatId,
  messagesByChatIdRef,
  setPagingByChatId,
  pagingByChatIdRef,
  unreadMessageIdsByChatIdRef,
  serverUnreadByChatId,
  serverUnreadDismissedByChatId,
  setServerUnreadDismissedByChatId,
  addUnreadMessageIds,
  removeUnreadMessageIds,
  isMessageContextMenuOpen,
  closeMessageContextMenu,
  loadCurrentWindowForChat,
  loadOlderWindowForChat,
  loadNewerWindowForChat,
  getHasMoreAfter,
  getLoadedChannelIdForChat,
  resolveChannelIdForChat,
  mapRawMessagesToAsc
}: TUsePrototypeChatScrollParams) => {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [jumpHighlightedMessageId, setJumpHighlightedMessageId] = useState<number | null>(null);
  const chatBodyRef = useRef<HTMLElement | null>(null);
  const loadingOlderByChatIdRef = useRef<Record<string, boolean>>({});
  const loadingNewerByChatIdRef = useRef<Record<string, boolean>>({});
  const previousScrollTopRef = useRef(0);
  const topLoadLockedRef = useRef(false);
  const bottomLoadLockedRef = useRef(false);
  const pendingEntryScrollChatIdRef = useRef<string | null>(activeChatId);
  const pendingOwnSendScrollChatIdRef = useRef<string | null>(null);
  const jumpHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const consumeVisibleUnreadForChat = useCallback(
    (chatId: string | null | undefined) => {
      if (!chatId) return;

      const unreadIds = unreadMessageIdsByChatIdRef.current[chatId] ?? [];
      if (unreadIds.length === 0) return;

      const container = chatBodyRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const visibleUnreadIds = unreadIds.filter((messageId) => {
        const target = container.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
        if (!target) return false;

        const targetRect = target.getBoundingClientRect();
        return (
          targetRect.bottom > containerRect.top + 8 &&
          targetRect.top < containerRect.bottom - 8
        );
      });

      if (visibleUnreadIds.length === 0) return;
      removeUnreadMessageIds(chatId, visibleUnreadIds);
    },
    [removeUnreadMessageIds, unreadMessageIdsByChatIdRef]
  );

  const scrollChatToBottom = useCallback(() => {
    const container = chatBodyRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    setShowScrollToBottom(false);
  }, []);

  const scheduleScrollToBottom = useCallback(
    (delay = 0) => {
      setTimeout(() => {
        scrollChatToBottom();
      }, delay);
    },
    [scrollChatToBottom]
  );

  const scheduleOwnSendScroll = useCallback(
    (chatId: string) => {
      pendingOwnSendScrollChatIdRef.current = chatId;
      [0, 60, 180, 420, 900].forEach((delay) => {
        scheduleScrollToBottom(delay);
      });
    },
    [scheduleScrollToBottom]
  );

  const scrollChatToMessage = useCallback(
    (messageId: number | string) => {
      const container = chatBodyRef.current;
      if (!container) return;

      const targetMessage = container.querySelector(
        `[data-message-id="${messageId}"]`
      ) as HTMLElement | null;
      if (!targetMessage) {
        scrollChatToBottom();
        return;
      }

      targetMessage.scrollIntoView({ block: 'start' });
    },
    [scrollChatToBottom]
  );

  const highlightJumpedMessage = useCallback((messageId: number) => {
    setJumpHighlightedMessageId(messageId);
    if (jumpHighlightTimeoutRef.current) {
      clearTimeout(jumpHighlightTimeoutRef.current);
    }
    jumpHighlightTimeoutRef.current = setTimeout(() => {
      setJumpHighlightedMessageId((prev) => (prev === messageId ? null : prev));
    }, 2400);
  }, []);

  const updateScrollToBottomVisibility = useCallback(() => {
    const container = chatBodyRef.current;
    if (!container) {
      setShowScrollToBottom(false);
      return;
    }

    const distanceToBottom = container.scrollHeight - container.clientHeight - container.scrollTop;
    setShowScrollToBottom(distanceToBottom > SCROLL_BOTTOM_THRESHOLD_PX);
  }, []);

  const loadOlderForActiveChat = useCallback(async () => {
    const chatId = activeChatId;
    if (!chatId) return;

    const channelId = getLoadedChannelIdForChat(chatId);
    if (!channelId) return;

    const paging = pagingByChatIdRef.current[chatId] ?? createDefaultPagingState();
    if (!paging.hasMore && paging.beforeBuffer.length === 0) return;
    if (loadingOlderByChatIdRef.current[chatId]) return;

    const container = chatBodyRef.current;
    if (!container) return;

    loadingOlderByChatIdRef.current[chatId] = true;
    const topAnchor = getTopVisibleAnchor(container);

    try {
      await loadOlderWindowForChat(chatId, channelId);
    } catch {
      // ignore temporary load errors
    } finally {
      setTimeout(() => {
        const latestContainer = chatBodyRef.current;
        if (latestContainer && topAnchor?.messageId) {
          const target = latestContainer.querySelector<HTMLElement>(
            `[data-message-id="${topAnchor.messageId}"]`
          );
          if (target) {
            const containerRect = latestContainer.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const delta = targetRect.top - containerRect.top - topAnchor.offsetTop;
            latestContainer.scrollTop += delta;
          }
        }

        loadingOlderByChatIdRef.current[chatId] = false;
        updateScrollToBottomVisibility();
      }, 0);
    }
  }, [activeChatId, getLoadedChannelIdForChat, loadOlderWindowForChat, pagingByChatIdRef, updateScrollToBottomVisibility]);

  const loadNewerForActiveChat = useCallback(async () => {
    const chatId = activeChatId;
    if (!chatId) return;

    const channelId = getLoadedChannelIdForChat(chatId);
    if (!channelId) return;
    if (loadingNewerByChatIdRef.current[chatId]) return;
    if (!getHasMoreAfter(chatId)) return;

    const container = chatBodyRef.current;
    if (!container) return;

    loadingNewerByChatIdRef.current[chatId] = true;
    const topAnchor = getTopVisibleAnchor(container);

    try {
      await loadNewerWindowForChat(chatId, channelId);
    } catch {
      // ignore temporary load errors
    } finally {
      setTimeout(() => {
        const latestContainer = chatBodyRef.current;
        if (latestContainer && topAnchor?.messageId) {
          const target = latestContainer.querySelector<HTMLElement>(
            `[data-message-id="${topAnchor.messageId}"]`
          );
          if (target) {
            const containerRect = latestContainer.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const delta = targetRect.top - containerRect.top - topAnchor.offsetTop;
            latestContainer.scrollTop += delta;
          }
        }

        loadingNewerByChatIdRef.current[chatId] = false;
        updateScrollToBottomVisibility();
      }, 0);
    }
  }, [activeChatId, getHasMoreAfter, getLoadedChannelIdForChat, loadNewerWindowForChat, updateScrollToBottomVisibility]);

  const handleChatScroll = useCallback(() => {
    if (isMessageContextMenuOpen) {
      closeMessageContextMenu();
    }
    updateScrollToBottomVisibility();

    const container = chatBodyRef.current;
    if (!container) return;

    const currentScrollTop = container.scrollTop;
    const isScrollingDown = currentScrollTop > previousScrollTopRef.current;
    previousScrollTopRef.current = currentScrollTop;

    if (container.scrollTop > SCROLL_TOP_LOAD_THRESHOLD_PX * 2) {
      topLoadLockedRef.current = false;
    }

    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    if (distanceFromBottom > SCROLL_TOP_LOAD_THRESHOLD_PX * 2) {
      bottomLoadLockedRef.current = false;
    }

    if (container.scrollTop <= SCROLL_TOP_LOAD_THRESHOLD_PX && !topLoadLockedRef.current) {
      topLoadLockedRef.current = true;
      void loadOlderForActiveChat().finally(() => {
        topLoadLockedRef.current = false;
      });
    }

    const chatId = activeChatId;
    consumeVisibleUnreadForChat(chatId);
    if (
      chatId &&
      getHasMoreAfter(chatId) &&
      isScrollingDown &&
      distanceFromBottom <= SCROLL_TOP_LOAD_THRESHOLD_PX &&
      !bottomLoadLockedRef.current
    ) {
      bottomLoadLockedRef.current = true;
      void loadNewerForActiveChat().finally(() => {
        bottomLoadLockedRef.current = false;
      });
    }
  }, [
    activeChatId,
    closeMessageContextMenu,
    consumeVisibleUnreadForChat,
    getHasMoreAfter,
    isMessageContextMenuOpen,
    loadNewerForActiveChat,
    loadOlderForActiveChat,
    updateScrollToBottomVisibility
  ]);

  const handleScrollToBottomClick = useCallback(async () => {
    const chatId = activeChatId;
    if (!chatId) return;

    const channelId = await resolveChannelIdForChat(chatId);
    if (!channelId) {
      scrollChatToBottom();
      return;
    }

    if (getHasMoreAfter(chatId)) {
      try {
        await loadCurrentWindowForChat(chatId, channelId);
      } catch {
        // ignore temporary load errors
      } finally {
        scheduleScrollToBottom(0);
      }
      return;
    }

    scrollChatToBottom();
    consumeVisibleUnreadForChat(chatId);
  }, [
    activeChatId,
    consumeVisibleUnreadForChat,
    getHasMoreAfter,
    loadCurrentWindowForChat,
    resolveChannelIdForChat,
    scheduleScrollToBottom,
    scrollChatToBottom
  ]);

  const openPinnedMessageInChat = useCallback(
    async (messageId: number, closePinnedPopover?: () => void) => {
      const chatId = activeChatId;
      if (!chatId) return;

      closePinnedPopover?.();
      const channelId = await resolveChannelIdForChat(chatId);
      if (!channelId) return;

      const container = chatBodyRef.current;
      const existingNode = container?.querySelector(
        `[data-message-id="${messageId}"]`
      ) as HTMLElement | null;
      if (existingNode) {
        existingNode.scrollIntoView({ block: 'start' });
        highlightJumpedMessage(messageId);
        return;
      }

      try {
        const data = await getTRPCClient().messages.get.query({
          channelId,
          cursor: null,
          targetMessageId: messageId,
          limit: CURRENT_MESSAGES_LIMIT
        });
        const mapped = mapRawMessagesToAsc(data.messages);
        const mappedOldestId = mapped[0]?.id ?? null;
        const mappedNewestId = mapped[mapped.length - 1]?.id ?? null;
        const previousVisible = messagesByChatIdRef.current[chatId] || [];
        const bufferedNewer =
          mappedNewestId === null
            ? []
            : previousVisible.filter((message) => message.id > mappedNewestId);
        const bufferedOlder =
          mappedOldestId === null
            ? []
            : previousVisible.filter((message) => message.id < mappedOldestId);

        setMessagesByChatId((prev) => ({
          ...prev,
          [chatId]: mapped
        }));
        setPagingByChatId((prev) => ({
          ...prev,
          [chatId]: {
            ...(prev[chatId] ?? createDefaultPagingState()),
            cursor: data.nextCursor,
            hasMore: data.nextCursor !== null,
            beforeBuffer:
              bufferedOlder.length > 0
                ? mergeMessagesAsc(
                    (prev[chatId] ?? createDefaultPagingState()).beforeBuffer,
                    bufferedOlder
                  )
                : (prev[chatId] ?? createDefaultPagingState()).beforeBuffer,
            afterBuffer:
              bufferedNewer.length > 0
                ? mergeMessagesAsc(
                    (prev[chatId] ?? createDefaultPagingState()).afterBuffer,
                    bufferedNewer
                  )
                : (prev[chatId] ?? createDefaultPagingState()).afterBuffer,
            currentWindowNewestId:
              (prev[chatId] ?? createDefaultPagingState()).currentWindowNewestId ??
              data.messages[0]?.id ??
              null
          }
        }));

        setTimeout(() => {
          scrollChatToMessage(messageId);
          highlightJumpedMessage(messageId);
        }, 30);
      } catch {
        toast.error('Не удалось перейти к закрепленному сообщению.');
      }
    },
    [
      activeChatId,
      highlightJumpedMessage,
      mapRawMessagesToAsc,
      messagesByChatIdRef,
      resolveChannelIdForChat,
      scrollChatToMessage,
      setMessagesByChatId,
      setPagingByChatId
    ]
  );

  useEffect(() => {
    pendingEntryScrollChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    if (!activeChatId) return;
    const activeMessages = messagesByChatId[activeChatId];
    if (!activeMessages || activeMessages.length === 0) return;

    const localUnreadCount = unreadMessageIdsByChatIdRef.current[activeChatId]?.length ?? 0;
    if (localUnreadCount > 0) return;

    const serverUnreadCount = serverUnreadDismissedByChatId[activeChatId]
      ? 0
      : (serverUnreadByChatId[activeChatId] ?? 0);
    if (serverUnreadCount <= 0) return;

    const unreadIds = activeMessages
      .filter((message) => message.userId !== ownUserId)
      .slice(-serverUnreadCount)
      .map((message) => message.id);

    if (unreadIds.length === 0) return;

    addUnreadMessageIds(activeChatId, unreadIds);
    setServerUnreadDismissedByChatId((prev) => ({
      ...prev,
      [activeChatId]: true
    }));
  }, [
    activeChatId,
    addUnreadMessageIds,
    messagesByChatId,
    ownUserId,
    serverUnreadByChatId,
    serverUnreadDismissedByChatId,
    setServerUnreadDismissedByChatId,
    unreadMessageIdsByChatIdRef
  ]);

  useEffect(() => {
    if (!activeChatId) return;
    const activeMessages = messagesByChatId[activeChatId];
    if (!activeMessages) return;

    const shouldScrollAfterOwnSend = pendingOwnSendScrollChatIdRef.current === activeChatId;
    if (shouldScrollAfterOwnSend) {
      pendingOwnSendScrollChatIdRef.current = null;
      scheduleScrollToBottom(0);
      return;
    }

    const shouldApplyEntryScroll = pendingEntryScrollChatIdRef.current === activeChatId;
    if (!shouldApplyEntryScroll) return;

    pendingEntryScrollChatIdRef.current = null;
    const unreadIds = unreadMessageIdsByChatIdRef.current[activeChatId] ?? [];
    if (unreadIds.length === 0 || activeMessages.length === 0) {
      scheduleScrollToBottom(0);
      return;
    }

    const firstUnreadId = unreadIds[0];
    const firstUnreadMessage = firstUnreadId
      ? activeMessages.find((message) => message.id === firstUnreadId)
      : null;
    if (!firstUnreadMessage) {
      scheduleScrollToBottom(0);
      return;
    }

    setTimeout(() => {
      scrollChatToMessage(firstUnreadMessage.id);
      setTimeout(() => {
        consumeVisibleUnreadForChat(activeChatId);
      }, 30);
    }, 0);
  }, [
    activeChatId,
    consumeVisibleUnreadForChat,
    messagesByChatId,
    scheduleScrollToBottom,
    scrollChatToMessage,
    unreadMessageIdsByChatIdRef
  ]);

  useEffect(() => {
    setTimeout(() => {
      updateScrollToBottomVisibility();
    }, 0);
  }, [activeChatId, updateScrollToBottomVisibility, visibleMessagesLength]);

  useEffect(() => {
    setTimeout(() => {
      consumeVisibleUnreadForChat(activeChatId);
    }, 0);
  }, [activeChatId, consumeVisibleUnreadForChat, visibleMessagesLength]);

  useEffect(() => {
    previousScrollTopRef.current = 0;
    topLoadLockedRef.current = false;
    bottomLoadLockedRef.current = false;
  }, [activeChatId]);

  useEffect(() => {
    return () => {
      if (jumpHighlightTimeoutRef.current) {
        clearTimeout(jumpHighlightTimeoutRef.current);
      }
    };
  }, []);

  return {
    chatBodyRef,
    showScrollToBottom,
    jumpHighlightedMessageId,
    consumeVisibleUnreadForChat,
    scheduleScrollToBottom,
    scheduleOwnSendScroll,
    openPinnedMessageInChat,
    handleChatScroll,
    handleScrollToBottomClick
  };
};

export { usePrototypeChatScroll };
