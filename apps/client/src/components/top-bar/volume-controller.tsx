import { UserAvatar } from '@/components/user-avatar';
import {
  useVolumeControl,
  type TVolumeKey
} from '@/components/voice-provider/volume-control-context';
import { useVoiceUsersByChannelId } from '@/features/server/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { useVoiceChannelAudioExternalStreams } from '@/features/server/voice/hooks';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Slider,
  Tooltip
} from '@connectmessager/ui';
import { Headphones, Monitor, Volume2, VolumeX } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type AudioStreamControlProps = {
  userId?: number;
  volumeKey: TVolumeKey;
  name: string;
  type: AudioStreamType;
};

type VolumeControllerProps = {
  channelId: number;
};

enum AudioStreamType {
  Voice = 0,
  External = 1,
  ScreenShare = 2
}

type AudioStream = {
  volumeKey: TVolumeKey;
  userId?: number;
  name: string;
  type: AudioStreamType;
};

const AudioStreamControl = memo(
  ({ userId, volumeKey, type, name }: AudioStreamControlProps) => {
    const user = useUserById(userId || 0);
    const { getVolume, setVolume, toggleMute } = useVolumeControl();
    const volume = getVolume(volumeKey);
    const isMuted = volume === 0;

    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#2b3544] bg-[#101926] px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {userId && user ? (
            <UserAvatar userId={user.id} className="h-6 w-6" />
          ) : (
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[#314055] bg-[#172231]">
              <Headphones className="h-3 w-3 text-[#8fa2bb]" />
            </div>
          )}
          <span className="flex-1 truncate text-sm text-[#d7e2f0]">{name}</span>
          {type === AudioStreamType.ScreenShare && (
            <Monitor className="h-3 w-3 text-[#8fa2bb]" />
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleMute(volumeKey)}
            className="h-7 w-7 rounded-lg border border-[#314055] bg-[#172231] p-0 text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-[#8fa2bb]" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          <div className="w-24">
            <Slider
              value={[volume]}
              onValueChange={(values) => setVolume(volumeKey, values[0] || 0)}
              min={0}
              max={100}
              step={1}
              className="cursor-pointer"
            />
          </div>

          <span className="w-8 text-right text-xs text-[#8fa2bb]">
            {volume}%
          </span>
        </div>
      </div>
    );
  }
);

const VolumeController = memo(({ channelId }: VolumeControllerProps) => {
  const { t } = useTranslation('topbar');
  const voiceUsers = useVoiceUsersByChannelId(channelId);
  const externalAudioStreams = useVoiceChannelAudioExternalStreams(channelId);
  const { getUserVolumeKey, getUserScreenVolumeKey, getExternalVolumeKey } =
    useVolumeControl();
  const ownUserId = useOwnUserId();
  const audioStreams = useMemo(() => {
    const streams: AudioStream[] = [];

    voiceUsers.forEach((voiceUser) => {
      if (voiceUser.id === ownUserId) return;

      streams.push({
        volumeKey: getUserVolumeKey(voiceUser.id),
        userId: voiceUser.id,
        name: voiceUser.name,
        type: AudioStreamType.Voice
      });

      if (voiceUser.state.sharingScreen) {
        streams.push({
          volumeKey: getUserScreenVolumeKey(voiceUser.id),
          userId: voiceUser.id,
          name: voiceUser.name,
          type: AudioStreamType.ScreenShare
        });
      }
    });

    externalAudioStreams.forEach((stream) => {
      streams.push({
        volumeKey: getExternalVolumeKey(stream.pluginId, stream.key),
        name: stream.title || t('externalAudio'),
        type: AudioStreamType.External
      });
    });

    return streams;
  }, [
    voiceUsers,
    externalAudioStreams,
    ownUserId,
    getUserVolumeKey,
    getUserScreenVolumeKey,
    getExternalVolumeKey,
    t
  ]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 rounded-lg border border-[#314055] !bg-[#172231] px-2.5 text-[#8fa2bb] transition-all duration-200 ease-in-out hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white"
        >
          <Tooltip content={t('volumeControls')} asChild={false}>
            <Volume2 className="w-4 h-4" />
          </Tooltip>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 border border-[#314055] bg-[#182433] text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.45)]"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">{t('audioControls')}</h4>
            <span className="text-xs text-[#8fa2bb]">
              {t('stream', { count: audioStreams.length })}
            </span>
          </div>

          <div className="space-y-1 max-h-96 overflow-y-auto">
            {audioStreams.map((stream) => (
              <AudioStreamControl
                key={stream.volumeKey}
                userId={stream.userId}
                volumeKey={stream.volumeKey}
                name={stream.name}
                type={stream.type}
              />
            ))}
            {audioStreams.length === 0 && (
              <div className="py-4 text-center text-sm text-[#8fa2bb]">
                {t('noRemoteAudioStreams')}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

export { VolumeController };


