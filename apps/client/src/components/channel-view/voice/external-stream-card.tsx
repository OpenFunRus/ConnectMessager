import { useVolumeControl } from '@/components/voice-provider/volume-control-context';
import { cn } from '@/lib/utils';
import type { TExternalStream } from '@connectmessager/shared';
import { Avatar, AvatarFallback, AvatarImage, IconButton } from '@connectmessager/ui';
import { Headphones, Router, Video, ZoomIn, ZoomOut } from 'lucide-react';
import { memo, useCallback } from 'react';
import {
  VOICE_CARD_ACTION_BUTTON_ACTIVE_CLASS,
  VOICE_CARD_ACTION_BUTTON_BASE_CLASS
} from './action-button-styles';
import { CardControls } from './card-controls';
import { CardGradient } from './card-gradient';
import { FullscreenControls } from './fullscreen-controls';
import { useMediaFullscreen } from './hooks/use-media-fullscreen';
import { useScreenShareZoom } from './hooks/use-screen-share-zoom';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PinButton } from './pin-button';
import { StreamSettingsPopover } from './stream-settings-popover';

type TExternalStreamControlsProps = {
  isPinned: boolean;
  isZoomEnabled: boolean;
  handlePinToggle: () => void;
  handleToggleZoom: () => void;
  showPinControls: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
};

const ExternalStreamControls = memo(
  ({
    isPinned,
    isZoomEnabled,
    handlePinToggle,
    handleToggleZoom,
    showPinControls,
    hasVideo,
    hasAudio,
    volume,
    isMuted,
    onVolumeChange,
    onMuteToggle
  }: TExternalStreamControlsProps) => {
    return (
      <CardControls>
        {hasAudio && (
          <StreamSettingsPopover
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={onVolumeChange}
            onMuteToggle={onMuteToggle}
          />
        )}
        {showPinControls && hasVideo && isPinned && (
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

type TExternalStreamCardProps = {
  streamId: number;
  stream: TExternalStream;
  isPinned?: boolean;
  onPin: () => void;
  onUnpin: () => void;
  className?: string;
  showPinControls: boolean;
};

const ExternalStreamCard = memo(
  ({
    streamId,
    stream,
    isPinned = false,
    onPin,
    onUnpin,
    className,
    showPinControls = true
  }: TExternalStreamCardProps) => {
    const { externalVideoRef, hasExternalVideoStream, hasExternalAudioStream } =
      useVoiceRefs(streamId, stream.pluginId, stream.key);

    const { getVolume, setVolume, toggleMute, getExternalVolumeKey } =
      useVolumeControl();

    const volumeKey = getExternalVolumeKey(stream.pluginId, stream.key);
    const volume = getVolume(volumeKey);
    const isMuted = volume === 0;

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

    const handleVolumeChange = useCallback(
      (newVolume: number) => {
        setVolume(volumeKey, newVolume);
      },
      [volumeKey, setVolume]
    );

    const handleMuteToggle = useCallback(() => {
      toggleMute(volumeKey);
    }, [volumeKey, toggleMute]);

    const hasVideo = stream.tracks?.video && hasExternalVideoStream;
    const hasAudio = stream.tracks?.audio && hasExternalAudioStream;

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
        onWheel={hasVideo ? handleWheel : undefined}
        onMouseDown={hasVideo ? handleMouseDown : undefined}
        onMouseMove={hasVideo ? handleMouseMove : undefined}
        onMouseUp={hasVideo ? handleMouseUp : undefined}
        onMouseLeave={hasVideo ? handleMouseUp : undefined}
        onTouchStart={hasVideo ? handleTouchStart : undefined}
        onTouchMove={hasVideo ? handleTouchMove : undefined}
        onTouchEnd={hasVideo ? handleTouchEnd : undefined}
        style={{
          cursor: hasVideo ? getCursor() : 'default',
          touchAction: hasVideo && isFullscreen ? 'none' : 'auto'
        }}
      >
        <CardGradient />

        <ExternalStreamControls
          isPinned={isPinned}
          isZoomEnabled={isZoomEnabled}
          handlePinToggle={handlePinToggle}
          handleToggleZoom={handleToggleZoom}
          showPinControls={showPinControls}
          hasVideo={!!hasVideo}
          hasAudio={!!hasAudio}
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
        />
        {hasVideo && (
          <FullscreenControls
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => toggleFullscreen(containerRef.current)}
            onRotate={rotateClockwise}
          />
        )}

        {hasVideo ? (
          <video
            ref={externalVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full bg-[#0b1220] object-contain"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px) rotate(${rotationDeg}deg)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <div className="relative">
              {stream.avatarUrl ? (
                <Avatar className="w-20 h-20 border-2 border-green-500/50">
                  <AvatarImage
                    src={stream.avatarUrl}
                    alt={stream.title || 'External Stream'}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-green-500/30 to-emerald-500/30">
                    <Headphones className="size-10 text-green-400" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center border-2 border-green-500/50">
                  <Headphones className="size-10 text-green-400" />
                </div>
              )}
              {hasAudio && !isMuted && (
                <div className="absolute inset-0 rounded-full animate-pulse bg-[#76d7b6]/20" />
              )}
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-[linear-gradient(180deg,rgba(11,18,32,0)_0%,rgba(11,18,32,0.84)_100%)] p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:group-active:opacity-100">
          <div className="flex min-w-0 items-center gap-2">
            {stream.avatarUrl ? (
              <img
                src={stream.avatarUrl}
                alt={stream.title || 'External Stream'}
                className="h-5 flex-shrink-0 rounded-full"
              />
            ) : (
              <Router className="size-3.5 text-purple-400 flex-shrink-0" />
            )}
            <span className="truncate text-xs font-medium text-white">
              {stream.title || 'External Stream'}
            </span>

            <div className="ml-auto flex items-center gap-1">
              {hasVideo && <Video className="size-3 text-[#73a7ff]" />}
              {hasAudio && (
                <Headphones
                  className={cn(
                    'size-3',
                    isMuted ? 'text-[#ff8b9a]' : 'text-[#76d7b6]'
                  )}
                />
              )}
            </div>

            {stream.pluginId && (
              <span className="flex-shrink-0 text-[10px] text-white/50">
                via {stream.pluginId}
              </span>
            )}

            {isZoomEnabled && zoom > 1 && (
              <span className="flex-shrink-0 text-xs text-white/70">
                {Math.round(zoom * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ExternalStreamCard.displayName = 'ExternalStreamCard';

export { ExternalStreamCard };


