import { EmojiPicker } from '@/components/emoji-picker';
import { useRecentEmojis } from '@/components/emoji-picker/use-recent-emojis';
import { PushPinIcon } from '@/components/pin-action-button';
import { Protect } from '@/components/protect';
import {
  shouldUseFallbackImage,
  type TEmojiItem
} from '@/components/tiptap-input/helpers';
import { openThreadSidebar } from '@/features/app/actions';
import { requestConfirmation } from '@/features/dialogs/actions';
import { getTRPCClient } from '@/lib/trpc';
import { Permission } from '@connectmessager/shared';
import { IconButton } from '@connectmessager/ui';
import {
  MessageSquareText,
  Pencil,
  Smile,
  Trash
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const MAX_QUICK_EMOJIS = 4;

type TMessageActionsProps = {
  messageId: number;
  channelId: number;
  onEdit: () => void;
  canManage: boolean;
  editable: boolean;
  isThreadReply?: boolean;
  isPinned?: boolean;
  disablePin?: boolean;
};

const MessageActions = memo(
  ({
    onEdit,
    messageId,
    channelId,
    canManage,
    editable,
    isThreadReply,
    isPinned,
    disablePin
  }: TMessageActionsProps) => {
    const { t } = useTranslation();
    const { recentEmojis } = useRecentEmojis();
    const recentEmojisToShow = useMemo(
      () => recentEmojis.slice(0, MAX_QUICK_EMOJIS),
      [recentEmojis]
    );

    const onDeleteClick = useCallback(async () => {
      const choice = await requestConfirmation({
        title: t('deleteMessageTitle'),
        message: t('deleteMessageConfirm'),
        confirmLabel: t('deleteLabel'),
        cancelLabel: t('cancel'),
        variant: 'danger'
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.messages.delete.mutate({ messageId });
        toast.success(t('messageDeleted'));
      } catch {
        toast.error(t('failedDeleteMessage'));
      }
    }, [messageId, t]);

    const onEmojiSelect = useCallback(
      async (emoji: TEmojiItem) => {
        const trpc = getTRPCClient();

        try {
          await trpc.messages.toggleReaction.mutate({
            messageId,
            emoji: emoji.shortcodes[0]
          });
        } catch (error) {
          toast.error(t('failedAddReaction'));

          console.error('Error adding reaction:', error);
        }
      },
      [messageId, t]
    );

    const onReplyClick = useCallback(() => {
      openThreadSidebar(messageId, channelId);
    }, [messageId, channelId]);

    const onPinClick = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        await trpc.messages.togglePin.mutate({ messageId });

        toast.success(t('messagePinToggled'));
      } catch (error) {
        toast.error(t('failedTogglePin'));

        console.error('Error toggling pin status:', error);
      }
    }, [messageId, t]);

    return (
      <div className="absolute right-0 -top-6 z-10 hidden items-center gap-1 rounded-xl border border-[#314055] bg-[#172231] p-1.5 shadow-[0_16px_40px_rgba(2,6,23,0.45)] transition-all group-hover:flex [&:has([data-state=open])]:flex">
        {!isThreadReply && (
          <IconButton
            size="sm"
            variant="ghost"
            icon={MessageSquareText}
            onClick={onReplyClick}
            title={t('replyInThread')}
              className="rounded-lg border border-transparent text-[#8fa2bb] hover:border-transparent hover:bg-transparent hover:text-white"
          />
        )}
        {canManage && (
          <>
            <IconButton
              size="sm"
              variant="ghost"
              icon={Pencil}
              onClick={onEdit}
              disabled={!editable}
              title={t('editMessage')}
              className="rounded-lg border border-transparent text-[#8fa2bb] hover:border-transparent hover:bg-transparent hover:text-white"
            />

            <IconButton
              size="sm"
              variant="ghost"
              icon={Trash}
              onClick={onDeleteClick}
              title={t('deleteMessageTitle')}
              className="rounded-lg border border-transparent text-[#8fa2bb] hover:border-transparent hover:bg-transparent hover:text-white"
            />
          </>
        )}
        {!disablePin && (
          <Protect permission={Permission.PIN_MESSAGES}>
            <button
              type="button"
              onClick={onPinClick}
              aria-label={isPinned ? t('unpinMessage') : t('pinMessage')}
              title={isPinned ? t('unpinMessage') : t('pinMessage')}
              className={
                isPinned
                  ? 'inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent text-[#73a7ff] outline-none transition-all hover:text-white [&_svg]:pointer-events-none [&_svg]:shrink-0'
                  : 'inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent text-[#8fa2bb] outline-none transition-all hover:text-white [&_svg]:pointer-events-none [&_svg]:shrink-0'
              }
            >
              <PushPinIcon className="h-4 w-4" />
            </button>
          </Protect>
        )}

        <div className="flex items-center gap-1 border-l border-[#314055] pl-1.5">
          {recentEmojisToShow.map((emoji) => (
            <button
              key={emoji.name}
              type="button"
              onClick={() => onEmojiSelect(emoji)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-md text-[#d7e2f0] transition-colors hover:bg-transparent"
              title={`:${emoji.shortcodes[0]}:`}
            >
              {emoji.emoji && !shouldUseFallbackImage(emoji) ? (
                <span>{emoji.emoji}</span>
              ) : emoji.fallbackImage ? (
                <img
                  src={emoji.fallbackImage}
                  alt={emoji.name}
                  className="w-5 h-5 object-contain"
                />
              ) : null}
            </button>
          ))}

          <EmojiPicker onEmojiSelect={onEmojiSelect}>
            <IconButton
              variant="ghost"
              icon={Smile}
              title={t('addReaction')}
              className="rounded-lg border border-transparent text-[#8fa2bb] hover:border-transparent hover:bg-transparent hover:text-white"
            />
          </EmojiPicker>
        </div>
      </div>
    );
  }
);

export { MessageActions };


