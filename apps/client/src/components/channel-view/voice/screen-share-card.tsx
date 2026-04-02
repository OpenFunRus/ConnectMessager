import {
  useVolumeControl,
  type TVolumeKey
} from '@/components/voice-provider/volume-control-context';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { StreamKind } from '@connectmessager/shared';
import { IconButton } from '@connectmessager/ui';
import { Monitor, ZoomIn, ZoomOut } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import {
  VOICE_CARD_ACTION_BUTTON_ACTIVE_CLASS,
  VOICE_CARD_ACTION_BUTTON_BASE_CLASS
} from './action-button-styles';
import { CardControls } from './card-controls';
import { CardGradient } from './card-gradient';
import { FullscreenControls } from './fullscreen-controls';
import { useMediaFullscreen } from './hooks/use-media-fullscreen';
import { useScreenShareZoom } from './hooks/use-screen-share-zoom';
import { useVideoStats } from './hooks/use-video-stats';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PinButton } from './pin-button';
import { VolumeButton } from './volume-button';

type tScreenShareControlsProps = {
  isPinned: boolean;
  isZoomEnabled: boolean;
  handlePinToggle: () => void;
  handleToggleZoom: () => void;
  showPinControls: boolean;
  showAudioControl: boolean;
  volumeKey: TVolumeKey;
};

const ScreenShareControls = memo(
  ({
    isPinned,
    isZoomEnabled,
    handlePinToggle,
    handleToggleZoom,
    showPinControls,
    showAudioControl,
    volumeKey
  }: tScreenShareControlsProps) => {
    return (
      <CardControls>
        {showAudioControl && <VolumeButton volumeKey={volumeKey} />}
        {showPinControls && isPinned && (
          <IconButton
            variant="ghost"
            icon={isZoomEnabled ? ZoomOut : ZoomIn}
            onClick={handleToggleZoom}
            title={isZoomEnabled ? 'Disable Zoom' : 'Enable Zoom'}
            size="sm"
            className={cn(
              VOICE_CARD_ACTION_BUTTON_BASE_CLASS,
              isZoomEnabled && VOICE_CARD_ACTION_BUTTON_ACTIVE_CLASS
            )}
          />
        )}
        {showPinControls && (
          <PinButton isPinned={isPinned} handlePinToggle={handlePinToggle} />
        )}
      </CardControls>
    );
  }
);

type TScreenShareCardProps = {
  userId: number;
  isPinned?: boolean;
  onPin: () => void;
  onUnpin: () => void;
  className?: string;
  showPinControls: boolean;
};

const ScreenShareCard = memo(
  ({
    userId,
    isPinned = false,
    onPin,
    onUnpin,
    className,
    showPinControls = true
  }: TScreenShareCardProps) => {
    const user = useUserById(userId);
    const ownUserId = useOwnUserId();
    const { getUserScreenVolumeKey } = useVolumeControl();
    const isOwnUser = ownUserId === userId;
    const volumeKey = getUserScreenVolumeKey(userId);
    const {
      screenShareRef,
      screenShareAudioRef,
      hasScreenShareStream,
      hasScreenShareAudioStream
    } = useVoiceRefs(userId);
    const { transportStats, getConsumerCodec } = useVoice();
    const videoStats = useVideoStats(screenShareRef, hasScreenShareStream);

    const codec = useMemo(() => {
      let mimeType: string | undefined;

      if (isOwnUser) {
        mimeType = transportStats.screenShare?.codec;
      } else {
        mimeType = getConsumerCodec(userId, StreamKind.SCREEN);
      }

      if (!mimeType) return null;

      const parts = mimeType.split('/');

      return parts.length > 1 ? parts[1] : mimeType;
    }, [
      isOwnUser,
      transportStats.screenShare?.codec,
      getConsumerCodec,
      userId
    ]);

    const { isFullscreen, rotationDeg, toggleFullscreen, rotateClockwise } =
      useMediaFullscreen();
    const {
      containerRef,
      isZoomEnabled,
      zoom,
      position,
      isDragging,
      handleToggleZoom,
      handleWheel,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      getCursor,
      resetZoom
    } = useScreenShareZoom({ forceEnable: isFullscreen });

    const handlePinToggle = useCallback(() => {
      if (isPinned) {
        onUnpin?.();
        resetZoom();
      } else {
        onPin?.();
      }
    }, [isPinned, onPin, onUnpin, resetZoom]);

    if (!user || !hasScreenShareStream) return null;

    return (
      <div
        ref={containerRef}
        className={cn(
          'group relative overflow-hidden rounded-2xl border border-[#2b3544] bg-[#172231] focus-visible:outline-none',
          'flex items-center justify-center',
          'w-full h-full',
          'shadow-[0_16px_40px_rgba(2,6,23,0.28)]',
          className
        )}
        tabIndex={0}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: getCursor(),
          touchAction: isFullscreen ? 'none' : 'auto'
        }}
      >
        <CardGradient />

        <ScreenShareControls
          isPinned={isPinned}
          isZoomEnabled={isZoomEnabled}
          handlePinToggle={handlePinToggle}
          handleToggleZoom={handleToggleZoom}
          showPinControls={showPinControls}
          showAudioControl={!isOwnUser && hasScreenShareAudioStream}
          volumeKey={volumeKey}
        />
        <FullscreenControls
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => toggleFullscreen(containerRef.current)}
          onRotate={rotateClockwise}
        />

        <video
          ref={screenShareRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full bg-[#0b1220] object-contain"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px) rotate(${rotationDeg}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        />

        <audio
          ref={screenShareAudioRef}
          className="hidden"
          autoPlay
          playsInline
        />

        <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-[linear-gradient(180deg,rgba(11,18,32,0)_0%,rgba(11,18,32,0.84)_100%)] p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:group-active:opacity-100">
          <div className="flex min-w-0 items-center gap-2">
            <Monitor className="size-3.5 shrink-0 text-[#b895ff]" />
            <span className="truncate text-xs font-medium text-white">
              {user.name}'s screen
            </span>
            {(videoStats || codec) && (
              <span className="shrink-0 text-xs text-white/50">
                {codec}
                {codec && videoStats && ' '}
                {videoStats && (
                  <>
                    {videoStats.width}x{videoStats.height}
                    {videoStats.frameRate > 0 && ` ${videoStats.frameRate}fps`}
                  </>
                )}
              </span>
            )}
            {isZoomEnabled && zoom > 1 && (
              <span className="ml-auto shrink-0 text-xs text-white/70">
                {Math.round(zoom * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ScreenShareCard.displayName = 'ScreenShareCard';

export { ScreenShareCard };


