import { TiptapInput } from '@/components/tiptap-input';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { canonicalizeMessageEmojiHtml } from '@/helpers/message-emojis';
import { getTRPCClient } from '@/lib/trpc';
import {
  MESSAGE_DEFAULT_LINES_LIMIT,
  MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT,
  type TMessage,
  getMessageContentLimitError,
  getTrpcError,
  isEmptyMessage,
  prepareMessageHtml
} from '@connectmessager/shared';
import { AutoFocus } from '@connectmessager/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TMessageEditInlineProps = {
  message: TMessage;
  onBlur: () => void;
};

const MessageEditInline = memo(
  ({ message, onBlur }: TMessageEditInlineProps) => {
    const { t } = useTranslation();
    const [value, setValue] = useState<string>(message.content ?? '');
    const customEmojis = useCustomEmojis();
    const publicSettings = usePublicServerSettings();

    const onSubmit = useCallback(
      async (newValue: string | undefined) => {
        if (!newValue || isEmptyMessage(newValue)) {
          toast.error(t('messageCannotBeEmpty'));

          onBlur();

          return;
        }

        const preparedContent = prepareMessageHtml(
          canonicalizeMessageEmojiHtml(newValue, customEmojis)
        );
        const maxTextLength =
          publicSettings?.messageMaxTextLength ??
          MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT;
        const maxLines =
          publicSettings?.messageMaxLines ?? MESSAGE_DEFAULT_LINES_LIMIT;
        const contentLimitError = getMessageContentLimitError(preparedContent, {
          textLengthLimit: maxTextLength,
          linesLimit: maxLines
        });

        if (contentLimitError === 'MAX_LENGTH') {
          toast.error(`Message cannot exceed ${maxTextLength} characters.`);
          onBlur();
          return;
        }

        if (contentLimitError === 'MAX_LINES') {
          toast.error(`Message cannot exceed ${maxLines} lines.`);
          onBlur();
          return;
        }

        const trpc = getTRPCClient();

        try {
          await trpc.messages.edit.mutate({
            messageId: message.id,
            content: preparedContent
          });

          toast.success(t('messageEdited'));
        } catch (error) {
          toast.error(getTrpcError(error, t('failedEditMessage')));
        } finally {
          onBlur();
        }
      },
      [
        customEmojis,
        message.id,
        onBlur,
        publicSettings?.messageMaxLines,
        publicSettings?.messageMaxTextLength,
        t
      ]
    );

    return (
      <div className="flex flex-col gap-2">
        <AutoFocus>
          <TiptapInput
            value={value}
            onChange={setValue}
            onSubmit={() => onSubmit(value)}
            onCancel={onBlur}
          />
        </AutoFocus>
        <span className="text-xs text-primary/60">{t('pressEnterToSave')}</span>
      </div>
    );
  }
);

export { MessageEditInline };


