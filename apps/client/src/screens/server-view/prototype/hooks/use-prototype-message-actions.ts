import { getTRPCClient } from '@/lib/trpc';
import type { TActiveQuote, TMessage, TMessageContextMenuState } from '../types';
import type { Editor } from '@tiptap/react';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import { toast } from 'sonner';

type TUsePrototypeMessageActionsParams = {
  messageContextMenu: TMessageContextMenuState | null;
  closeMessageContextMenu: () => void;
  openMessageReactionPicker: (messageId: number, anchor: { x: number; y: number }) => void;
  composerEditor: Editor | null;
  setActiveQuote: Dispatch<SetStateAction<TActiveQuote | null>>;
  setMessagesByChatId: Dispatch<SetStateAction<Record<string, TMessage[]>>>;
  ownUserId?: number;
  activeChatId?: string | null;
  isPinnedPopoverOpen: boolean;
  refreshPinnedForActiveChat: () => Promise<void>;
};

const usePrototypeMessageActions = ({
  messageContextMenu,
  closeMessageContextMenu,
  openMessageReactionPicker,
  composerEditor,
  setActiveQuote,
  setMessagesByChatId,
  ownUserId,
  activeChatId,
  isPinnedPopoverOpen,
  refreshPinnedForActiveChat
}: TUsePrototypeMessageActionsParams) => {
  const onMessageMenuAction = useCallback(
    async (action: 'reactions' | 'pin' | 'delete' | 'quote' | 'mention') => {
      const menuState = messageContextMenu;
      if (!menuState) return;

      if (action === 'mention') {
        if (composerEditor) {
          composerEditor
            .chain()
            .focus()
            .insertContent([
              {
                type: 'mention',
                attrs: {
                  userId: menuState.messageUserId,
                  label: menuState.messageAuthor
                }
              },
              { type: 'text', text: ' ' }
            ])
            .run();
        }
        closeMessageContextMenu();
        return;
      }

      if (action === 'quote') {
        setActiveQuote({
          messageId: menuState.messageId,
          userId: menuState.messageUserId,
          author: menuState.messageAuthor,
          text: (menuState.messageText || '').trim() || '[вложение]'
        });
        composerEditor?.chain().focus().run();
        closeMessageContextMenu();
        return;
      }

      if (action === 'delete') {
        try {
          await getTRPCClient().messages.delete.mutate({
            messageId: menuState.messageId
          });
          setMessagesByChatId((prev) => {
            const next: Record<string, TMessage[]> = {};
            Object.entries(prev).forEach(([_chatId, messages]) => {
              next[_chatId] = messages.filter((message) => message.id !== menuState.messageId);
            });
            return next;
          });
          toast.success('Сообщение удалено.');
        } catch {
          toast.error('Не удалось удалить сообщение.');
        } finally {
          closeMessageContextMenu();
        }
        return;
      }

      if (action === 'reactions') {
        openMessageReactionPicker(menuState.messageId, {
          x: menuState.x + 228,
          y: menuState.y - 6
        });
        closeMessageContextMenu();
        return;
      } else if (action === 'pin') {
        try {
          await getTRPCClient().messages.togglePin.mutate({
            messageId: menuState.messageId
          });
          const nextPinned = !menuState.messagePinned;
          setMessagesByChatId((prev) => {
            const next: Record<string, TMessage[]> = {};
            Object.entries(prev).forEach(([chatId, messages]) => {
              next[chatId] = messages.map((message) => {
                if (message.id !== menuState.messageId) return message;
                return {
                  ...message,
                  pinned: nextPinned,
                  pinnedAt: nextPinned ? Date.now() : null,
                  pinnedBy: nextPinned ? ownUserId ?? null : null
                };
              });
            });
            return next;
          });
          toast.success(nextPinned ? 'Сообщение закреплено.' : 'Сообщение откреплено.');

          if (isPinnedPopoverOpen && activeChatId) {
            await refreshPinnedForActiveChat();
          }
        } catch {
          toast.error('Не удалось изменить закреп сообщения.');
        }
      }

      closeMessageContextMenu();
    },
    [
      activeChatId,
      closeMessageContextMenu,
      composerEditor,
      isPinnedPopoverOpen,
      messageContextMenu,
      openMessageReactionPicker,
      ownUserId,
      refreshPinnedForActiveChat,
      setActiveQuote,
      setMessagesByChatId
    ]
  );

  return {
    onMessageMenuAction
  };
};

export { usePrototypeMessageActions };
