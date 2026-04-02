import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { ALL_EMOJIS, EMOJI_CATEGORIES, GROUPED_EMOJIS } from '@/components/emoji-picker/emoji-data';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import {
  canonicalizeMessageEmojiHtml,
  getEmojiOnlyCount,
  getClipboardTextFromRenderedEmojiHtml,
  renderMessageTextWithEmojis
} from '@/helpers/message-emojis';
import parse, { Text } from 'html-react-parser';
import type { ClipboardEvent as ReactClipboardEvent, ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { serializer } from '@/components/channel-view/text/renderer/serializer';
import { EMOJI_CATEGORY_LABELS_RU, MESSAGE_GROUP_WINDOW_MS } from '../constants';
import type { TMessage } from '../types';
import {
  getGifUrlFromMessageText,
  getPlainTextFromCopiedHtml,
  stripMessageQuoteFromHtml
} from '../utils';

type TUsePrototypeMessagePresentationParams = {
  recentEmojiNames: string[];
  visibleMessages: TMessage[];
};

const GifMessage = ({ gifUrl }: { gifUrl: string }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`cmx-gif-message ${loaded ? 'loaded' : ''}`}>
      <img
        src={gifUrl}
        alt="GIF"
        className="cmx-gif-message-image"
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

const usePrototypeMessagePresentation = ({
  recentEmojiNames,
  visibleMessages
}: TUsePrototypeMessagePresentationParams) => {
  const customEmojis = useCustomEmojis();
  const renderMessages = useMemo(
    () =>
      visibleMessages.map((message, index, list) => {
        const previous = index > 0 ? list[index - 1] : null;
        const next = index < list.length - 1 ? list[index + 1] : null;

        const groupedWithPrevious =
          !!previous &&
          previous.userId === message.userId &&
          message.createdAt - previous.createdAt <= MESSAGE_GROUP_WINDOW_MS;

        const groupedWithNext =
          !!next &&
          next.userId === message.userId &&
          next.createdAt - message.createdAt <= MESSAGE_GROUP_WINDOW_MS;
        const emojiOnlyCount = getEmojiOnlyCount(
          stripMessageQuoteFromHtml(message.html),
          customEmojis
        );

        return {
          ...message,
          showMeta: !groupedWithPrevious,
          groupedWithNext,
          emojiOnly: emojiOnlyCount > 0,
          emojiOnlyCount
        };
      }),
    [customEmojis, visibleMessages]
  );

  const emojiByShortcode = useMemo(() => {
    const lookup = new Map<string, TEmojiItem>();

    ALL_EMOJIS.forEach((emoji) => {
      lookup.set(emoji.name.toLowerCase(), emoji);
    });

    ALL_EMOJIS.forEach((emoji) => {
      emoji.shortcodes.forEach((shortcode) => {
        const key = shortcode.toLowerCase();
        if (!lookup.has(key)) {
          lookup.set(key, emoji);
        }
      });
    });

    return lookup;
  }, []);

  const emojiByName = useMemo(() => {
    const lookup = new Map<string, TEmojiItem>();
    ALL_EMOJIS.forEach((emoji) => {
      lookup.set(emoji.name.toLowerCase(), emoji);
    });
    return lookup;
  }, []);

  const topRecentEmojis = useMemo(
    () =>
      recentEmojiNames
        .map((name) => emojiByName.get(name.toLowerCase()))
        .filter((emoji): emoji is TEmojiItem => !!emoji && !!emoji.fallbackImage)
        .slice(0, 16),
    [emojiByName, recentEmojiNames]
  );

  const emojiGroups = useMemo(
    () =>
      EMOJI_CATEGORIES.filter((category) => category.id !== 'recent')
        .map((category) => ({
          id: category.id,
          label: EMOJI_CATEGORY_LABELS_RU[category.id] ?? category.label,
          emojis: (GROUPED_EMOJIS[category.id] || []).filter((emoji) => !!emoji.fallbackImage)
        }))
        .filter((group) => group.emojis.length > 0),
    []
  );

  const renderMessageContent = useCallback(
    (message: TMessage): ReactNode => {
      const gifUrl = getGifUrlFromMessageText(message.text);
      if (gifUrl) {
        return <GifMessage gifUrl={gifUrl} />;
      }

      if (!message.html) {
        return message.text;
      }

      const canonicalHtml = canonicalizeMessageEmojiHtml(
        stripMessageQuoteFromHtml(message.html),
        customEmojis
      );

      return parse(canonicalHtml, {
        replace: (domNode, index) => {
          if (domNode instanceof Text) {
            return (
              renderMessageTextWithEmojis(
                domNode.data,
                customEmojis,
                `${message.id}-${index}`
              ) ?? undefined
            );
          }

          return serializer(domNode, () => undefined, message.id);
        }
      });
    },
    [customEmojis]
  );

  const onMessageCopy = useCallback(
    (event: ReactClipboardEvent<HTMLElement>, fallbackText: string) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (!event.currentTarget.contains(range.commonAncestorContainer)) {
        return;
      }

      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      const plain =
        getClipboardTextFromRenderedEmojiHtml(container.innerHTML, customEmojis) ||
        getPlainTextFromCopiedHtml(container.innerHTML);
      event.clipboardData.setData('text/plain', plain || fallbackText);
      event.preventDefault();
    },
    [customEmojis]
  );

  return {
    renderMessages,
    emojiByShortcode,
    topRecentEmojis,
    emojiGroups,
    renderMessageContent,
    onMessageCopy
  };
};

export { usePrototypeMessagePresentation };
