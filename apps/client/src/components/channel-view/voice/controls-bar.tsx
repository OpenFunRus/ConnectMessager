import { useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import { useOwnVoiceState, useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission } from '@connectmessager/shared';
import { Button } from '@connectmessager/ui';
import {
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  ScreenShareOff,
  Video,
  VideoOff
} from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ControlToggleButton } from './control-toggle-button';
import { useControlsBarVisibility } from './hooks/use-controls-bar-visibility';

type TControlsBarProps = {
  channelId: number;
};

const ControlsBar = memo(({ channelId }: TControlsBarProps) => {
  const { t } = useTranslation(['sidebar', 'common']);
  const { toggleMic, toggleWebcam, toggleScreenShare } = useVoice();
  const ownVoiceState = useOwnVoiceState();
  const channelCan = useChannelCan(channelId);
  const isVisible = useControlsBarVisibility();
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const permissions = useMemo(
    () => ({
      canSpeak: channelCan(ChannelPermission.SPEAK),
      canWebcam: channelCan(ChannelPermission.WEBCAM),
      canShareScreen: channelCan(ChannelPermission.SHARE_SCREEN)
    }),
    [channelCan]
  );

  return (
    <div
      className={cn(
        'absolute bottom-4 left-0 right-0 z-30 flex flex-col items-center gap-2 px-2 pointer-events-none md:bottom-8'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 pointer-events-auto',
          'h-14 rounded-xl border border-[#314055] bg-[#172231]/96 px-2 shadow-[0_18px_42px_rgba(2,6,23,0.38)] backdrop-blur-md',
          'transition-all duration-300 ease-in-out',
          isVisible ? 'md:opacity-100 md:translate-y-0' : 'md:opacity-0 md:translate-y-10',
          isMobileExpanded
            ? 'max-md:opacity-100 max-md:translate-y-0'
            : 'max-md:pointer-events-none max-md:max-h-0 max-md:overflow-hidden max-md:opacity-0 max-md:translate-y-2'
        )}
      >
        <ControlToggleButton
          enabled={ownVoiceState.micMuted}
          enabledLabel={t('sidebar:unmute')}
          disabledLabel={t('sidebar:mute')}
          enabledIcon={MicOff}
          disabledIcon={Mic}
          enabledClassName="border-[#7a3340] !bg-[#3a1d26] text-[#ff8b9a] hover:border-[#9f4353] hover:!bg-[#4a222e] hover:text-[#ffb0bb]"
          onClick={toggleMic}
          disabled={!permissions.canSpeak}
        />

        <ControlToggleButton
          enabled={ownVoiceState.webcamEnabled}
          enabledLabel={t('sidebar:stopVideo')}
          disabledLabel={t('sidebar:startVideo')}
          enabledIcon={Video}
          disabledIcon={VideoOff}
          enabledClassName="border-[#2f6b5a] !bg-[#162d29] text-[#76d7b6] hover:border-[#3e8d77] hover:!bg-[#1b3933] hover:text-[#a7eed3]"
          onClick={toggleWebcam}
          disabled={!permissions.canWebcam}
        />

        <ControlToggleButton
          enabled={ownVoiceState.sharingScreen}
          enabledLabel={t('sidebar:stopSharing')}
          disabledLabel={t('sidebar:shareScreenAction')}
          enabledIcon={ScreenShareOff}
          disabledIcon={Monitor}
          enabledClassName="border-[#335d97] !bg-[#16253a] text-[#73a7ff] hover:border-[#4677b8] hover:!bg-[#1c2e48] hover:text-[#a8c9ff]"
          onClick={toggleScreenShare}
          disabled={!permissions.canShareScreen}
        />
        <Button
          size="sm"
          className={cn(
            'pointer-events-auto h-10 rounded-lg border border-[#a9485a] px-3 text-white shadow-[0_18px_42px_rgba(2,6,23,0.38)] transition-all active:scale-95',
            '!bg-[#7d2d3a] hover:!bg-[#933445]'
          )}
          onClick={leaveVoice}
          aria-label={t('sidebar:disconnectVoice')}
          title={t('sidebar:disconnectVoice')}
        >
          <PhoneOff size={20} fill="currentColor" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="pointer-events-auto md:hidden h-9 w-12 rounded-xl border border-[#314055] !bg-[#172231]/96 text-[#8fa2bb] shadow-[0_18px_42px_rgba(2,6,23,0.38)] backdrop-blur-md hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
        onClick={() => setIsMobileExpanded((prev) => !prev)}
        aria-label={
          isMobileExpanded ? t('common:hide', 'Hide controls') : t('common:show', 'Show controls')
        }
        title={
          isMobileExpanded ? t('common:hide', 'Hide controls') : t('common:show', 'Show controls')
        }
      >
        {isMobileExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </Button>
    </div>
  );
});

export { ControlsBar };


