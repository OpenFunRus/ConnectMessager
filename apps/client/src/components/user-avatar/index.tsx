import { useUserById } from '@/features/server/users/hooks';
import { getAvatarFallbackStyle } from '@/helpers/get-avatar-fallback-style';
import { getFileUrl } from '@/helpers/get-file-url';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { cn } from '@/lib/utils';
import { AvatarImage } from '@radix-ui/react-avatar';
import { UserStatus } from '@connectmessager/shared';
import { Avatar, AvatarFallback } from '@connectmessager/ui';
import { memo } from 'react';
import { UserPopover } from '../user-popover';
import { UserStatusBadge } from '../user-status';

type TUserAvatarProps = {
  userId: number;
  className?: string;
  showUserPopover?: boolean;
  showStatusBadge?: boolean;
  onClick?: () => void;
};

const UserAvatar = memo(
  ({
    userId,
    className,
    showUserPopover = false,
    showStatusBadge = true,
    onClick
  }: TUserAvatarProps) => {
    const user = useUserById(userId);

    if (!user) return null;

    const renderedUsername = getRenderedUsername(user);
    const fallbackStyle = getAvatarFallbackStyle(renderedUsername);

    const content = (
      <div className="relative w-fit h-fit" onClick={onClick}>
        <Avatar className={cn('h-8 w-8', className)}>
          <AvatarImage src={getFileUrl(user.avatar)} key={user.avatarId} />
          <AvatarFallback
            className="text-xs font-semibold"
            style={fallbackStyle}
          >
            {getInitialsFromName(renderedUsername)}
          </AvatarFallback>
        </Avatar>
        {showStatusBadge && (
          <UserStatusBadge
            status={user.status || UserStatus.OFFLINE}
            className="absolute bottom-0 right-0"
          />
        )}
      </div>
    );

    if (!showUserPopover) return content;

    return <UserPopover userId={userId}>{content}</UserPopover>;
  }
);

export { UserAvatar };


