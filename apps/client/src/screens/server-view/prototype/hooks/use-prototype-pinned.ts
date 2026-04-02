import { getTRPCClient } from '@/lib/trpc';
import { extractDisplayTextFromHtml, stripMessageQuoteFromHtml } from '../utils';
import type { TMessage } from '../types';
import { MAIN_GROUP_CHAT_ID } from '../constants';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type TUsePrototypePinnedParams = {
  activeChatId: string | null;
  mainGroupChannelId: number | null;
  dmChannelByChatIdRef: { current: Record<string, number> };
  resolveChannelIdForChat: (chatId: string) => Promise<number | null>;
  resolveAuthorName: (userId: number) => string;
};

const usePrototypePinned = ({
  activeChatId,
  mainGroupChannelId,
  dmChannelByChatIdRef,
  resolveChannelIdForChat,
  resolveAuthorName
}: TUsePrototypePinnedParams) => {
  const [isPinnedPopoverOpen, setIsPinnedPopoverOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<TMessage[]>([]);
  const [pinnedLoading, setPinnedLoading] = useState(false);

  const loadPinnedForChat = useCallback(
    async (channelId: number) => {
      setPinnedLoading(true);
      try {
        const rawPinned = await getTRPCClient().messages.getPinned.query({ channelId });
        const mapped: TMessage[] = rawPinned.map((message) => {
          const bodyHtml = stripMessageQuoteFromHtml(message.content ?? '');
          return {
            id: message.id,
            userId: message.userId,
            author: resolveAuthorName(message.userId),
            avatar: null,
            html: message.content ?? '',
            text: extractDisplayTextFromHtml(bodyHtml) || '',
            createdAt: message.createdAt,
            files: message.files ?? [],
            reactions: message.reactions ?? [],
            pinned: !!message.pinned,
            pinnedAt: message.pinnedAt ?? null,
            pinnedBy: message.pinnedBy ?? null
          };
        });
        setPinnedMessages(mapped);
      } catch {
        setPinnedMessages([]);
        toast.error('Не удалось загрузить закрепленные сообщения.');
      } finally {
        setPinnedLoading(false);
      }
    },
    [resolveAuthorName]
  );

  const refreshPinnedForActiveChat = useCallback(async () => {
    const chatId = activeChatId;
    if (!chatId) {
      setPinnedMessages([]);
      return;
    }

    const existingChannelId =
      chatId === MAIN_GROUP_CHAT_ID ? mainGroupChannelId : dmChannelByChatIdRef.current[chatId];
    const channelId = existingChannelId ?? (await resolveChannelIdForChat(chatId));
    if (!channelId) {
      setPinnedMessages([]);
      return;
    }

    await loadPinnedForChat(channelId);
  }, [activeChatId, dmChannelByChatIdRef, loadPinnedForChat, mainGroupChannelId, resolveChannelIdForChat]);

  const removePinnedUserMessages = useCallback((userId: number) => {
    setPinnedMessages((prev) => prev.filter((message) => message.userId !== userId));
  }, []);

  useEffect(() => {
    setIsPinnedPopoverOpen(false);
  }, [activeChatId]);

  useEffect(() => {
    if (!isPinnedPopoverOpen) return;

    let cancelled = false;
    const run = async () => {
      const chatId = activeChatId;
      if (!chatId) return;

      const existingChannelId =
        chatId === MAIN_GROUP_CHAT_ID ? mainGroupChannelId : dmChannelByChatIdRef.current[chatId];
      const channelId = existingChannelId ?? (await resolveChannelIdForChat(chatId));
      if (!channelId || cancelled) {
        setPinnedMessages([]);
        return;
      }

      await loadPinnedForChat(channelId);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    activeChatId,
    dmChannelByChatIdRef,
    isPinnedPopoverOpen,
    loadPinnedForChat,
    mainGroupChannelId,
    resolveChannelIdForChat
  ]);

  return {
    isPinnedPopoverOpen,
    setIsPinnedPopoverOpen,
    pinnedMessages,
    pinnedLoading,
    refreshPinnedForActiveChat,
    removePinnedUserMessages
  };
};

export { usePrototypePinned };
