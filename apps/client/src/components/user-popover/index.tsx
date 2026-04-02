import {
  setDmsOpen,
  setModViewOpen,
  setSelectedDmChannelId
} from '@/features/app/actions';
import { usePublicServerSettings, useUserRoles } from '@/features/server/hooks';
import { useIsOwnUser, useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { useDateLocale } from '@/hooks/use-date-locale';
import { getTRPCClient } from '@/lib/trpc';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  Permission,
  UserStatus,
  getTrpcError
} from '@connectmessager/shared';
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@connectmessager/ui';
import { format } from 'date-fns';
import { MessageSquare, ShieldCheck, Trash, UserCog } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Protect } from '../protect';
import { RoleBadge } from '../role-badge';
import { UserAvatar } from '../user-avatar';
import { UserStatusBadge } from '../user-status';

type TUserPopoverProps = {
  userId: number;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const UserPopover = memo(
  ({ userId, children, open, onOpenChange }: TUserPopoverProps) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const user = useUserById(userId);
  const roles = useUserRoles(userId);
  const settings = usePublicServerSettings();
  const isOwnUser = useIsOwnUser(userId);

  const onDirectMessageClick = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      const result = await trpc.dms.open.mutate({ userId });

      setDmsOpen(true);
      setSelectedDmChannelId(result.channelId);
    } catch (error) {
      toast.error(getTrpcError(error, t('couldNotOpenDM')));
    }
  }, [userId, t]);

  if (!user) return <>{children}</>;

  const isDeleted = user.name === DELETED_USER_IDENTITY_AND_NAME;
  const showDmButton =
    settings?.directMessagesEnabled && !isDeleted && !isOwnUser;

    return (
      <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-80 border border-[#314055] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.45)]"
        align="start"
        side="right"
      >
        <div className="relative">
          {user.banned && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-[#a9485a] bg-[#2b1720] px-2 py-1 text-xs font-medium text-[#ffe0e6]">
              <ShieldCheck className="h-3 w-3" />
              {t('bannedBadge')}
            </div>
          )}
          {isDeleted && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-[#4a586d] bg-[#1b2432] px-2 py-1 text-xs font-medium text-[#d7e2f0]">
              <Trash className="h-3 w-3" />
              {t('deletedBadge')}
            </div>
          )}
          {user.banner ? (
            <div
              className="h-24 w-full rounded-t-xl bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url("${getFileUrl(user.banner)}")`
              }}
            />
          ) : (
            <div
              className="h-24 w-full rounded-t-xl"
              style={{
                background: user.bannerColor || '#5865f2'
              }}
            />
          )}
          <div className="absolute left-4 top-16">
            <UserAvatar
              userId={user.id}
              className="h-16 w-16 border-4 border-[#182433] shadow-[0_10px_24px_rgba(2,6,23,0.35)]"
              showStatusBadge={false}
            />
          </div>
        </div>

        <div className="px-4 pt-12 pb-4">
          <div className="mb-3">
            <span className="mb-1 block truncate text-lg font-semibold text-white">
              {getRenderedUsername(user)}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <UserStatusBadge
                  status={user.status || UserStatus.OFFLINE}
                  className="h-3 w-3"
                />
                <span className="text-xs capitalize text-[#9fb2c8]">
                  {user.status || UserStatus.OFFLINE}
                </span>
              </div>
            </div>
          </div>

          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {roles.map((role) => (
                <RoleBadge key={role.id} role={role} />
              ))}
            </div>
          )}

          {user.bio && (
            <div className="mt-3">
              <p className="text-sm leading-relaxed text-[#d7e2f0]">
                {user.bio}
              </p>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-[#2b3544] pt-3">
            <p className="text-xs text-[#8fa2bb]">
              {t('memberSince', {
                date: format(new Date(user.createdAt), 'PP', {
                  locale: dateLocale
                })
              })}
            </p>

            <div className="flex items-center gap-2">
              {showDmButton && (
                <IconButton
                  icon={MessageSquare}
                  variant="ghost"
                  size="sm"
                  onClick={onDirectMessageClick}
                  className="h-8 w-8 rounded-lg border border-[#314055] !bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
                  title={t('directMessage')}
                />
              )}

              {
                <Protect permission={Permission.MANAGE_USERS}>
                  <IconButton
                    icon={UserCog}
                    variant="ghost"
                    size="sm"
                    title={t('moderationView')}
                    onClick={() => setModViewOpen(true, user.id)}
                    className="h-8 w-8 rounded-lg border border-[#314055] !bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
                  />
                </Protect>
              }
            </div>
          </div>
        </div>
      </PopoverContent>
      </Popover>
    );
  }
);

UserPopover.displayName = 'UserPopover';

export { UserPopover };


