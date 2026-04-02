import { getTRPCClient } from '@/lib/trpc';
import { TYPING_MS } from '@connectmessager/shared';
import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAIN_GROUP_CHAT_ID } from '../constants';
import { getGroupChannelIdFromChatId } from '../utils';

type TTypingContact = {
  id: number;
  name: string;
};

type TUsePrototypeTypingParams = {
  ownUserId?: number;
  activeChatId: string | null;
  composerEditor: Editor | null;
  draftHtml: string;
  contacts: TTypingContact[];
  mainGroupChannelId: number | null;
  groupChannelByChatId: Record<string, number>;
  dmChannelByChatIdRef: { current: Record<string, number> };
};

const usePrototypeTyping = ({
  ownUserId,
  activeChatId,
  composerEditor,
  draftHtml,
  contacts,
  mainGroupChannelId,
  groupChannelByChatId,
  dmChannelByChatIdRef
}: TUsePrototypeTypingParams) => {
  const [typingUsersByChatId, setTypingUsersByChatId] = useState<Record<string, number[]>>({});
  const typingSignalAtByChatIdRef = useRef<Record<string, number>>({});
  const typingTimeoutByKeyRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const resolveChannelIdForChat = useCallback(
    (chatId: string) => {
      if (chatId === MAIN_GROUP_CHAT_ID) {
        return mainGroupChannelId;
      }

      const mappedGroupChannelId =
        groupChannelByChatId[chatId] ?? getGroupChannelIdFromChatId(chatId);
      if (mappedGroupChannelId) {
        return mappedGroupChannelId;
      }

      return dmChannelByChatIdRef.current[chatId] ?? null;
    },
    [dmChannelByChatIdRef, groupChannelByChatId, mainGroupChannelId]
  );

  const resolveChatIdForChannel = useCallback(
    (channelId: number) => {
      if (mainGroupChannelId && channelId === mainGroupChannelId) {
        return MAIN_GROUP_CHAT_ID;
      }

      const mappedGroupChatId =
        Object.entries(groupChannelByChatId).find(([, mappedChannelId]) => mappedChannelId === channelId)?.[0] ??
        null;
      if (mappedGroupChatId) {
        return mappedGroupChatId;
      }

      return (
        Object.entries(dmChannelByChatIdRef.current).find(
          ([, mappedChannelId]) => mappedChannelId === channelId
        )?.[0] ?? null
      );
    },
    [dmChannelByChatIdRef, groupChannelByChatId, mainGroupChannelId]
  );

  const signalTypingForActiveChat = useCallback(async () => {
    const chatId = activeChatId;
    if (!chatId || !composerEditor) return;

    const plain = composerEditor.state.doc
      .textBetween(0, composerEditor.state.doc.content.size, '\n', '\n')
      .replace(/\u200B/g, '')
      .replace(/\r\n/g, '\n')
      .trim();
    if (!plain) return;

    const channelId = resolveChannelIdForChat(chatId);
    if (!channelId) return;

    const now = Date.now();
    const lastSignalAt = typingSignalAtByChatIdRef.current[chatId] ?? 0;
    if (now - lastSignalAt < TYPING_MS) return;
    typingSignalAtByChatIdRef.current[chatId] = now;

    try {
      await getTRPCClient().messages.signalTyping.mutate({ channelId });
    } catch {
      // ignore typing signal errors
    }
  }, [activeChatId, composerEditor, resolveChannelIdForChat]);

  useEffect(() => {
    if (!ownUserId) return;

    const sub = getTRPCClient().messages.onTyping.subscribe(undefined, {
      onData: ({ userId, channelId, parentMessageId }) => {
        if (parentMessageId || userId === ownUserId) return;

        const chatId = resolveChatIdForChannel(channelId);
        if (!chatId) return;

        setTypingUsersByChatId((prev) => {
          const current = prev[chatId] || [];
          if (current.includes(userId)) return prev;
          return {
            ...prev,
            [chatId]: [...current, userId]
          };
        });

        const timeoutKey = `${chatId}:${userId}`;
        const existingTimeout = typingTimeoutByKeyRef.current[timeoutKey];
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        typingTimeoutByKeyRef.current[timeoutKey] = setTimeout(() => {
          setTypingUsersByChatId((prev) => {
            const current = prev[chatId] || [];
            const next = current.filter((id) => id !== userId);
            if (next.length === current.length) return prev;
            return {
              ...prev,
              [chatId]: next
            };
          });
          delete typingTimeoutByKeyRef.current[timeoutKey];
        }, TYPING_MS + 500);
      },
      onError: () => {
        // ignore typing subscription errors in prototype UI
      }
    });

    return () => {
      sub.unsubscribe();
      Object.values(typingTimeoutByKeyRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      typingTimeoutByKeyRef.current = {};
    };
  }, [ownUserId, resolveChatIdForChannel]);

  useEffect(() => {
    if (!activeChatId || !composerEditor) return;
    void signalTypingForActiveChat();
  }, [activeChatId, composerEditor, draftHtml, signalTypingForActiveChat]);

  const activeTypingUserNames = useMemo(() => {
    const chatId = activeChatId;
    if (!chatId) return [];

    const typingIds = typingUsersByChatId[chatId] || [];
    if (typingIds.length === 0) return [];

    const names = typingIds
      .filter((userId) => userId !== ownUserId)
      .map((userId) => contacts.find((user) => user.id === userId)?.name)
      .filter((name): name is string => !!name);

    return [...new Set(names)];
  }, [activeChatId, contacts, ownUserId, typingUsersByChatId]);

  const typingIndicatorText = useMemo(() => {
    if (activeTypingUserNames.length === 0) return '';
    if (activeTypingUserNames.length === 1) {
      return `${activeTypingUserNames[0]} печатает сообщение...`;
    }
    if (activeTypingUserNames.length === 2) {
      return `${activeTypingUserNames[0]} и ${activeTypingUserNames[1]} печатают сообщение...`;
    }
    return `${activeTypingUserNames[0]} и еще ${activeTypingUserNames.length - 1} печатают сообщение...`;
  }, [activeTypingUserNames]);

  return {
    typingIndicatorText
  };
};

export { usePrototypeTyping };
