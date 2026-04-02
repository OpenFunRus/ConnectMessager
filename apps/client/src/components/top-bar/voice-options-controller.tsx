import {
  setHideNonVideoParticipants,
  setShowUserBannersInVoice
} from '@/features/server/voice/actions';
import {
  useHideNonVideoParticipants,
  useShowUserBannersInVoice
} from '@/features/server/voice/hooks';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
  Tooltip
} from '@connectmessager/ui';
import { Settings } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const VoiceOptionsController = memo(() => {
  const { t } = useTranslation('topbar');
  const hideNonVideoParticipants = useHideNonVideoParticipants();
  const showUserBanners = useShowUserBannersInVoice();

  const handleToggleHideNonVideo = useCallback((checked: boolean) => {
    setHideNonVideoParticipants(checked);
  }, []);

  const handleToggleShowUserBanners = useCallback((checked: boolean) => {
    setShowUserBannersInVoice(checked);
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 rounded-lg border border-[#314055] !bg-[#172231] px-2.5 text-[#8fa2bb] transition-all duration-200 ease-in-out hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
        >
          <Tooltip content={t('voiceOptions')} asChild={false}>
            <Settings className="w-4 h-4" />
          </Tooltip>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 border border-[#314055] bg-[#182433] text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.45)]"
      >
        <div className="space-y-3">
          <h4 className="mb-3 cursor-default text-sm font-medium text-white">
            {t('voiceOptions')}
          </h4>

          <div className="flex items-center justify-between space-x-3 rounded-xl border border-[#2b3544] bg-[#101926] px-3 py-2.5">
            <span
              onClick={() =>
                handleToggleHideNonVideo(!hideNonVideoParticipants)
              }
              className="flex-1 cursor-pointer select-none text-sm text-[#d7e2f0]"
            >
              {t('hideNonVideoParticipants')}
            </span>
            <Switch
              id="hide-non-video"
              checked={hideNonVideoParticipants}
              onCheckedChange={handleToggleHideNonVideo}
              data-1p-ignore
              data-lpignore="true"
            />
          </div>

          <div className="flex items-center justify-between space-x-3 rounded-xl border border-[#2b3544] bg-[#101926] px-3 py-2.5">
            <span
              onClick={() => handleToggleShowUserBanners(!showUserBanners)}
              className="flex-1 cursor-pointer select-none text-sm text-[#d7e2f0]"
            >
              {t('displayUserBanners')}
            </span>
            <Switch
              id="show-user-banners"
              checked={showUserBanners}
              onCheckedChange={handleToggleShowUserBanners}
              data-1p-ignore
              data-lpignore="true"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

VoiceOptionsController.displayName = 'VoiceOptionsController';

export { VoiceOptionsController };


