import { openThreadSidebar } from '@/features/app/actions';
import { useThreadSidebar } from '@/features/app/hooks';
import { useCan } from '@/features/server/hooks';
import { useIsOwnUser, useOwnUserId } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { hasMention, Permission, type TJoinedMessage } from '@connectmessager/shared';
import { MessageSquareText } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageActions } from './message-actions';
import { MessageEditInline } from './message-edit-inline';
import { MessageRenderer } from './renderer';

type TMessageProps = {
  message: TJoinedMessage;
  disableActions?: boolean;
  disableFiles?: boolean;
  disableReactions?: boolean;
};

const Message = memo(
  ({
    message,
    disableActions,
    disableFiles,
    disableReactions
  }: TMessageProps) => {
    const { t } = useTranslation('common');
    const [isEditing, setIsEditing] = useState(false);
    const isFromOwnUser = useIsOwnUser(message.userId);
    const can = useCan();
    const { isOpen: isThreadOpen, parentMessageId: threadParentId } =
      useThreadSidebar();
    const ownUserId = useOwnUserId();

    const canManage = useMemo(
      () => can(Permission.MANAGE_MESSAGES) || isFromOwnUser,
      [can, isFromOwnUser]
    );

    const isMentioned = useMemo(
      () => hasMention(message.content, ownUserId),
      [message.content, ownUserId]
    );

    const isThreadReply = !!message.parentMessageId;
    const replyCount = message.replyCount ?? 0;
    const isActiveThread = isThreadOpen && threadParentId === message.id;

    const onThreadClick = useCallback(() => {
      openThreadSidebar(message.id, message.channelId);
    }, [message.id, message.channelId]);

    return (
      <div
        className={cn(
          'relative ml-1 min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 transition-all duration-200 group hover:border-[#314055] hover:bg-[#223146]',
          isActiveThread && 'border-[#2f7ad1]/35 bg-[#206bc4]/12',
          isMentioned &&
            'border-[#8a6a18]/45 bg-[#5c4508]/16 shadow-[inset_3px_0_0_#dba420]'
        )}
        data-message-id={message.id}
      >
        {!isEditing ? (
          <>
            <MessageRenderer
              message={message}
              disableFiles={disableFiles}
              disableReactions={disableReactions}
            />
            {!isThreadReply && replyCount > 0 && (
              <button
                type="button"
                onClick={onThreadClick}
                className="mt-1 flex items-center gap-1 text-xs text-[#7fb4f0] transition-colors hover:text-[#a8ceff] hover:underline"
              >
                <MessageSquareText className="h-3 w-3" />
                <span>{t('reply', { count: replyCount })}</span>
              </button>
            )}
            {!disableActions && (
              <MessageActions
                onEdit={() => setIsEditing(true)}
                canManage={canManage}
                messageId={message.id}
                channelId={message.channelId}
                editable={message.editable ?? false}
                isPinned={message.pinned ?? false}
                disablePin={!!message.parentMessageId}
                isThreadReply={isThreadReply}
              />
            )}
          </>
        ) : (
          <MessageEditInline
            message={message}
            onBlur={() => setIsEditing(false)}
          />
        )}
      </div>
    );
  }
);

export { Message };


