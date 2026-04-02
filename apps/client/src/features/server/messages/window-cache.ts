import type { TJoinedMessage } from '@connectmessager/shared';

type TChannelWindowCache = {
  beforeBuffer: TJoinedMessage[];
  afterBuffer: TJoinedMessage[];
  currentWindowNewestId: number | null;
};

const MAX_BUFFER_SIZE = 300;

const channelWindowCache = new Map<number, TChannelWindowCache>();

const sortMessagesAsc = (messages: TJoinedMessage[]) =>
  [...messages].sort((a, b) => a.id - b.id);

const mergeMessages = (
  existing: TJoinedMessage[],
  incoming: TJoinedMessage[]
): TJoinedMessage[] => {
  if (incoming.length === 0) {
    return existing;
  }

  const mergedById = new Map<number, TJoinedMessage>();

  existing.forEach((message) => {
    mergedById.set(message.id, message);
  });

  incoming.forEach((message) => {
    mergedById.set(message.id, message);
  });

  return sortMessagesAsc([...mergedById.values()]);
};

const clampBuffer = (
  messages: TJoinedMessage[],
  side: 'before' | 'after'
): TJoinedMessage[] => {
  if (messages.length <= MAX_BUFFER_SIZE) {
    return messages;
  }

  return side === 'before'
    ? messages.slice(messages.length - MAX_BUFFER_SIZE)
    : messages.slice(0, MAX_BUFFER_SIZE);
};

const getOrCreateChannelWindowCache = (
  channelId: number
): TChannelWindowCache => {
  const existing = channelWindowCache.get(channelId);

  if (existing) {
    return existing;
  }

  const next: TChannelWindowCache = {
    beforeBuffer: [],
    afterBuffer: [],
    currentWindowNewestId: null
  };

  channelWindowCache.set(channelId, next);

  return next;
};

export const resetChannelWindowCache = (channelId: number) => {
  channelWindowCache.set(channelId, {
    beforeBuffer: [],
    afterBuffer: [],
    currentWindowNewestId: null
  });
};

export const getChannelWindowCache = (channelId: number) =>
  getOrCreateChannelWindowCache(channelId);

export const setChannelWindowNewestId = (
  channelId: number,
  newestId: number | null
) => {
  const cache = getOrCreateChannelWindowCache(channelId);

  cache.currentWindowNewestId =
    newestId === null
      ? cache.currentWindowNewestId
      : Math.max(cache.currentWindowNewestId ?? 0, newestId);
};

export const pushMessagesToBeforeBuffer = (
  channelId: number,
  messages: TJoinedMessage[]
) => {
  if (messages.length === 0) {
    return;
  }

  const cache = getOrCreateChannelWindowCache(channelId);
  cache.beforeBuffer = clampBuffer(
    mergeMessages(cache.beforeBuffer, messages),
    'before'
  );
};

export const pushMessagesToAfterBuffer = (
  channelId: number,
  messages: TJoinedMessage[]
) => {
  if (messages.length === 0) {
    return;
  }

  const cache = getOrCreateChannelWindowCache(channelId);
  cache.afterBuffer = clampBuffer(
    mergeMessages(cache.afterBuffer, messages),
    'after'
  );
};

export const takeMessagesFromBeforeBuffer = (
  channelId: number,
  limit: number
) => {
  const cache = getOrCreateChannelWindowCache(channelId);

  if (limit <= 0 || cache.beforeBuffer.length === 0) {
    return [];
  }

  const startIndex = Math.max(cache.beforeBuffer.length - limit, 0);
  const chunk = cache.beforeBuffer.slice(startIndex);

  cache.beforeBuffer = cache.beforeBuffer.slice(0, startIndex);

  return chunk;
};

export const takeMessagesFromAfterBuffer = (
  channelId: number,
  limit: number
) => {
  const cache = getOrCreateChannelWindowCache(channelId);

  if (limit <= 0 || cache.afterBuffer.length === 0) {
    return [];
  }

  const chunk = cache.afterBuffer.slice(0, limit);
  cache.afterBuffer = cache.afterBuffer.slice(chunk.length);

  return chunk;
};

export const takeAllMessagesFromAfterBuffer = (channelId: number) => {
  const cache = getOrCreateChannelWindowCache(channelId);
  const chunk = cache.afterBuffer;

  cache.afterBuffer = [];

  return chunk;
};

export const replaceCachedMessage = (
  channelId: number,
  message: TJoinedMessage
) => {
  const cache = getOrCreateChannelWindowCache(channelId);

  cache.beforeBuffer = cache.beforeBuffer.map((current) =>
    current.id === message.id ? message : current
  );
  cache.afterBuffer = cache.afterBuffer.map((current) =>
    current.id === message.id ? message : current
  );
};

export const removeCachedMessage = (channelId: number, messageId: number) => {
  const cache = getOrCreateChannelWindowCache(channelId);

  cache.beforeBuffer = cache.beforeBuffer.filter(
    (message) => message.id !== messageId
  );
  cache.afterBuffer = cache.afterBuffer.filter(
    (message) => message.id !== messageId
  );
};

export const clearAfterBuffer = (channelId: number) => {
  const cache = getOrCreateChannelWindowCache(channelId);
  cache.afterBuffer = [];
};

