import { MessageCompose } from '@/components/message-compose';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { canonicalizeMessageEmojiHtml } from '@/helpers/message-emojis';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedPublicUser } from '@connectmessager/shared';
import {
  MESSAGE_DEFAULT_LINES_LIMIT,
  MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT,
  TYPING_MS,
  getMessageContentLimitError,
  getTrpcError,
  prepareMessageHtml
} from '@connectmessager/shared';
import { throttle } from 'lodash-es';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

type TThreadComposeProps = {
  parentMessageId: number;
  channelId: number;
  typingUsers: TJoinedPublicUser[];
};

const ThreadCompose = memo(
  ({ parentMessageId, channelId, typingUsers }: TThreadComposeProps) => {
    const [newMessage, setNewMessage] = useState('');
    const customEmojis = useCustomEmojis();
    const publicSettings = usePublicServerSettings();

    const sendTypingSignal = useMemo(
      () =>
        throttle(async () => {
          const trpc = getTRPCClient();

          try {
            await trpc.messages.signalTyping.mutate({
              channelId,
              parentMessageId
            });
          } catch {
            // ignore
          }
        }, TYPING_MS),
      [channelId, parentMessageId]
    );

    const onSend = useCallback(
      async (message: string, files: { id: string }[]) => {
        sendTypingSignal.cancel();

        const trpc = getTRPCClient();
        const preparedContent = prepareMessageHtml(
          canonicalizeMessageEmojiHtml(message, customEmojis)
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
          return false;
        }

        if (contentLimitError === 'MAX_LINES') {
          toast.error(`Message cannot exceed ${maxLines} lines.`);
          return false;
        }

        try {
          await trpc.messages.send.mutate({
            content: preparedContent,
            channelId,
            files: files.map((f) => f.id),
            parentMessageId
          });

          playSound(SoundType.MESSAGE_SENT);
        } catch (error) {
          toast.error(getTrpcError(error, 'Failed to send reply'));
          return false;
        }

        setNewMessage('');
        return true;
      },
      [
        channelId,
        customEmojis,
        parentMessageId,
        publicSettings?.messageMaxLines,
        publicSettings?.messageMaxTextLength,
        sendTypingSignal
      ]
    );

    return (
      <MessageCompose
        channelId={channelId}
        message={newMessage}
        onMessageChange={setNewMessage}
        onSend={onSend}
        onTyping={sendTypingSignal}
        typingUsers={typingUsers}
      />
    );
  }
);

export { ThreadCompose };


