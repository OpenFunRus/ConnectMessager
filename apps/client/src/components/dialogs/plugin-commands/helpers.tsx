import {
  useCurrentVoiceChannelId,
  useSelectedChannelId
} from '@/features/server/channels/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const Helpers = memo(() => {
  const { t } = useTranslation('dialogs');
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const selectedChannelId = useSelectedChannelId();
  const ownUserId = useOwnUserId();

  return (
    <div className="w-80 border-l flex flex-col">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">{t('helperValuesTitle')}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t('helperValuesDesc')}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t('yourUserId')}
            </span>
            <div className="mt-1 px-3 py-2 rounded-md bg-muted font-mono text-sm break-all">
              {ownUserId ?? (
                <span className="text-muted-foreground italic">{t('notLoaded')}</span>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t('currentVoiceChannelId')}
            </span>
            <div className="mt-1 px-3 py-2 rounded-md bg-muted font-mono text-sm break-all">
              {currentVoiceChannelId ?? (
                <span className="text-muted-foreground italic">
                  {t('notInVoiceChannel')}
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t('selectedChannelId')}
            </span>
            <div className="mt-1 px-3 py-2 rounded-md bg-muted font-mono text-sm break-all">
              {selectedChannelId ?? (
                <span className="text-muted-foreground italic">
                  {t('noChannelSelected')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export { Helpers };
