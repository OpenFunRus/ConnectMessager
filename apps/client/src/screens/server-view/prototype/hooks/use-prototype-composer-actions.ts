import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { getTRPCClient } from '@/lib/trpc';
import { canonicalizeMessageEmojiHtml } from '@/helpers/message-emojis';
import { getPlainTextFromHtml, prepareMessageHtml } from '@connectmessager/shared';
import { GIF_MESSAGE_PREFIX } from '../constants';
import { buildQuotedMessageHtml, convertComposerHtmlToShortcodes } from '../utils';
import type { Editor } from '@tiptap/react';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { TActiveQuote } from '../types';

type TUsePrototypeComposerActionsParams = {
  activeChatId?: string | null;
  resolveChannelIdForChat: (chatId: string) => Promise<number | null>;
  composerEditor: Editor | null;
  draftHtml: string;
  activeQuote: TActiveQuote | null;
  isComposerSymbolOverflow: boolean;
  isComposerLineOverflow: boolean;
  setIsEmojiPickerOpen: Dispatch<SetStateAction<boolean>>;
  setIsComposerExpanded: Dispatch<SetStateAction<boolean>>;
  clearDraftForChat: (chatId: string) => void;
  handleSuccessfulOwnSendToChat: (chatId: string, channelId: number) => Promise<void>;
  handleSendActionError: (error: unknown, fallbackMessage: string) => void;
  addRecentEmoji: (emoji: TEmojiItem) => void;
  addRecentGif: (gifUrl: string) => void;
};

const usePrototypeComposerActions = ({
  activeChatId,
  resolveChannelIdForChat,
  composerEditor,
  draftHtml,
  activeQuote,
  isComposerSymbolOverflow,
  isComposerLineOverflow,
  setIsEmojiPickerOpen,
  setIsComposerExpanded,
  clearDraftForChat,
  handleSuccessfulOwnSendToChat,
  handleSendActionError,
  addRecentEmoji,
  addRecentGif
}: TUsePrototypeComposerActionsParams) => {
  const submitMessage = useCallback(async () => {
    if (!activeChatId) return;
    const channelId = await resolveChannelIdForChat(activeChatId);
    if (!channelId) return;

    const rawHtml = composerEditor?.getHTML() ?? draftHtml;
    const shortcodeHtml = convertComposerHtmlToShortcodes(rawHtml);
    const quotedHtml = activeQuote ? buildQuotedMessageHtml(activeQuote) : '';
    const canonicalHtml = canonicalizeMessageEmojiHtml(`${quotedHtml}${shortcodeHtml}`, []);
    const plain = getPlainTextFromHtml(shortcodeHtml).trim();
    if (!plain && !activeQuote) return;
    if (isComposerSymbolOverflow || isComposerLineOverflow) {
      toast.error('Превышены ограничения роли по символам/строкам сообщения.');
      return;
    }

    setIsEmojiPickerOpen(false);
    setIsComposerExpanded(false);

    try {
      await getTRPCClient().messages.send.mutate({
        channelId,
        content: prepareMessageHtml(canonicalHtml),
        files: []
      });
      playSound(SoundType.MESSAGE_SENT);
      await handleSuccessfulOwnSendToChat(activeChatId, channelId);

      composerEditor?.commands.clearContent(true);
      clearDraftForChat(activeChatId);
    } catch (error) {
      handleSendActionError(error, 'Не удалось отправить сообщение.');
    }
  }, [
    activeChatId,
    composerEditor,
    draftHtml,
    activeQuote,
    clearDraftForChat,
    handleSendActionError,
    handleSuccessfulOwnSendToChat,
    isComposerLineOverflow,
    isComposerSymbolOverflow,
    resolveChannelIdForChat,
    setIsComposerExpanded,
    setIsEmojiPickerOpen
  ]);

  const submitGifMessage = useCallback(
    async (gifUrl: string) => {
      if (!activeChatId) return;
      const channelId = await resolveChannelIdForChat(activeChatId);
      if (!channelId) return;

      addRecentGif(gifUrl);
      const quotedHtml = activeQuote ? buildQuotedMessageHtml(activeQuote) : '';
      setIsEmojiPickerOpen(false);
      setIsComposerExpanded(false);

      try {
        await getTRPCClient().messages.send.mutate({
          channelId,
          content: prepareMessageHtml(`${quotedHtml}${GIF_MESSAGE_PREFIX}${gifUrl}`),
          files: []
        });
        playSound(SoundType.MESSAGE_SENT);
        await handleSuccessfulOwnSendToChat(activeChatId, channelId);
      } catch (error) {
        handleSendActionError(error, 'Не удалось отправить GIF.');
      }
    },
    [
      activeChatId,
      activeQuote,
      addRecentGif,
      handleSendActionError,
      handleSuccessfulOwnSendToChat,
      resolveChannelIdForChat,
      setIsComposerExpanded,
      setIsEmojiPickerOpen
    ]
  );

  const insertEmojiShortcode = useCallback(
    (emoji: TEmojiItem) => {
      addRecentEmoji(emoji);
      if (!composerEditor || !emoji.name) return;
      composerEditor.chain().focus().setEmoji(emoji.name).run();
    },
    [addRecentEmoji, composerEditor]
  );

  return {
    submitMessage,
    submitGifMessage,
    insertEmojiShortcode
  };
};

export { usePrototypeComposerActions };
