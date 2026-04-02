import { getTRPCClient } from '@/lib/trpc';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { hasMention } from '@connectmessager/shared';
import { MAIN_GROUP_CHAT_ID } from '../constants';
import type { TMentionNotification, TMessage } from '../types';
import { hasQuoteForUser, mergeMessagesAsc } from '../utils';
import type { TJoinedMessage } from '@connectmessager/shared';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';

type TUsePrototypeMessageRealtimeParams = {
  ownUserId?: number;
  activeChatId: string | null;
  mainGroupChannelId: number | null;
  getChatIdByChannelId: (channelId: number) => string | null;
  refreshDmConversations: () => Promise<
    | {
        nextChannels: Record<string, number>;
      }
    | undefined
  >;
  mapRawMessagesToAsc: (rawMessages: TJoinedMessage[]) => TMessage[];
  setMessagesByChatId: Dispatch<SetStateAction<Record<string, TMessage[]>>>;
  addUnreadMessageIds: (chatId: string, messageIds: number[]) => void;
  removeUnreadMessageIds: (chatId: string, messageIds: number[]) => void;
  setServerUnreadDismissedByChatId: Dispatch<SetStateAction<Record<string, boolean>>>;
  consumeVisibleUnreadForChat: (chatId: string | null | undefined) => void;
  scheduleScrollToBottom: (delay?: number) => void;
  upsertMentionNotification: (item: TMentionNotification) => void;
  removeMentionNotification: (messageId: number) => void;
};

const usePrototypeMessageRealtime = ({
  ownUserId,
  activeChatId,
  mainGroupChannelId,
  getChatIdByChannelId,
  refreshDmConversations,
  mapRawMessagesToAsc,
  setMessagesByChatId,
  addUnreadMessageIds,
  removeUnreadMessageIds,
  setServerUnreadDismissedByChatId,
  consumeVisibleUnreadForChat,
  scheduleScrollToBottom,
  upsertMentionNotification,
  removeMentionNotification
}: TUsePrototypeMessageRealtimeParams) => {
  useEffect(() => {
    if (!ownUserId) return;

    const trpc = getTRPCClient();

    const resolveChatIdForChannel = async (channelId: number): Promise<string | null> => {
      let chatId = getChatIdByChannelId(channelId);

      if (!chatId && channelId !== mainGroupChannelId) {
        try {
          const refreshed = await refreshDmConversations();
          chatId =
            Object.entries(refreshed?.nextChannels ?? {}).find(
              ([, mappedChannelId]) => mappedChannelId === channelId
            )?.[0] ?? null;
        } catch {
          // ignore temporary refresh errors
        }
        chatId = chatId ?? getChatIdByChannelId(channelId);
      }

      return chatId;
    };

    const appendIncomingMessage = async (message: TJoinedMessage) => {
      const chatId = await resolveChatIdForChannel(message.channelId);
      if (!chatId) return;

      const [mappedMessage] = mapRawMessagesToAsc([message]);
      if (!mappedMessage) return;

      setMessagesByChatId((prev) => ({
        ...prev,
        [chatId]: mergeMessagesAsc(prev[chatId] || [], [mappedMessage])
      }));

      if (message.userId !== ownUserId) {
        playSound(SoundType.MESSAGE_RECEIVED);
        if (hasMention(message.content, ownUserId) || hasQuoteForUser(message.content, ownUserId)) {
          const notificationText = mappedMessage.text || mappedMessage.quote?.text || '';
          upsertMentionNotification({
            messageId: message.id,
            messageUserId: message.userId,
            channelId: message.channelId,
            chatId,
            author: mappedMessage.author,
            text: notificationText,
            html: mappedMessage.html,
            createdAt: mappedMessage.createdAt
          });
        }

        if (activeChatId !== chatId) {
          addUnreadMessageIds(chatId, [mappedMessage.id]);
          setServerUnreadDismissedByChatId((prev) => ({
            ...prev,
            [chatId]: true
          }));
        } else {
          setTimeout(() => {
            consumeVisibleUnreadForChat(chatId);
          }, 0);
        }
      }

      if (chatId !== MAIN_GROUP_CHAT_ID) {
        void refreshDmConversations();
      }

      if (activeChatId === chatId) {
        scheduleScrollToBottom(0);
      }
    };

    const updateIncomingMessage = async (message: TJoinedMessage) => {
      const chatId = await resolveChatIdForChannel(message.channelId);
      if (!chatId) return;

      const [mappedMessage] = mapRawMessagesToAsc([message]);
      if (!mappedMessage) return;

      setMessagesByChatId((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((item) =>
          item.id === mappedMessage.id ? mappedMessage : item
        )
      }));

      if (
        message.userId !== ownUserId &&
        (hasMention(message.content, ownUserId) || hasQuoteForUser(message.content, ownUserId))
      ) {
        const notificationText = mappedMessage.text || mappedMessage.quote?.text || '';
        upsertMentionNotification({
          messageId: message.id,
          messageUserId: message.userId,
          channelId: message.channelId,
          chatId,
          author: mappedMessage.author,
          text: notificationText,
          html: mappedMessage.html,
          createdAt: mappedMessage.createdAt
        });
      } else {
        removeMentionNotification(message.id);
      }

      if (activeChatId === chatId) {
        setTimeout(() => {
          consumeVisibleUnreadForChat(chatId);
        }, 0);
      }
    };

    const deleteIncomingMessage = async (channelId: number, messageId: number) => {
      const chatId = await resolveChatIdForChannel(channelId);
      if (!chatId) return;

      setMessagesByChatId((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter((item) => item.id !== messageId)
      }));
      removeUnreadMessageIds(chatId, [messageId]);
      removeMentionNotification(messageId);
    };

    const onNewSub = trpc.messages.onNew.subscribe(undefined, {
      onData: (message) => {
        void appendIncomingMessage(message);
      },
      onError: () => {
        // ignore temporary message subscription errors in prototype UI
      }
    });

    const onUpdateSub = trpc.messages.onUpdate.subscribe(undefined, {
      onData: (message) => {
        void updateIncomingMessage(message);
      },
      onError: () => {
        // ignore temporary message subscription errors in prototype UI
      }
    });

    const onDeleteSub = trpc.messages.onDelete.subscribe(undefined, {
      onData: ({ channelId, messageId }) => {
        void deleteIncomingMessage(channelId, messageId);
      },
      onError: () => {
        // ignore temporary message subscription errors in prototype UI
      }
    });

    return () => {
      onNewSub.unsubscribe();
      onUpdateSub.unsubscribe();
      onDeleteSub.unsubscribe();
    };
  }, [
    activeChatId,
    addUnreadMessageIds,
    consumeVisibleUnreadForChat,
    getChatIdByChannelId,
    mainGroupChannelId,
    mapRawMessagesToAsc,
    ownUserId,
    refreshDmConversations,
    removeMentionNotification,
    removeUnreadMessageIds,
    scheduleScrollToBottom,
    setMessagesByChatId,
    setServerUnreadDismissedByChatId,
    upsertMentionNotification
  ]);
};

export { usePrototypeMessageRealtime };
