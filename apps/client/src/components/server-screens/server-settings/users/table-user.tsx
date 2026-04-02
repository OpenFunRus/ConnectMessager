import { Dialog } from '@/components/dialogs/dialogs';
import { UserAvatar } from '@/components/user-avatar';
import { setModViewOpen } from '@/features/app/actions';
import { openDialog } from '@/features/dialogs/actions';
import { useUserRoles } from '@/features/server/hooks';
import { useOwnUserId, useUserStatus } from '@/features/server/users/hooks';
import { useDateLocale } from '@/hooks/use-date-locale';
import { cn } from '@/lib/utils';
import { UserStatus, type TJoinedUser } from '@connectmessager/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@connectmessager/ui';
import { format, formatDistanceToNow } from 'date-fns';
import { MoreVertical, Trash2, UserCog } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TTableUserProps = {
  user: TJoinedUser;
  refetch?: () => void;
};

const TableUser = memo(({ user, refetch }: TTableUserProps) => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const roles = useUserRoles(user.id);
  const status = useUserStatus(user.id);
  const ownUserId = useOwnUserId();

  const onModerateClick = useCallback(() => {
    setModViewOpen(true, user.id);
  }, [user.id]);

  const onDeleteClick = useCallback(() => {
    openDialog(Dialog.DELETE_USER, { user, refetch });
  }, [user, refetch]);

  return (
    <>
      <div
        key={user.id}
        className="grid min-w-max grid-cols-[60px_1fr_120px_120px_120px_80px_50px] gap-4 px-4 py-3 text-sm transition-colors hover:bg-[#16212f]"
      >
        <div className="flex items-center justify-center">
          <UserAvatar
            userId={user.id}
            className="h-8 w-8 flex-shrink-0"
            showUserPopover
          />
        </div>

        <div className="flex items-center min-w-0">
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate">
              {user.name}
            </div>
            {user.bio && (
              <div
                className="max-w-[20rem] truncate text-xs text-muted-foreground"
                title={user.bio}
              >
                {user.bio}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center min-w-0 gap-2">
          <span
            className="text-xs truncate text-muted-foreground"
            title={roles.map((role) => role.name).join(', ')}
          >
            {roles.map((role) => role.name).join(', ')}
          </span>
        </div>

        <div className="flex items-center text-muted-foreground">
          <span
            className="text-xs"
            title={format(user.createdAt, 'PPP p', { locale: dateLocale })}
          >
            {formatDistanceToNow(user.createdAt, {
              addSuffix: true,
              locale: dateLocale
            })}
          </span>
        </div>

        <div className="flex items-center text-muted-foreground">
          <span className="text-xs">
            {formatDistanceToNow(user.lastLoginAt, {
              addSuffix: true,
              locale: dateLocale
            })}
          </span>
        </div>

        <div className="flex items-center text-muted-foreground">
          <span
            className={cn('capitalize text-xs', {
              'text-green-500': status === UserStatus.ONLINE,
              'text-yellow-500': status === UserStatus.IDLE
            })}
          >
            {status}
          </span>
        </div>

        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 border border-[#314055] !bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onModerateClick}>
                <UserCog className="h-4 w-4" />
                {t('moderateUserAction')}
              </DropdownMenuItem>
              {ownUserId !== user.id && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDeleteClick}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('deleteUserAction', { defaultValue: t('deleteBtn') })}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
});

export { TableUser };


