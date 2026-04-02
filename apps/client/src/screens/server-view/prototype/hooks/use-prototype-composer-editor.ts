import {
  ALL_EMOJIS
} from '@/components/emoji-picker/emoji-data';
import { Mention } from '@/components/tiptap-input/plugins/mentions';
import { MentionNode } from '@/components/tiptap-input/plugins/mentions/node';
import {
  MENTION_STORAGE_KEY,
  MentionSuggestion
} from '@/components/tiptap-input/plugins/mentions/suggestion';
import type { TJoinedPublicUser } from '@connectmessager/shared';
import { getPlainTextFromHtml } from '@connectmessager/shared';
import Emoji, { type EmojiItem } from '@tiptap/extension-emoji';
import { useEditor, type Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { EMOJI_SHORTCODE_REGEX } from '../constants';
import {
  COMPOSER_LEADING_GUARD,
  convertComposerHtmlToShortcodes,
  getPlainTextFromCopiedHtml,
  stripComposerInvisibleChars
} from '../utils';
import type { TActiveQuote } from '../types';

type TUsePrototypeComposerEditorParams = {
  activeChatId: string | null;
  draftHtml: string;
  draftHtmlByChatId: Record<string, string>;
  setDraftForChat: (chatId: string, html: string) => void;
  submitMessageRef: MutableRefObject<() => void>;
  activeQuote: TActiveQuote | null;
  clearActiveQuote: () => void;
  emojiByShortcode: Map<string, TEmojiItem>;
  mentionUsers: TJoinedPublicUser[];
};

const usePrototypeComposerEditor = ({
  activeChatId,
  draftHtml,
  draftHtmlByChatId,
  setDraftForChat,
  submitMessageRef,
  activeQuote,
  clearActiveQuote,
  emojiByShortcode,
  mentionUsers
}: TUsePrototypeComposerEditorParams) => {
  const applyingDraftRef = useRef(false);
  const normalizingLeadingEmojiGuardRef = useRef(false);

  const ensureLeadingEmojiGuard = (editor: Editor) => {
    const firstBlock = editor.state.doc.firstChild;
    if (!firstBlock?.isTextblock || firstBlock.childCount === 0) {
      return false;
    }

    const firstInlineChild = firstBlock.firstChild;
    if (!firstInlineChild) {
      return false;
    }

    if (firstInlineChild.type.name === 'text') {
      const text = firstInlineChild.text ?? '';
      const secondInlineChild = firstBlock.childCount > 1 ? firstBlock.child(1) : null;

      if (!text.startsWith(COMPOSER_LEADING_GUARD)) {
        return false;
      }

      const shouldKeepGuard =
        text === COMPOSER_LEADING_GUARD && secondInlineChild?.type.name === 'emoji';

      if (shouldKeepGuard) {
        return false;
      }

      normalizingLeadingEmojiGuardRef.current = true;
      const { from, to } = editor.state.selection;
      const tr = editor.state.tr.delete(1, 2);
      const nextFrom = Math.max(1, from > 1 ? from - 1 : from);
      const nextTo = Math.max(nextFrom, to > 1 ? to - 1 : to);
      tr.setSelection(TextSelection.create(tr.doc, nextFrom, nextTo));
      editor.view.dispatch(tr);
      return true;
    }

    if (firstInlineChild.type.name !== 'emoji') {
      return false;
    }

    normalizingLeadingEmojiGuardRef.current = true;
    const { from, to } = editor.state.selection;
    const tr = editor.state.tr.insertText(COMPOSER_LEADING_GUARD, 1);
    const nextFrom = from >= 1 ? from + 1 : from;
    const nextTo = to >= 1 ? to + 1 : to;
    tr.setSelection(TextSelection.create(tr.doc, nextFrom, Math.max(nextFrom, nextTo)));
    editor.view.dispatch(tr);
    return true;
  };

  const composerEditor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: { class: 'cmx-editor-paragraph' }
        }
      }),
      Emoji.configure({
        emojis: ALL_EMOJIS as EmojiItem[],
        enableEmoticons: false,
        HTMLAttributes: {
          class: 'cmx-editor-emoji'
        }
      }),
      Mention.configure({
        users: [],
        suggestion: MentionSuggestion
      }),
      MentionNode
    ],
    content: draftHtml,
    editorProps: {
      attributes: {
        class: 'ProseMirror'
      },
      handleKeyDown: (_view, event) => {
        const hasSuggestions = !!document.querySelector(
          '[data-editor-suggestion-active="true"]'
        );
        const plainText =
          stripComposerInvisibleChars(
            composerEditor?.state.doc
              .textBetween(0, composerEditor.state.doc.content.size, '\n', '\n')
              .replace(/\r\n/g, '\n') ?? ''
          ).trim();

        if (event.key === 'Enter' && !event.shiftKey) {
          if (hasSuggestions) {
            return false;
          }
          event.preventDefault();
          submitMessageRef.current();
          return true;
        }
        if ((event.key === 'Backspace' || event.key === 'Delete') && activeQuote && !plainText) {
          event.preventDefault();
          clearActiveQuote();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData('text/plain') ?? '';
        if (!text || !EMOJI_SHORTCODE_REGEX.test(text)) {
          EMOJI_SHORTCODE_REGEX.lastIndex = 0;
          return false;
        }

        EMOJI_SHORTCODE_REGEX.lastIndex = 0;
        const chain = composerEditor?.chain().focus();
        if (!chain) {
          return false;
        }

        let cursor = 0;
        let insertedEmoji = false;
        for (const match of text.matchAll(EMOJI_SHORTCODE_REGEX)) {
          const matchIndex = match.index ?? -1;
          const token = match[0];
          const shortcodeName = (match[1] ?? '').toLowerCase();
          if (matchIndex < 0) continue;

          const before = text.slice(cursor, matchIndex);
          if (before) {
            chain.insertContent(before);
          }

          const emoji = emojiByShortcode.get(shortcodeName);
          if (emoji?.name) {
            chain.setEmoji(emoji.name);
            insertedEmoji = true;
          } else {
            chain.insertContent(token);
          }

          cursor = matchIndex + token.length;
        }

        const tail = text.slice(cursor);
        if (tail) {
          chain.insertContent(tail);
        }

        chain.run();
        if (!insertedEmoji) {
          return false;
        }
        event.preventDefault();
        return true;
      },
      handleDOMEvents: {
        copy: (view, copyEvent) => {
          const event = copyEvent as ClipboardEvent;
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return false;
          }

          const range = selection.getRangeAt(0);
          if (!view.dom.contains(range.commonAncestorContainer)) {
            return false;
          }

          const container = document.createElement('div');
          container.appendChild(range.cloneContents());
          container.querySelectorAll('span[data-type="emoji"]').forEach((node) => {
            const name = node.getAttribute('data-name') ?? '';
            node.replaceWith(document.createTextNode(name ? `:${name}:` : ''));
          });

          const plain = getPlainTextFromCopiedHtml(container.innerHTML);
          event.clipboardData?.setData('text/plain', plain);
          event.preventDefault();
          return true;
        }
      }
    },
    onUpdate: ({ editor }) => {
      if (!activeChatId || applyingDraftRef.current) return;
      if (!normalizingLeadingEmojiGuardRef.current && ensureLeadingEmojiGuard(editor)) {
        return;
      }
      normalizingLeadingEmojiGuardRef.current = false;
      const normalizedHtml = editor.isEmpty ? '' : stripComposerInvisibleChars(editor.getHTML());
      setDraftForChat(activeChatId, normalizedHtml);
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!composerEditor) return;

    const nextDraftHtml = activeChatId ? (draftHtmlByChatId[activeChatId] ?? '') : '';
    const normalizedCurrentHtml =
      composerEditor.isEmpty ? '' : stripComposerInvisibleChars(composerEditor.getHTML());

    if (normalizedCurrentHtml === nextDraftHtml) {
      return;
    }

    applyingDraftRef.current = true;
    composerEditor.commands.setContent(nextDraftHtml || '<p></p>', {
      emitUpdate: false
    });
    ensureLeadingEmojiGuard(composerEditor);
    applyingDraftRef.current = false;
    normalizingLeadingEmojiGuardRef.current = false;
  }, [activeChatId, composerEditor, draftHtmlByChatId]);

  useEffect(() => {
    if (!composerEditor) return;

    const storage = composerEditor.storage as unknown as Record<
      string,
      { users?: TJoinedPublicUser[] }
    >;

    if (storage[MENTION_STORAGE_KEY]) {
      storage[MENTION_STORAGE_KEY]!.users = mentionUsers;
    }
  }, [composerEditor, mentionUsers]);

  const { composerSymbolCount, composerLineCount } = useMemo(() => {
    if (composerEditor) {
      const plain = stripComposerInvisibleChars(
        composerEditor.state.doc
          .textBetween(0, composerEditor.state.doc.content.size, '\n', '\n')
          .replace(/\r\n/g, '\n')
      );
      return {
        composerSymbolCount: plain.length,
        composerLineCount: Math.max(1, plain.split('\n').length)
      };
    }

    const rawHtml = draftHtml || '';
    const shortcodeHtml = convertComposerHtmlToShortcodes(rawHtml);
    const plain = stripComposerInvisibleChars(
      getPlainTextFromHtml(shortcodeHtml).replace(/\r\n/g, '\n')
    );
    return {
      composerSymbolCount: plain.length,
      composerLineCount: Math.max(1, plain.split('\n').length)
    };
  }, [composerEditor, draftHtml]);

  return {
    composerEditor,
    composerSymbolCount,
    composerLineCount
  };
};

export { usePrototypeComposerEditor };
