import { RelativeTime } from '@/components/relative-time';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { useCan } from '@/features/server/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import {
  getClipboardTextFromRenderedEmojiHtml,
  isEmojiOnlyHtml,
  renderMessageTextWithEmojis
} from '@/helpers/message-emojis';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { imageExtensions, Permission, type TJoinedMessage } from '@connectmessager/shared';
import { Tooltip } from '@connectmessager/ui';
import parse, { Text } from 'html-react-parser';
import { memo, useCallback, useMemo, type ClipboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FileCard } from '../file-card';
import { MessageReactions } from '../message-reactions';
import { ImageOverride } from '../overrides/image';
import { serializer } from './serializer';
import type { TFoundMedia } from './types';

type TMessageRendererProps = {
  message: TJoinedMessage;
  disableFiles?: boolean;
  disableReactions?: boolean;
};

const MessageRenderer = memo(
  ({ message, disableFiles, disableReactions }: TMessageRendererProps) => {
    const { t } = useTranslation();
    const ownUserId = useOwnUserId();
    const can = useCan();
    const editedByUser = useUserById(message.editedBy ?? -1);
    const customEmojis = useCustomEmojis();
    const isOwnMessage = useMemo(
      () => message.userId === ownUserId,
      [message.userId, ownUserId]
    );
    const canRemoveFiles = useMemo(
      () => isOwnMessage || can(Permission.MANAGE_MESSAGES),
      [can, isOwnMessage]
    );

    const emojiOnly = useMemo(
      () => isEmojiOnlyHtml(message.content, customEmojis),
      [customEmojis, message.content]
    );
    const hasMessageText = useMemo(() => {
      const plainText = (message.content ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .trim();

      return plainText.length > 0;
    }, [message.content]);

    const { foundMedia, messageHtml } = useMemo(() => {
      const foundMedia: TFoundMedia[] = [];

      const messageHtml = parse(message.content ?? '', {
        replace: (domNode, index) => {
          if (domNode instanceof Text) {
            return renderMessageTextWithEmojis(
              domNode.data,
              customEmojis,
              `${message.id}-${index}`
            );
          }

          return serializer(domNode, (found) => foundMedia.push(found), message.id);
        }
      });

      return { messageHtml, foundMedia };
    }, [customEmojis, message.content, message.id]);

    const onCopy = useCallback(
      (event: ClipboardEvent<HTMLDivElement>) => {
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

        const plainText = getClipboardTextFromRenderedEmojiHtml(
          container.innerHTML,
          customEmojis
        );

        event.clipboardData.setData('text/plain', plainText);
        event.preventDefault();
      },
      [customEmojis]
    );

    const onRemoveFileClick = useCallback(
      async (fileId: number) => {
        if (!fileId) return;

        const choice = await requestConfirmation({
          title: t('deleteFileTitle'),
          message: t('deleteFileMsg'),
          confirmLabel: t('deleteLabel')
        });

        if (!choice) return;

        const trpc = getTRPCClient();

        try {
          await trpc.files.delete.mutate({
            fileId
          });

          toast.success(t('fileDeleted'));
        } catch {
          toast.error(t('failedDeleteFile'));
        }
      },
      [t]
    );

    const allMedia = useMemo(() => {
      const mediaFromFiles: TFoundMedia[] = message.files
        .filter((file) =>
          imageExtensions.includes(file.extension.toLowerCase())
        )
        .map((file) => ({
          type: 'image',
          url: getFileUrl(file),
          fileId: file.id
        }));

      return [...foundMedia, ...mediaFromFiles];
    }, [foundMedia, message.files]);

    const nonImageFiles = useMemo(
      () =>
        message.files.filter(
          (file) => !imageExtensions.includes(file.extension.toLowerCase())
        ),
      [message.files]
    );

    return (
      <div className="flex flex-col gap-1">
        {(hasMessageText || message.editedAt) && (
          <div
            onCopy={onCopy}
            className={cn(
              'prose max-w-full wrap-break-word msg-content',
              emojiOnly && 'emoji-only',
              message.editedAt && 'msg-edited'
            )}
          >
            {messageHtml}
            {message.editedAt && (
              <Tooltip
                content={
                  <div className="flex flex-col gap-1">
                    <RelativeTime date={new Date(message.editedAt)}>
                      {(relativeTime) => (
                        <span className="text-secondary text-xs">
                          {editedByUser
                            ? getRenderedUsername(editedByUser)
                            : t('unknownUser')}{' '}
                          {relativeTime}
                        </span>
                      )}
                    </RelativeTime>
                  </div>
                }
              >
                <span className="msg-edit ml-1 text-xs text-muted-foreground">
                  {t('edited')}
                </span>
              </Tooltip>
            )}
          </div>
        )}

        {allMedia.length > 0 && (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {allMedia.map((media, index) => {
              if (media.type === 'image') {
                return (
                  <div key={`media-image-${index}`} className="min-w-0">
                    <ImageOverride
                      src={media.url}
                      onRemove={
                        canRemoveFiles && media.fileId
                          ? () => onRemoveFileClick(media.fileId!)
                          : undefined
                      }
                    />
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {!disableReactions && (
          <MessageReactions
            reactions={message.reactions}
            messageId={message.id}
          />
        )}

        {nonImageFiles.length > 0 && !disableFiles && (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {nonImageFiles.map((file) => (
              <div key={file.id} className="min-w-0">
                <FileCard
                  name={file.originalName}
                  extension={file.extension}
                  size={file.size}
                  onRemove={
                    canRemoveFiles ? () => onRemoveFileClick(file.id) : undefined
                  }
                  href={getFileUrl(file)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

export { MessageRenderer };


