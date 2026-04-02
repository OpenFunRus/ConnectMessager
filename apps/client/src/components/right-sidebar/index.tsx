import { ResizableSidebar } from '@/components/resizable-sidebar';
import { UserAvatar } from '@/components/user-avatar';
import { UserContextMenu } from '@/components/context-menus/user';
import { useVisibleChatUsers } from '@/features/server/users/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPopover } from '../user-popover';

const MAX_USERS_TO_SHOW = 100;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 240; // w-60 = 240px

type TUserProps = {
  userId: number;
  name: string;
  banned: boolean;
};

const User = memo(({ userId, name, banned }: TUserProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const openInfoPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, []);

  return (
    <UserContextMenu
      userId={userId}
      userName={name}
      onOpenInfo={openInfoPopover}
    >
      <UserPopover
        userId={userId}
        open={isPopoverOpen}
        onOpenChange={setIsPopoverOpen}
      >
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 text-[#d7e2f0] transition-all hover:border-[#3d516b] hover:bg-[#1b2940]">
          <UserAvatar userId={userId} className="h-8 w-8 shrink-0" />
          <span
            className={cn(
              'truncate text-sm font-medium text-white',
              banned && 'line-through text-[#8fa2bb]'
            )}
          >
            {name}
          </span>
        </div>
      </UserPopover>
    </UserContextMenu>
  );
});

type TRightSidebarProps = {
  className?: string;
  isOpen?: boolean;
};

const RightSidebar = memo(
  ({ className, isOpen = true }: TRightSidebarProps) => {
    const { t } = useTranslation('sidebar');
    const users = useVisibleChatUsers();

    const { usersToShow, usersCount } = useMemo(() => {
      return {
        usersToShow: users.slice(0, MAX_USERS_TO_SHOW),
        usersCount: users.length
      };
    }, [users]);

    const hasHiddenUsers = users.length > MAX_USERS_TO_SHOW;

    return (
      <ResizableSidebar
        storageKey={LocalStorageKey.RIGHT_SIDEBAR_WIDTH}
        minWidth={MIN_WIDTH}
        maxWidth={MAX_WIDTH}
        defaultWidth={DEFAULT_WIDTH}
        edge="left"
        isOpen={isOpen}
        className={cn('h-full', className)}
      >
        <div className="flex h-14 items-center border-b border-[#2b3544] bg-[#172231]/90 px-4 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-white">
            {t('membersHeader', { count: usersCount })}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#182433] px-2 py-3">
          <div className="space-y-1.5">
            {usersToShow.map((user) => (
              <User
                key={user.id}
                userId={user.id}
                name={user.name}
                banned={user.banned}
              />
            ))}
            {hasHiddenUsers && (
              <div className="px-2 py-1.5 text-sm text-[#8fa2bb]">
                +{users.length - MAX_USERS_TO_SHOW} more...
              </div>
            )}
          </div>
        </div>
      </ResizableSidebar>
    );
  }
);

export { RightSidebar };


