import { useChannelById } from '@/features/server/channels/hooks';
import { ChannelType } from '@connectmessager/shared';
import { IconButton } from '@connectmessager/ui';
import { Hash, Volume2, X } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PinnedMessagesPopover } from './pinned-messages-popover';

type TTextTopbarProps = {
  onScrollToMessage: (messageId: number) => Promise<void>;
  channelId: number;
  onClose?: () => void;
};

const TextTopbar = memo(
  ({ onScrollToMessage, channelId, onClose }: TTextTopbarProps) => {
    const { t } = useTranslation('common');
    const channel = useChannelById(channelId);
    const channelName = channel?.isDm ? t('directMessage') : channel?.name;

    return (
      <div className="flex h-14 w-auto overflow-hidden border-b border-[#2b3544] bg-[#172231]/90 backdrop-blur-sm">
        <div className="flex w-full items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            {channel?.type === ChannelType.TEXT ? (
              <Hash className="inline-block h-4 w-4 text-[#8fa2bb]" />
            ) : (
              <Volume2 className="inline-block h-4 w-4 text-[#8fa2bb]" />
            )}
            <span className="max-w-40 truncate text-sm font-semibold text-white">
              {channelName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#8fa2bb]">
            <PinnedMessagesPopover onScrollToMessage={onScrollToMessage} />
            {onClose && (
              <IconButton
                onClick={onClose}
                icon={X}
                variant="ghost"
                size="sm"
                className="rounded-lg border border-transparent text-[#8fa2bb] hover:border-[#314055] hover:bg-[#223146] hover:text-white"
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

export { TextTopbar };


