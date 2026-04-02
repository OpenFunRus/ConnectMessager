import type { TDisconnectInfo } from '@/features/server/types';
import { DisconnectCode } from '@connectmessager/shared';
import { Button } from '@connectmessager/ui';
import { AlertCircle, Gavel, RefreshCw, WifiOff } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type TDisconnectedProps = {
  info: TDisconnectInfo;
};

const Disconnected = memo(({ info }: TDisconnectedProps) => {
  const { t } = useTranslation('disconnected');

  const disconnectType = useMemo(() => {
    const code = info.code;

    if (code === DisconnectCode.KICKED) {
      return {
        icon: <AlertCircle className="h-8 w-8 text-[#d9a441]" />,
        title: t('kicked'),
        message: info.reason || t('noReasonProvided'),
        canReconnect: true
      };
    }

    if (code === DisconnectCode.BANNED) {
      return {
        icon: <Gavel className="h-8 w-8 text-[#d35d6e]" />,
        title: t('banned'),
        message: info.reason || t('noReasonProvided'),
        canReconnect: false
      };
    }

    return {
      icon: <WifiOff className="h-8 w-8 text-[#8fa2bb]" />,
      title: t('connectionLost'),
      message: t('lostConnectionMessage'),
      canReconnect: true
    };
  }, [info, t]);

  const handleReconnect = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1220] px-6 py-10 text-[#d7e2f0]">
      <div className="w-full max-w-md rounded-2xl border border-[#2b3544] bg-[#182433] px-6 py-8 text-center shadow-[0_30px_80px_rgba(3,8,20,0.55)]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#314055] bg-[#101926] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {disconnectType.icon}
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">
            {disconnectType.title}
          </h1>
          <p className="text-sm leading-relaxed text-[#9fb2c8]">
            {disconnectType.message}
          </p>
        </div>

        {disconnectType.canReconnect && (
          <Button
            onClick={handleReconnect}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg border border-[#2f7ad1] bg-[#206bc4] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-[#3b82d6] hover:bg-[#1b5dab]"
          >
            <RefreshCw className="h-4 w-4" />
            {t('reloadPage')}
          </Button>
        )}
      </div>
    </div>
  );
});

export { Disconnected };


