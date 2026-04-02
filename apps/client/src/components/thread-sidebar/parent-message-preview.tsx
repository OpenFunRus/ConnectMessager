import { useThreadSidebar } from '@/features/app/hooks';
import { useParentMessage } from '@/features/server/messages/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import type { TJoinedMessage } from '@connectmessager/shared';
import { Spinner } from '@connectmessager/ui';
import { memo } from 'react';
import { MessageRenderer } from '../channel-view/text/renderer';
import { UserAvatar } from '../user-avatar';

type TParentMessageContentProps = {
  parentMessage: TJoinedMessage;
};

const ParentMessageContent = memo(
  ({ parentMessage }: TParentMessageContentProps) => {
    const user = useUserById(parentMessage.userId);

    if (!user) {
      return null;
    }

    return (
      <div className="max-h-64 overflow-auto border-b border-[#2b3544] bg-[#172231]/92 px-4 py-3 shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)]">
        <div className="mb-1 flex items-center gap-2">
          <UserAvatar
            userId={parentMessage.userId}
            className="h-8 w-8"
            showUserPopover
          />
          <span className="text-sm font-medium text-white">
            {getRenderedUsername(user)}
          </span>
        </div>
        <div className="line-clamp-3 text-sm text-[#b6c6d8]">
          <MessageRenderer message={parentMessage} />
        </div>
      </div>
    );
  }
);

type TParentMessagePreviewProps = {
  messageId: number;
};

const ParentMessagePreview = memo(
  ({ messageId }: TParentMessagePreviewProps) => {
    const { channelId } = useThreadSidebar();
    const parentMessage = useParentMessage(messageId, channelId);

    if (!parentMessage) {
      return (
        <div className="flex items-center gap-2 border-b border-[#2b3544] bg-[#172231]/92 px-4 py-3 text-[#8fa2bb]">
          <Spinner size="xs" />
          <span className="text-sm">
            Loading message...
          </span>
        </div>
      );
    }

    return <ParentMessageContent parentMessage={parentMessage} />;
  }
);

export { ParentMessagePreview };


