import { EmojiPicker } from '@/components/emoji-picker';
import { ALL_EMOJIS } from '@/components/emoji-picker/emoji-data';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { useMentionableUsers } from '@/features/server/users/hooks';
import type { TCommandInfo } from '@connectmessager/shared';
import { Button } from '@connectmessager/ui';
import Emoji, { type EmojiItem } from '@tiptap/extension-emoji';
import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ChevronDown, ChevronUp, Smile } from 'lucide-react';
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { TEmojiItem } from './helpers';
import {
  COMMANDS_STORAGE_KEY,
  CommandSuggestion
} from './plugins/command-suggestion';
import { Mention } from './plugins/mentions';
import { MentionNode } from './plugins/mentions/node';
import {
  MENTION_STORAGE_KEY,
  MentionSuggestion
} from './plugins/mentions/suggestion';
import { SlashCommands } from './plugins/slash-commands-extension';
import { EmojiSuggestion } from './plugins/suggestions';

type TTiptapInputProps = {
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  onChange?: (html: string) => void;
  onSubmit?: () => void;
  onGifSelect?: (gifUrl: string) => void;
  onCancel?: () => void;
  onTyping?: () => void;
  commands?: TCommandInfo[];
};

const TiptapInput = memo(
  ({
    value,
    onChange,
    onSubmit,
    onGifSelect,
    onCancel,
    onTyping,
    disabled,
    readOnly,
    commands
  }: TTiptapInputProps) => {
    const readOnlyRef = useRef(readOnly);

    readOnlyRef.current = readOnly;

    const [isExpanded, setIsExpanded] = useState(false);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const editorWrapperRef = useRef<HTMLDivElement>(null);

    const customEmojis = useCustomEmojis();
    const users = useMentionableUsers();

    const extensions = useMemo(
      () => [
        StarterKit.configure({
          hardBreak: {
            HTMLAttributes: {
              class: 'hard-break'
            }
          }
        }),
        Link.configure({
          autolink: true,
          defaultProtocol: 'https',
          openOnClick: false,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          },
          shouldAutoLink: (url) => {
            return /^https?:\/\//i.test(url);
          }
        }),
        Emoji.configure({
          emojis: ALL_EMOJIS as EmojiItem[],
          enableEmoticons: true,
          suggestion: EmojiSuggestion,
          HTMLAttributes: {
            class: 'emoji-image'
          }
        }),
        Mention.configure({
          users: [],
          suggestion: MentionSuggestion
        }),
        MentionNode,
        SlashCommands.configure({
          commands: [],
          suggestion: CommandSuggestion
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
      ],
      []
    );

    const editor = useEditor({
      extensions,
      content: value,
      editable: !disabled,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();

        onChange?.(html);

        if (!editor.isEmpty) {
          onTyping?.();
        }
      },
      editorProps: {
        handleKeyDown: (_view, event) => {
          // block all input when readOnly
          if (readOnlyRef.current) {
            event.preventDefault();
            return true;
          }

          const hasSuggestions = !!document.querySelector(
            '[data-editor-suggestion-active="true"]'
          );

          if (event.key === 'Enter') {
            if (event.shiftKey) {
              return false;
            }

            // if suggestions are active, don't handle Enter - let the suggestion handle it
            if (hasSuggestions) {
              return false;
            }

            event.preventDefault();
            onSubmit?.();
            return true;
          }

          if (event.key === 'Escape') {
            if (hasSuggestions) {
              return false;
            }

            event.preventDefault();
            onCancel?.();
            return true;
          }

          return false;
        },
        handleClickOn: (_view, _pos, _node, _nodePos, event) => {
          const target = event.target as HTMLElement;

          // prevents clicking on links inside the edit from opening them in the browser
          if (target.tagName === 'A') {
            event.preventDefault();

            return true;
          }

          return false;
        },
        handlePaste: () => !!readOnlyRef.current,
        handleDrop: () => readOnlyRef.current
      }
    });

    const handleEmojiSelect = (emoji: TEmojiItem) => {
      if (disabled || readOnly) return;

      if (emoji.shortcodes.length > 0) {
        editor?.chain().focus().setEmoji(emoji.shortcodes[0]).run();
      }
    };

    const handleGifSelect = (gifUrl: string) => {
      if (disabled || readOnly) return;

      if (onGifSelect) {
        onGifSelect(gifUrl);
        return;
      }

      if (!editor) return;
      editor.chain().focus().insertContent(`${gifUrl} `).run();
    };

    // keep emoji storage in sync with custom emojis from the store
    // this ensures newly added emojis appear in autocomplete without refreshing the app
    useEffect(() => {
      if (editor) {
        const allEmojis = [...ALL_EMOJIS, ...customEmojis] as EmojiItem[];

        if (editor.storage.emoji) {
          editor.storage.emoji.emojis = allEmojis;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const applyEmojiOptions = (extension: any) => {
          const typed = extension;

          if (typed.name === 'emoji' && typed.options) {
            typed.options.emojis = allEmojis;
          }
        };

        editor.extensionManager.extensions.forEach(applyEmojiOptions);
        editor.options.extensions?.forEach(applyEmojiOptions);
      }
    }, [editor, customEmojis]);

    // keep commands storage in sync with plugin commands from the store
    useEffect(() => {
      if (editor) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storage = editor.storage as any;
        if (storage[COMMANDS_STORAGE_KEY]) {
          storage[COMMANDS_STORAGE_KEY].commands = commands ?? [];
        }
      }
    }, [editor, commands]);

    // keep mention users storage in sync with the users from the store
    useEffect(() => {
      if (editor) {
        const storage = editor.storage as unknown as Record<
          string,
          { users?: typeof users }
        >;

        if (storage[MENTION_STORAGE_KEY]) {
          storage[MENTION_STORAGE_KEY].users = users;
        }
      }
    }, [editor, users]);

    useEffect(() => {
      if (editor && value !== undefined) {
        const currentContent = editor.getHTML();

        // only update if content is actually different to avoid cursor jumping
        if (currentContent !== value) {
          editor.commands.setContent(value);
        }
      }
    }, [editor, value]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [editor, disabled]);

    // Measure if content overflows (more than ~3 lines) when collapsed
    useLayoutEffect(() => {
      if (isExpanded) return;
      const wrapper = editorWrapperRef.current;
      const el = wrapper?.firstElementChild as HTMLElement | null;
      if (el) {
        setHasOverflow(el.scrollHeight > el.clientHeight);
      }
    }, [value, isExpanded]);

    const showExpandButton = hasOverflow || isExpanded;

    return (
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div
          ref={editorWrapperRef}
          className="relative flex min-w-0 flex-1"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <EditorContent
            editor={editor}
            className={`tiptap relative min-h-10 w-full overflow-auto rounded-xl border border-[#314055] bg-[#101926] p-2 text-[#d7e2f0] transition-[border-color,background-color,box-shadow] duration-200 focus-within:border-[#3d516b] focus-within:bg-[#162132] focus-within:shadow-[0_0_0_3px_rgba(32,107,196,0.12)] [&_.ProseMirror:focus]:outline-none ${
              isExpanded ? 'max-h-80' : 'max-h-20'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          />
          {showExpandButton && (isHovering || isFocused) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-1 left-1/2 h-5 w-8 shrink-0 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#314055] bg-[#172231] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#223146] hover:text-white"
              onClick={() => setIsExpanded((e) => !e)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          onGifSelect={handleGifSelect}
        >
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="h-9 w-9 rounded-lg border border-[#314055] !bg-[#172231] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#223146] hover:text-white"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </EmojiPicker>
      </div>
    );
  }
);

export { TiptapInput };


