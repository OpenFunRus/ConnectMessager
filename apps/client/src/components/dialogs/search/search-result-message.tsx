import { MessageRenderer } from '@/components/channel-view/text/renderer';
import { RelativeTime } from '@/components/relative-time';
import { UserAvatar } from '@/components/user-avatar';
import type { TMessageJumpToTarget } from '@/types';
import { IconButton, Tooltip } from '@connectmessager/ui';
import { ArrowRight, Hash } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TSearchResultMessage } from './types';

type TSearchResultMessageCardProps = {
  message: TSearchResultMessage;
  userName: string;
  onJump: (target: TMessageJumpToTarget) => void;
};

const SearchResultMessageCard = memo(
  ({ message, userName, onJump }: TSearchResultMessageCardProps) => {
    const { t } = useTranslation('dialogs');

    const handleJump = useCallback(() => {
      onJump({
        channelId: message.channelId,
        messageId: message.parentMessageId ?? message.id,
        isDm: message.channelIsDm
      });
    }, [onJump, message]);

    return (
      <div className="w-full overflow-hidden rounded-xl border border-[#314055] bg-[#172231] px-3 py-2 text-left">
        <div className="flex min-w-0 items-start gap-3">
          <UserAvatar userId={message.userId} className="h-7 w-7" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-[#8fa2bb]">
              <span className="max-w-55 truncate font-medium text-white">
                {userName}
              </span>
              <span>|</span>
              <RelativeTime date={new Date(message.createdAt)}>
                {(relativeTime) => <span>{relativeTime}</span>}
              </RelativeTime>
              <span>|</span>
              <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                <Hash className="h-3 w-3" />
                <span className="truncate wrap-anywhere">
                  {message.channelName}
                </span>
              </span>
              {!!message.parentMessageId && (
                <>
                  <span>|</span>
                  <span>{t('inThread')}</span>
                </>
              )}
            </div>
            <div className="mt-1 min-w-0 overflow-hidden">
              <div className="max-h-64 overflow-y-auto overflow-x-hidden pr-1">
                <MessageRenderer
                  message={message}
                  disableReactions
                  disableFiles
                />
              </div>
            </div>
          </div>
          <Tooltip
            content={
              message.parentMessageId
                ? t('jumpToThreadMessage')
                : t('jumpToMessage')
            }
          >
            <IconButton
              icon={ArrowRight}
              variant="ghost"
              size="sm"
              onClick={handleJump}
              className="rounded-lg border border-transparent text-[#8fa2bb] hover:border-[#314055] hover:bg-[#223146] hover:text-white"
            />
          </Tooltip>
        </div>
      </div>
    );
  }
);

export { SearchResultMessageCard };


