import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAIN_GROUP_CHAT_ID } from '../constants';
import { mergeMessageIdsAsc } from '../utils';

type TUsePrototypeUnreadParams = {
  readStatesMap: Record<number, number | undefined>;
  dmChannelByChatId: Record<string, number>;
  groupChannelByChatId: Record<string, number>;
  dmUnreadByChatId: Record<string, number>;
  mainGroupChannelId: number | null;
};

const usePrototypeUnread = ({
  readStatesMap,
  dmChannelByChatId,
  groupChannelByChatId,
  dmUnreadByChatId,
  mainGroupChannelId
}: TUsePrototypeUnreadParams) => {
  const [unreadMessageIdsByChatId, setUnreadMessageIdsByChatId] = useState<
    Record<string, number[]>
  >({});
  const [serverUnreadDismissedByChatId, setServerUnreadDismissedByChatId] = useState<
    Record<string, boolean>
  >({});
  const unreadMessageIdsByChatIdRef = useRef<Record<string, number[]>>({});

  useEffect(() => {
    unreadMessageIdsByChatIdRef.current = unreadMessageIdsByChatId;
  }, [unreadMessageIdsByChatId]);

  const serverUnreadByChatId = useMemo(() => {
    const next: Record<string, number> = {};

    for (const [chatId, channelId] of Object.entries(dmChannelByChatId)) {
      next[chatId] = readStatesMap[channelId] ?? dmUnreadByChatId[chatId] ?? 0;
    }

    if (mainGroupChannelId) {
      next[MAIN_GROUP_CHAT_ID] = readStatesMap[mainGroupChannelId] ?? 0;
    }

    for (const [chatId, channelId] of Object.entries(groupChannelByChatId)) {
      next[chatId] = readStatesMap[channelId] ?? 0;
    }

    return next;
  }, [dmChannelByChatId, dmUnreadByChatId, groupChannelByChatId, mainGroupChannelId, readStatesMap]);

  const getUnreadCountForChat = useCallback(
    (chatId: string) => {
      const localUnread = unreadMessageIdsByChatId[chatId]?.length ?? 0;
      const serverUnread = serverUnreadDismissedByChatId[chatId]
        ? 0
        : (serverUnreadByChatId[chatId] ?? 0);
      return Math.max(localUnread, serverUnread);
    },
    [serverUnreadByChatId, serverUnreadDismissedByChatId, unreadMessageIdsByChatId]
  );

  const addUnreadMessageIds = useCallback((chatId: string, messageIds: number[]) => {
    if (messageIds.length === 0) return;

    setUnreadMessageIdsByChatId((prev) => {
      const current = prev[chatId] ?? [];
      const nextIds = mergeMessageIdsAsc(current, messageIds);
      if (
        current.length === nextIds.length &&
        current.every((messageId, index) => messageId === nextIds[index])
      ) {
        return prev;
      }

      return {
        ...prev,
        [chatId]: nextIds
      };
    });
  }, []);

  const removeUnreadMessageIds = useCallback((chatId: string, messageIds: number[]) => {
    if (messageIds.length === 0) return;
    const messageIdsSet = new Set(messageIds);

    setUnreadMessageIdsByChatId((prev) => {
      const current = prev[chatId] ?? [];
      if (current.length === 0) return prev;

      const nextIds = current.filter((messageId) => !messageIdsSet.has(messageId));
      if (nextIds.length === current.length) {
        return prev;
      }

      if (nextIds.length === 0) {
        const { [chatId]: _removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [chatId]: nextIds
      };
    });
  }, []);

  return {
    unreadMessageIdsByChatId,
    unreadMessageIdsByChatIdRef,
    serverUnreadByChatId,
    serverUnreadDismissedByChatId,
    setServerUnreadDismissedByChatId,
    getUnreadCountForChat,
    addUnreadMessageIds,
    removeUnreadMessageIds
  };
};

export { usePrototypeUnread };
