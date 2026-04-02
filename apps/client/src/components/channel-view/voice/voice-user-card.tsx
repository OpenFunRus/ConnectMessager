import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { UserAvatar } from '@/components/user-avatar';
import { useVolumeControl } from '@/components/voice-provider/volume-control-context';
import type { TVoiceUser } from '@/features/server/types';
import { useIsOwnUser } from '@/features/server/users/hooks';
import {
  useShowUserBannersInVoice,
  useSpeakingState
} from '@/features/server/voice/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { cn } from '@/lib/utils';
import { HeadphoneOff, MicOff, Monitor, Video } from 'lucide-react';
import { memo, useCallback, useRef } from 'react';
import { CardControls } from './card-controls';
import { CardGradient } from './card-gradient';
import { FullscreenControls } from './fullscreen-controls';
import { useMediaFullscreen } from './hooks/use-media-fullscreen';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PinButton } from './pin-button';
import { VolumeButton } from './volume-button';

type TVoiceUserCardProps = {
  userId: number;
  onPin: () => void;
  onUnpin: () => void;
  showPinControls?: boolean;
  voiceUser: TVoiceUser;
  className?: string;
  isPinned?: boolean;
};

const VoiceUserCard = memo(
  ({
    userId,
    onPin,
    onUnpin,
    className,
    isPinned = false,
    showPinControls = true,
    voiceUser
  }: TVoiceUserCardProps) => {
    const { videoRef, hasVideoStream } = useVoiceRefs(userId);
    const containerRef = useRef<HTMLDivElement>(null);
    const { getUserVolumeKey } = useVolumeControl();
    const { devices } = useDevices();
    const isOwnUser = useIsOwnUser(userId);
    const showUserBanners = useShowUserBannersInVoice();
    const { isActivelySpeaking, speakingEffectClass } =
      useSpeakingState(userId);
    const { isFullscreen, rotationDeg, toggleFullscreen, rotateClockwise } =
      useMediaFullscreen();

    const handlePinToggle = useCallback(() => {
      if (isPinned) {
        onUnpin?.();
      } else {
        onPin?.();
      }
    }, [isPinned, onPin, onUnpin]);

    return (
      <div
        ref={containerRef}
        className={cn(
          'group relative overflow-hidden rounded-2xl border border-[#2b3544] bg-[#172231] focus-visible:outline-none',
          'flex items-center justify-center',
          'w-full h-full',
          'shadow-[0_16px_40px_rgba(2,6,23,0.28)]',
          isActivelySpeaking && speakingEffectClass,
          className
        )}
        tabIndex={0}
      >
        {voiceUser.banner && showUserBanners ? (
          <div
            className="absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat blur-sm brightness-50"
            style={{
              backgroundImage: `url("${getFileUrl(voiceUser.banner)}")`
            }}
          />
        ) : (
          <CardGradient />
        )}

        <CardControls>
          {!isOwnUser && <VolumeButton volumeKey={getUserVolumeKey(userId)} />}
          {showPinControls && (
            <PinButton isPinned={isPinned} handlePinToggle={handlePinToggle} />
          )}
        </CardControls>
        {hasVideoStream && (
          <FullscreenControls
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => toggleFullscreen(containerRef.current)}
            onRotate={rotateClockwise}
          />
        )}

        {hasVideoStream && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              transform: `${isOwnUser && devices.mirrorOwnVideo ? 'scaleX(-1) ' : ''}rotate(${rotationDeg}deg)`
            }}
          />
        )}
        {!hasVideoStream && (
          <UserAvatar
            userId={userId}
            className="w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24"
            showStatusBadge={false}
          />
        )}

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-[linear-gradient(180deg,rgba(11,18,32,0)_0%,rgba(11,18,32,0.82)_100%)] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-xs font-medium text-white">
              {voiceUser.name}
            </span>

            <div className="flex items-center gap-1">
              {voiceUser.state.micMuted && (
                <MicOff className="size-3.5 text-[#ff8b9a]" />
              )}

              {voiceUser.state.soundMuted && (
                <HeadphoneOff className="size-3.5 text-[#ff8b9a]" />
              )}

              {voiceUser.state.webcamEnabled && (
                <Video className="size-3.5 text-[#73a7ff]" />
              )}

              {voiceUser.state.sharingScreen && (
                <Monitor className="size-3.5 text-[#b895ff]" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VoiceUserCard.displayName = 'VoiceUserCard';

export { VoiceUserCard };
