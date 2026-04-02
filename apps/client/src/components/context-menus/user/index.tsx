import {
  setDmsOpen,
  setModViewOpen,
  setSelectedDmChannelId
} from '@/features/app/actions';
import { useCan, usePublicServerSettings } from '@/features/server/hooks';
import { useIsOwnUser, useUserById } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  Permission,
  getTrpcError
} from '@connectmessager/shared';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@connectmessager/ui';
import { CircleUserRound, MessageSquare, UserCog } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TUserContextMenuProps = {
  children: React.ReactNode;
  userId: number;
  userName: string;
  onOpenInfo: () => void;
};

const UserContextMenu = memo(
  ({ children, userId, userName, onOpenInfo }: TUserContextMenuProps) => {
    const { t } = useTranslation(['sidebar', 'common']);
    const can = useCan();
    const settings = usePublicServerSettings();
    const user = useUserById(userId);
    const isOwnUser = useIsOwnUser(userId);

    const isDeleted = user?.name === DELETED_USER_IDENTITY_AND_NAME;
    const showDmAction =
      !!settings?.directMessagesEnabled && !isOwnUser && !isDeleted;
    const showModerationAction = can(Permission.MANAGE_USERS) && !isDeleted;

    const onDirectMessageClick = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const result = await trpc.dms.open.mutate({ userId });
        setDmsOpen(true);
        setSelectedDmChannelId(result.channelId);
      } catch (error) {
        toast.error(getTrpcError(error, t('sidebar:couldNotOpenDM')));
      }
    }, [userId, t]);

    const onOpenModeration = useCallback(() => {
      setModViewOpen(true, userId);
    }, [userId]);

    return (
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>{userName}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onOpenInfo}>
            <CircleUserRound />
            {t('sidebar:userInfoAction')}
          </ContextMenuItem>
          {showDmAction && (
            <ContextMenuItem onClick={() => void onDirectMessageClick()}>
              <MessageSquare />
              {t('common:directMessage')}
            </ContextMenuItem>
          )}
          {showModerationAction && (
            <ContextMenuItem onClick={onOpenModeration}>
              <UserCog />
              {t('common:moderationView')}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);

export { UserContextMenu };

