import { PinActionButton, PushPinIcon } from '@/components/pin-action-button';
import { RelativeTime } from '@/components/relative-time';
import { useSelectedChannelId } from '@/features/server/channels/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, type TJoinedMessage } from '@connectmessager/shared';
import { IconButton, Popover, PopoverContent, PopoverTrigger, Spinner, Tooltip } from '@connectmessager/ui';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MessagesGroup } from './messages-group';

type TPinnedMessageGroupWrapperProps = {
  message: TJoinedMessage;
  onScrollToMessage: (messageId: number) => void;
};

const PinnedMessageGroupWrapper = memo(
  ({ message, onScrollToMessage }: TPinnedMessageGroupWrapperProps) => {
    const { t } = useTranslation();
    const group = useMemo(() => [message], [message]);
    const user = useUserById(message.pinnedBy ?? 0);
    const pinnedDate = message.pinnedAt ? new Date(message.pinnedAt) : null;

    return (
      <div className="rounded-xl border border-[#2b3544] bg-[#101926] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="mb-2 flex items-center justify-between rounded-lg border border-[#314055] bg-[#172231] px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-[#8fa2bb]">
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#314055] bg-[#101926]">
              <PushPinIcon className="h-3.5 w-3.5 text-[#73a7ff]" />
            </div>
            <span>
              {t('pinnedBy', { name: user ? user.name : t('unknownUser') })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {pinnedDate ? (
              <RelativeTime date={pinnedDate}>
                {(relativeTime) => (
                  <span
                    className="text-xs text-[#8fa2bb]"
                    title={format(pinnedDate, 'PPpp')}
                  >
                    {relativeTime}
                  </span>
                )}
              </RelativeTime>
            ) : (
              <span className="text-xs text-[#8fa2bb]">
                {t('unknownTime')}
              </span>
            )}
            <Tooltip content={t('scrollToMessage')}>
              <IconButton
                icon={ArrowRight}
                size="xs"
                onClick={() => onScrollToMessage(message.id)}
                className="rounded-md border border-[#314055] bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
              />
            </Tooltip>
          </div>
        </div>
        <MessagesGroup
          group={group}
          disableActions
          disableFiles
          disableReactions
        />
      </div>
    );
  }
);

type TPinnedMessagesPopoverProps = {
  onScrollToMessage: (messageId: number) => Promise<void>;
};

const PinnedMessagesPopover = memo(
  ({ onScrollToMessage }: TPinnedMessagesPopoverProps) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState<TJoinedMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const selectedChannelId = useSelectedChannelId();

    const togglePinnedMessages = useCallback(() => {
      setIsOpen((prev) => !prev);
    }, []);

    const handleScrollToMessage = useCallback(
      (messageId: number) => {
        setIsOpen(false);
        onScrollToMessage(messageId);
      },
      [onScrollToMessage]
    );

    useEffect(() => {
      if (!isOpen || !selectedChannelId) return;

      let isCancelled = false;

      const loadPinnedMessages = async () => {
        setLoading(true);

        const trpc = getTRPCClient();

        try {
          const messages = await trpc.messages.getPinned.query({
            channelId: selectedChannelId
          });

          if (!isCancelled) {
            setPinnedMessages(messages);
          }
        } catch (error) {
          if (!isCancelled) {
            toast.error(getTrpcError(error, t('failedLoadPinnedMessages')));
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
      };

      loadPinnedMessages();

      return () => {
        isCancelled = true;
      };
    }, [isOpen, selectedChannelId, t]);

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <PinActionButton
            onClick={togglePinnedMessages}
            title={t('pinnedMessagesTitle')}
          />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          className="max-h-120 w-120 overflow-auto border border-[#314055] bg-[#182433] text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.45)]"
        >
          <div className="border-b border-[#2b3544] px-4 py-3 font-semibold text-white">
            {t('pinnedMessagesTitle')}
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-4 text-[#8fa2bb]">
              <Spinner size="xs" />
            </div>
          ) : (
            <div className="p-2">
              {pinnedMessages.length === 0 ? (
                <div className="p-4 text-sm text-[#8fa2bb]">
                  {t('noPinnedMessages')}
                </div>
              ) : (
                <div className="space-y-2">
                  {pinnedMessages.map((message) => (
                    <PinnedMessageGroupWrapper
                      key={message.id}
                      message={message}
                      onScrollToMessage={handleScrollToMessage}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);

export { PinnedMessagesPopover };


