import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission } from '@connectmessager/shared';
import { Button } from '@connectmessager/ui';
import {
  AlertTriangle,
  Loader2,
  Monitor,
  MonitorOff,
  PhoneOff,
  Video,
  VideoOff,
  Wifi,
  WifiOff
} from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StatsPopover } from './stats-popover';

const VoiceControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const voiceChannelId = useCurrentVoiceChannelId();
  const channelCan = useChannelCan(voiceChannelId);
  const { ownVoiceState, toggleWebcam, toggleScreenShare, connectionStatus } =
    useVoice();

  const connectionInfo = useMemo(() => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: t('voiceConnecting'),
          color: 'text-yellow-500'
        };
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4 text-green-600" />,
          text: t('voiceConnected'),
          color: 'text-green-600'
        };
      case 'failed':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          text: t('voiceFailed'),
          color: 'text-red-500'
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="h-4 w-4 text-red-500" />,
          text: t('voiceDisconnected'),
          color: 'text-red-500'
        };
    }
  }, [connectionStatus, t]);

  if (!voiceChannelId) {
    return null;
  }

  return (
    <>
      <div className="border-t border-[#2b3544] bg-[#172231]">
        <StatsPopover>
          <div className="flex cursor-pointer items-center gap-2 border-b border-[#243244] px-3 py-2 transition-colors hover:bg-[#1b2940]">
            {connectionInfo.icon}
            <span className={cn('text-xs font-semibold', connectionInfo.color)}>
              {connectionInfo.text}
            </span>
          </div>
        </StatsPopover>

        <div className="flex items-center justify-between px-3 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={leaveVoice}
            className="border-[#314055] !bg-[#101926] text-[#d7e2f0] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
          >
            <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
            {t('disconnectVoice')}
          </Button>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-lg border border-[#314055] !bg-[#101926] transition-all duration-200',
                ownVoiceState.webcamEnabled
                  ? 'border-green-500/20 !bg-green-500/15 text-green-400 hover:!bg-green-500/25 hover:text-green-300'
                  : 'text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white'
              )}
              onClick={toggleWebcam}
              title={
                ownVoiceState.webcamEnabled
                  ? t('turnOffCamera')
                  : t('turnOnCamera')
              }
              disabled={!channelCan(ChannelPermission.WEBCAM)}
            >
              {ownVoiceState.webcamEnabled ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-lg border border-[#314055] !bg-[#101926] transition-all duration-200',
                ownVoiceState.sharingScreen
                  ? 'border-blue-500/20 !bg-blue-500/15 text-blue-400 hover:!bg-blue-500/25 hover:text-blue-300'
                  : 'text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white'
              )}
              onClick={toggleScreenShare}
              title={
                ownVoiceState.sharingScreen
                  ? t('stopScreenShare')
                  : t('startScreenShare')
              }
              disabled={!channelCan(ChannelPermission.SHARE_SCREEN)}
            >
              {ownVoiceState.sharingScreen ? (
                <Monitor className="h-4 w-4" />
              ) : (
                <MonitorOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
});

export { VoiceControl };


