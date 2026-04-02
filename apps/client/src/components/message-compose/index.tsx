import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { TiptapInput } from '@/components/tiptap-input';
import { useChannelById } from '@/features/server/channels/hooks';
import {
  useCan,
  useChannelCan,
  usePublicServerSettings
} from '@/features/server/hooks';
import { useFlatPluginCommands } from '@/features/server/plugins/hooks';
import { useUploadFiles } from '@/hooks/use-upload-files';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedPublicUser, TTempFile } from '@connectmessager/shared';
import {
  ChannelPermission,
  MESSAGE_DEFAULT_LINES_LIMIT,
  MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT,
  Permission,
  PluginSlot,
  getMessageTextMetrics,
  isEmptyMessage
} from '@connectmessager/shared';
import { Button, Spinner } from '@connectmessager/ui';
import { filesize } from 'filesize';
import { Paperclip, Send } from 'lucide-react';
import {
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref
} from 'react';
import { useTranslation } from 'react-i18next';
import { FileCard } from '../channel-view/text/file-card';
import { UsersTypingIndicator } from '../channel-view/text/users-typing';

type TMessageComposeProps = {
  channelId: number;
  message: string;
  onMessageChange: (value: string) => void;
  onSend: (message: string, files: TTempFile[]) => Promise<boolean>;
  onTyping: () => void;
  typingUsers: TJoinedPublicUser[];
  showPluginSlot?: boolean;
  ref?: Ref<TMessageComposeHandle>;
};

type TMessageComposeHandle = {
  clearFiles: () => void;
};

const MessageCompose = memo(
  ({
    channelId,
    message,
    onMessageChange,
    onSend,
    onTyping,
    typingUsers,
    showPluginSlot = false,
    ref
  }: TMessageComposeProps) => {
    const { t } = useTranslation();
    const sendingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [sending, setSending] = useState(false);
    const can = useCan();
    const channelCan = useChannelCan(channelId);
    const channel = useChannelById(channelId);
    const publicSettings = usePublicServerSettings();
    const allPluginCommands = useFlatPluginCommands();

    const canSendMessages = useMemo(() => {
      return (
        can(Permission.SEND_MESSAGES) &&
        channelCan(ChannelPermission.SEND_MESSAGES)
      );
    }, [can, channelCan]);

    const canUploadFiles = useMemo(() => {
      const canShareFilesInDm =
        !channel?.isDm || !!publicSettings?.storageFileSharingInDirectMessages;

      return (
        can(Permission.SEND_MESSAGES) &&
        can(Permission.UPLOAD_FILES) &&
        channelCan(ChannelPermission.SEND_MESSAGES) &&
        canShareFilesInDm
      );
    }, [can, channelCan, channel, publicSettings]);

    const pluginCommands = useMemo(
      () =>
        can(Permission.EXECUTE_PLUGIN_COMMANDS) ? allPluginCommands : undefined,
      [can, allPluginCommands]
    );
    const { textLength, lineCount } = useMemo(
      () => getMessageTextMetrics(message),
      [message]
    );
    const maxTextLength =
      publicSettings?.messageMaxTextLength ?? MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT;
    const maxLines = publicSettings?.messageMaxLines ?? MESSAGE_DEFAULT_LINES_LIMIT;
    const displayedLineCount = Math.max(1, lineCount);
    const charsExceeded = textLength > maxTextLength;
    const linesExceeded = displayedLineCount > maxLines;

    const {
      files,
      removeFile,
      clearFiles,
      uploading,
      uploadingSize,
      openFileDialog,
      fileInputProps
    } = useUploadFiles(channelId, containerRef, !canSendMessages);

    useImperativeHandle(ref, () => ({ clearFiles }), [clearFiles]);

    const handleSend = useCallback(async () => {
      if (
        (isEmptyMessage(message) && !files.length) ||
        !canSendMessages ||
        sendingRef.current
      ) {
        return;
      }

      setSending(true);
      sendingRef.current = true;

      const maxFilesPerMessage =
        publicSettings?.storageMaxFilesPerMessage ?? Number.MAX_SAFE_INTEGER;
      const filesToSend = files.slice(0, Math.max(0, maxFilesPerMessage));

      const success = await onSend(message, filesToSend);

      sendingRef.current = false;
      setSending(false);

      if (success) {
        clearFiles();
      }
    }, [message, files, canSendMessages, onSend, clearFiles, publicSettings]);

    const handleGifSelect = useCallback(
      async (gifUrl: string) => {
        if (!gifUrl || uploading || !canSendMessages || sendingRef.current) {
          return;
        }

        setSending(true);
        sendingRef.current = true;

        try {
          await onSend(gifUrl, []);
        } finally {
          sendingRef.current = false;
          setSending(false);
        }
      },
      [uploading, canSendMessages, onSend]
    );

    const onRemoveFileClick = useCallback(
      async (fileId: string) => {
        removeFile(fileId);

        const trpc = getTRPCClient();

        try {
          trpc.files.deleteTemporary.mutate({ fileId });
        } catch {
          // ignore error
        }
      },
      [removeFile]
    );

    return (
      <div
        ref={containerRef}
        className="flex shrink-0 flex-col gap-2 border-t border-[#2b3544] bg-[#172231]/85 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-sm lg:px-4"
      >
        {uploading && (
          <div className="flex items-center gap-2">
            <div className="mb-1 text-xs text-[#8fa2bb]">
              Uploading files ({filesize(uploadingSize)})
            </div>
            <Spinner size="xxs" />
          </div>
        )}
        {files.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {files.map((file) => (
              <FileCard
                key={file.id}
                name={file.originalName}
                extension={file.extension}
                size={file.size}
                onRemove={() => onRemoveFileClick(file.id)}
              />
            ))}
          </div>
        )}
        <UsersTypingIndicator typingUsers={typingUsers} />
        <div className="flex items-center gap-2 rounded-xl border border-[#314055] bg-[#101926] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow] duration-200 hover:border-[#3d516b] focus-within:border-[#3d516b] focus-within:shadow-[0_0_0_3px_rgba(32,107,196,0.12)]">
          <TiptapInput
            value={message}
            onChange={onMessageChange}
            onSubmit={handleSend}
            onGifSelect={handleGifSelect}
            onTyping={onTyping}
            disabled={uploading || !canSendMessages}
            readOnly={sending}
            commands={pluginCommands}
          />
          {showPluginSlot && (
            <PluginSlotRenderer slotId={PluginSlot.CHAT_ACTIONS} />
          )}
          <input {...fileInputProps} />
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-lg border border-[#314055] !bg-[#172231] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#223146] hover:text-white"
            disabled={uploading || !canUploadFiles}
            onClick={openFileDialog}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-lg border border-[#314055] !bg-[#172231] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#223146] hover:text-white"
            onClick={handleSend}
            disabled={uploading || sending || !canSendMessages}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-end gap-3 px-1 text-[11px]">
          <span className={charsExceeded ? 'text-[#f97066]' : 'text-[#8fa2bb]'}>
            {t('messageCharsCounter', {
              current: textLength,
              max: maxTextLength
            })}
          </span>
          <span className={linesExceeded ? 'text-[#f97066]' : 'text-[#8fa2bb]'}>
            {t('messageLinesCounter', {
              current: displayedLineCount,
              max: maxLines
            })}
          </span>
        </div>
      </div>
    );
  }
);

export { MessageCompose, type TMessageComposeHandle };


