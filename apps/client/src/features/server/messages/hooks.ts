import type { IRootState } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import { DEFAULT_MESSAGES_LIMIT, type TJoinedMessage } from '@connectmessager/shared';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useSelector } from 'react-redux';
import {
  addThreadMessages,
  clearMessages,
  clearThreadMessages,
  setMessages
} from './actions';
import {
  findMessageElement,
  highlightMessageElement,
  waitForMessageElement
} from './helpers';
import {
  messagesByChannelIdSelector,
  parentMessageByIdSelector,
  threadMessagesByParentIdSelector
} from './selectors';
import {
  clearAfterBuffer,
  getChannelWindowCache,
  pushMessagesToAfterBuffer,
  pushMessagesToBeforeBuffer,
  resetChannelWindowCache,
  setChannelWindowNewestId,
  takeMessagesFromAfterBuffer,
  takeMessagesFromBeforeBuffer
} from './window-cache';

export const useMessagesByChannelId = (channelId: number) =>
  useSelector((state: IRootState) =>
    messagesByChannelIdSelector(state, channelId)
  );

const useGroupedMessages = (messages: TJoinedMessage[]) =>
  useMemo(() => {
    const grouped = messages.reduce((acc, message) => {
      const last = acc[acc.length - 1];

      if (!last) return [[message]];

      const lastMessage = last[last.length - 1];

      if (lastMessage.userId === message.userId) {
        const lastDate = lastMessage.createdAt;
        const currentDate = message.createdAt;
        const timeDifference = Math.abs(currentDate - lastDate) / 1000 / 60;

        if (timeDifference < 1) {
          last.push(message);
          return acc;
        }
      }

      return [...acc, [message]];
    }, [] as TJoinedMessage[][]);

    return grouped;
  }, [messages]);

type TFetchPage = (
  cursor: number | null
) => Promise<{ nextCursor: number | null }>;

// fetch a page of channel messages from the server
const fetchChannelMessagesPage = async (input: {
  channelId: number;
  cursor: number | null;
  limit: number;
  targetMessageId?: number;
}) => {
  const trpcClient = getTRPCClient();

  return trpcClient.messages.get.query(input);
};

const mergeMessagesAsc = (
  current: TJoinedMessage[],
  incoming: TJoinedMessage[]
) => {
  const byId = new Map<number, TJoinedMessage>();

  current.forEach((message) => {
    byId.set(message.id, message);
  });

  incoming.forEach((message) => {
    byId.set(message.id, message);
  });

  return [...byId.values()].sort((a, b) => a.id - b.id);
};

const usePaginatedMessages = (
  messages: TJoinedMessage[],
  fetchPage: TFetchPage,
  options?: { initialLoading?: boolean }
) => {
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(
    options?.initialLoading ?? messages.length === 0
  );
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchMessages = useCallback(
    async (cursorToFetch: number | null) => {
      setFetching(true);

      try {
        const { nextCursor } = await fetchPage(cursorToFetch);

        setCursor(nextCursor);
        setHasMore(nextCursor !== null);
      } finally {
        setFetching(false);
        setLoading(false);
      }
    },
    [fetchPage]
  );

  const loadMore = useCallback(async () => {
    if (fetching || !hasMore) return;

    await fetchMessages(cursor);
  }, [fetching, hasMore, cursor, fetchMessages]);

  const isEmpty = useMemo(
    () => !messages.length && !fetching,
    [messages.length, fetching]
  );

  const groupedMessages = useGroupedMessages(messages);

  const reset = useCallback(() => {
    setCursor(null);
    setHasMore(true);
    setLoading(true);
  }, []);

  return {
    fetching,
    loading,
    hasMore,
    messages,
    loadMore,
    cursor,
    groupedMessages,
    isEmpty,
    fetchMessages,
    reset
  };
};

export const useMessages = (channelId: number) => {
  const messages = useMessagesByChannelId(channelId);
  const loadingMoreRef = useRef(false);
  const previousMessagesRef = useRef<TJoinedMessage[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const CURRENT_MESSAGES_LIMIT = 50;
  const HISTORY_MESSAGES_LIMIT = 50;
  const MAX_VISIBLE_MESSAGES = 100;

  const groupedMessages = useGroupedMessages(messages);

  const applyVisibleMessages = useCallback(
    (nextMessages: TJoinedMessage[]) => {
      setMessages(channelId, nextMessages);
      previousMessagesRef.current = nextMessages;
    },
    [channelId]
  );

  const keepLatestMessages = useCallback(
    (nextMessages: TJoinedMessage[], keepLatest: number) => {
      if (nextMessages.length <= keepLatest) {
        return nextMessages;
      }

      const overflow = nextMessages.slice(0, nextMessages.length - keepLatest);
      pushMessagesToBeforeBuffer(channelId, overflow);

      return nextMessages.slice(-keepLatest);
    },
    [channelId]
  );

  const keepOldestMessages = useCallback(
    (nextMessages: TJoinedMessage[], keepOldest: number) => {
      if (nextMessages.length <= keepOldest) {
        return nextMessages;
      }

      const overflow = nextMessages.slice(keepOldest);
      pushMessagesToAfterBuffer(channelId, overflow);

      return nextMessages.slice(0, keepOldest);
    },
    [channelId]
  );

  const getHasMoreAfter = useCallback(
    (targetMessages: TJoinedMessage[]) => {
      if (targetMessages.length === 0) {
        return getChannelWindowCache(channelId).afterBuffer.length > 0;
      }

      const cache = getChannelWindowCache(channelId);
      const visibleNewestId = targetMessages[targetMessages.length - 1]?.id ?? null;

      if (visibleNewestId === null) {
        return cache.afterBuffer.length > 0;
      }

      return (
        cache.afterBuffer.length > 0 ||
        (cache.currentWindowNewestId !== null &&
          visibleNewestId < cache.currentWindowNewestId)
      );
    },
    [channelId]
  );

  const fetchWindow = useCallback(
    async ({
      cursorToFetch,
      limit,
      targetMessageId
    }: {
      cursorToFetch: number | null;
      limit: number;
      targetMessageId?: number;
    }) => {
      const { messages: rawPage, nextCursor } = await fetchChannelMessagesPage({
        channelId,
        cursor: cursorToFetch,
        limit,
        targetMessageId
      });

      const pageAsc = [...rawPage].reverse();

      if (rawPage.length > 0 && !targetMessageId) {
        setChannelWindowNewestId(channelId, rawPage[0]!.id);
      }

      setCursor(nextCursor);
      setHasMore(nextCursor !== null);

      return { nextCursor, page: pageAsc };
    },
    [channelId]
  );

  const loadCurrentWindow = useCallback(async () => {
    resetChannelWindowCache(channelId);
    clearMessages(channelId);
    setCursor(null);
    setHasMore(true);
    clearAfterBuffer(channelId);

    const { page } = await fetchWindow({
      cursorToFetch: null,
      limit: CURRENT_MESSAGES_LIMIT
    });

    applyVisibleMessages(page);
  }, [applyVisibleMessages, channelId, fetchWindow, CURRENT_MESSAGES_LIMIT]);

  const jumpToPresent = useCallback(async () => {
    if (!getHasMoreAfter(messages)) {
      return;
    }

    setFetching(true);

    try {
      await loadCurrentWindow();
    } finally {
      setFetching(false);
      setLoading(false);
    }
  }, [
    getHasMoreAfter,
    loadCurrentWindow,
    messages,
  ]);

  const loadNewer = useCallback(async () => {
    if (fetching || loadingMoreRef.current || !getHasMoreAfter(messages)) {
      return;
    }

    const cache = getChannelWindowCache(channelId);
    const bufferedNextMessages = takeMessagesFromAfterBuffer(
      channelId,
      HISTORY_MESSAGES_LIMIT
    );

    if (bufferedNextMessages.length > 0) {
      let nextVisible = mergeMessagesAsc(messages, bufferedNextMessages);
      nextVisible = keepLatestMessages(nextVisible, MAX_VISIBLE_MESSAGES);
      applyVisibleMessages(nextVisible);
      return;
    }

    const middleLoaded = messages[Math.floor(messages.length / 2)]?.id;
    const newestLoaded = messages[messages.length - 1]?.id;
    const currentNewest = cache.currentWindowNewestId;

    if (!middleLoaded || !newestLoaded || !currentNewest) {
      return;
    }

    if (newestLoaded >= currentNewest) {
      return;
    }

    const forwardAnchor = Math.min(middleLoaded + 25, currentNewest);

    if (forwardAnchor <= middleLoaded) {
      return;
    }

    loadingMoreRef.current = true;
    setFetching(true);

    try {
      const { page } = await fetchWindow({
        cursorToFetch: null,
        limit: HISTORY_MESSAGES_LIMIT,
        targetMessageId: forwardAnchor
      });

      applyVisibleMessages(page);

      const middleMessage = page[Math.floor(page.length / 2)];

      if (middleMessage) {
        const element = await waitForMessageElement(middleMessage.id);

        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }
    } finally {
      loadingMoreRef.current = false;
      setFetching(false);
      setLoading(false);
    }
  }, [
    applyVisibleMessages,
    channelId,
    fetchWindow,
    fetching,
    getHasMoreAfter,
    keepLatestMessages,
    messages,
    HISTORY_MESSAGES_LIMIT,
    MAX_VISIBLE_MESSAGES
  ]);

  const loadMore = useCallback(async () => {
    if (fetching || loadingMoreRef.current) {
      return;
    }

    const bufferedOlderMessages = takeMessagesFromBeforeBuffer(
      channelId,
      HISTORY_MESSAGES_LIMIT
    );

    if (bufferedOlderMessages.length > 0) {
      let nextVisible = mergeMessagesAsc(bufferedOlderMessages, messages);
      nextVisible = keepOldestMessages(nextVisible, MAX_VISIBLE_MESSAGES);
      applyVisibleMessages(nextVisible);

      return;
    }

    if (!hasMore) {
      return;
    }

    loadingMoreRef.current = true;
    setFetching(true);

    try {
      const { page } = await fetchWindow({
        cursorToFetch: cursor,
        limit: HISTORY_MESSAGES_LIMIT
      });

      if (page.length === 0) {
        return;
      }

      let nextVisible = mergeMessagesAsc(page, messages);
      nextVisible = keepOldestMessages(nextVisible, MAX_VISIBLE_MESSAGES);
      applyVisibleMessages(nextVisible);
    } finally {
      loadingMoreRef.current = false;
      setFetching(false);
      setLoading(false);
    }
  }, [
    fetchWindow,
    fetching,
    hasMore,
    messages,
    channelId,
    cursor,
    applyVisibleMessages,
    keepOldestMessages,
    MAX_VISIBLE_MESSAGES,
    HISTORY_MESSAGES_LIMIT
  ]);

  useEffect(() => {
    let cancelled = false;

    resetChannelWindowCache(channelId);
    previousMessagesRef.current = [];
    clearMessages(channelId);
    setCursor(null);
    setHasMore(true);
    setFetching(true);
    setLoading(true);

    fetchWindow({
      cursorToFetch: null,
      limit: CURRENT_MESSAGES_LIMIT
    })
      .then(({ page }) => {
        if (cancelled) {
          return;
        }

        applyVisibleMessages(page);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setFetching(false);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyVisibleMessages, channelId, fetchWindow, CURRENT_MESSAGES_LIMIT]);

  useLayoutEffect(() => {
    if (messages.length === 0) {
      previousMessagesRef.current = messages;
      return;
    }

    const previousMessages = previousMessagesRef.current;
    const previousHadMoreAfter = getHasMoreAfter(previousMessages);

    setChannelWindowNewestId(channelId, messages[messages.length - 1]!.id);

    if (!getHasMoreAfter(messages) && messages.length > MAX_VISIBLE_MESSAGES) {
      const nextVisible = keepLatestMessages(messages, MAX_VISIBLE_MESSAGES);

      if (nextVisible.length !== messages.length) {
        applyVisibleMessages(nextVisible);
        return;
      }
    }

    if (previousHadMoreAfter && previousMessages.length > 0) {
      const previousIds = new Set(previousMessages.map((message) => message.id));
      const newestPreviousId =
        previousMessages[previousMessages.length - 1]?.id ?? 0;
      const unexpectedNewerMessages = messages.filter(
        (message) =>
          !previousIds.has(message.id) && message.id > newestPreviousId
      );

      if (unexpectedNewerMessages.length > 0) {
        pushMessagesToAfterBuffer(channelId, unexpectedNewerMessages);

        const newerIds = new Set(
          unexpectedNewerMessages.map((message) => message.id)
        );
        const nextVisible = messages.filter((message) => !newerIds.has(message.id));

        applyVisibleMessages(nextVisible);
        return;
      }
    }

    previousMessagesRef.current = messages;
  }, [
    applyVisibleMessages,
    channelId,
    getHasMoreAfter,
    keepLatestMessages,
    messages,
    MAX_VISIBLE_MESSAGES
  ]);

  const scrollToMessage = useCallback(
    async (messageId: number, highlightTime = 4000) => {
      // check if the message is already rendered in the messages container
      const existing = findMessageElement(messageId);

      if (existing) {
        highlightMessageElement(existing, highlightTime);

        return;
      }

      setFetching(true);

      try {
        const currentNewestId =
          getChannelWindowCache(channelId).currentWindowNewestId ??
          messages[messages.length - 1]?.id ??
          null;

        resetChannelWindowCache(channelId);
        setChannelWindowNewestId(channelId, currentNewestId);
        setCursor(null);
        setHasMore(true);

        const { page } = await fetchWindow({
          cursorToFetch: null,
          limit: HISTORY_MESSAGES_LIMIT,
          targetMessageId: messageId
        });

        applyVisibleMessages(page);
      } finally {
        setFetching(false);
        setLoading(false);
      }

      const element = await waitForMessageElement(messageId);

      if (element) {
        highlightMessageElement(element, highlightTime);
      }
    },
    [applyVisibleMessages, channelId, fetchWindow, messages, HISTORY_MESSAGES_LIMIT]
  );

  const hasMoreAfter = getHasMoreAfter(messages);
  const bufferedHasMore = getChannelWindowCache(channelId).beforeBuffer.length > 0;
  const canJumpToPresent = hasMoreAfter || messages.length > CURRENT_MESSAGES_LIMIT;

  return {
    messages,
    groupedMessages,
    fetching,
    loading,
    hasMore: hasMore || bufferedHasMore,
    hasMoreAfter,
    canJumpToPresent,
    cursor,
    loadMore,
    loadNewer,
    jumpToPresent,
    scrollToMessage,
  };
};

export const useThreadMessagesByParentId = (parentMessageId: number) =>
  useSelector((state: IRootState) =>
    threadMessagesByParentIdSelector(state, parentMessageId)
  );

export const useThreadMessages = (parentMessageId: number) => {
  const messages = useThreadMessagesByParentId(parentMessageId);

  const fetchPage = useCallback(
    async (cursorToFetch: number | null) => {
      const trpcClient = getTRPCClient();

      const { messages: page, nextCursor } =
        await trpcClient.messages.getThread.query({
          parentMessageId,
          cursor: cursorToFetch,
          limit: DEFAULT_MESSAGES_LIMIT
        });

      addThreadMessages(parentMessageId, page);

      return { nextCursor };
    },
    [parentMessageId]
  );

  const paginated = usePaginatedMessages(messages, fetchPage, {
    initialLoading: true
  });

  // fetch fresh data every time the thread is opened
  useEffect(() => {
    clearThreadMessages(parentMessageId);
    paginated.reset();
    paginated.fetchMessages(null);
  }, [parentMessageId]); // eslint-disable-line react-hooks/exhaustive-deps

  return paginated;
};

export const useParentMessage = (
  messageId: number | undefined,
  channelId: number | undefined
) =>
  useSelector((state: IRootState) =>
    messageId && channelId
      ? parentMessageByIdSelector(state, messageId, channelId)
      : undefined
  );


