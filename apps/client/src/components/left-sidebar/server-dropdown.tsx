import { openDialog, requestConfirmation } from '@/features/dialogs/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { disconnectFromServer } from '@/features/server/actions';
import { Permission } from '@connectmessager/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@connectmessager/ui';
import { Settings } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { ServerScreen } from '../server-screens/screens';

const ServerDropdownMenu = memo(() => {
  const { t } = useTranslation('sidebar');
  const serverSettingsPermissions = useMemo(
    () => [
      Permission.MANAGE_SETTINGS,
      Permission.MANAGE_ROLES,
      Permission.MANAGE_EMOJIS,
      Permission.MANAGE_STORAGE,
      Permission.MANAGE_USERS,
      Permission.MANAGE_INVITES,
      Permission.MANAGE_UPDATES
    ],
    []
  );

  const handleDisconnectClick = useCallback(async () => {
    const confirmed = await requestConfirmation({
      title: t('disconnectConfirmTitle'),
      message: t('disconnectConfirmMsg'),
      confirmLabel: t('disconnect')
    });

    if (confirmed) {
      disconnectFromServer();
    }
  }, [t]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg border border-[#314055] !bg-[#172231] text-[#8fa2bb] hover:!bg-[#1b2940] hover:border-[#3d516b] hover:text-white"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="border-[#314055] bg-[#172231] text-[#d7e2f0] shadow-[0_20px_48px_rgba(2,6,23,0.45)]">
        <DropdownMenuLabel className="text-white">{t('server')}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#314055]" />
        <Protect permission={Permission.MANAGE_CATEGORIES}>
          <DropdownMenuItem
            onClick={() => openDialog(Dialog.CREATE_CATEGORY)}
            className="text-[#8fa2bb] focus:bg-[#1b2940] focus:text-white"
          >
            {t('addCategory')}
          </DropdownMenuItem>
        </Protect>
        <Protect permission={serverSettingsPermissions}>
          <DropdownMenuItem
            onClick={() => openServerScreen(ServerScreen.SERVER_SETTINGS)}
            className="text-[#8fa2bb] focus:bg-[#1b2940] focus:text-white"
          >
            {t('serverSettings')}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#314055]" />
        </Protect>
        <DropdownMenuItem
          onClick={handleDisconnectClick}
          className="text-destructive focus:bg-red-500/10 focus:text-destructive"
        >
          {t('disconnect')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export { ServerDropdownMenu };


