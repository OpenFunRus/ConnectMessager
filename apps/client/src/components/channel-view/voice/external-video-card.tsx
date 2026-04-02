import { cn } from '@/lib/utils';
import { IconButton } from '@connectmessager/ui';
import { Video, ZoomIn, ZoomOut } from 'lucide-react';
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

type TExternalVideoControlsProps = {
  isPinned: boolean;
  isZoomEnabled: boolean;
  handlePinToggle: () => void;
  handleToggleZoom: () => void;
  showPinControls: boolean;
};

const ExternalVideoControls = memo(
  ({
    isPinned,
    isZoomEnabled,
    handlePinToggle,
    handleToggleZoom,
    showPinControls
  }: TExternalVideoControlsProps) => {
    return (
      <CardControls>
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

type TExternalVideoCardProps = {
  streamId: number;
  isPinned?: boolean;
  onPin: () => void;
  onUnpin: () => void;
  className?: string;
  showPinControls: boolean;
  name?: string;
};

const ExternalVideoCard = memo(
  ({
    streamId,
    isPinned = false,
    onPin,
    onUnpin,
    className,
    showPinControls = true,
    name
  }: TExternalVideoCardProps) => {
    const { externalVideoRef, hasExternalVideoStream } = useVoiceRefs(streamId);

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

    if (!hasExternalVideoStream) return null;

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative bg-card rounded-lg overflow-hidden group focus-visible:outline-none',
          'flex items-center justify-center',
          'w-full h-full',
          'border border-border',
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

        <ExternalVideoControls
          isPinned={isPinned}
          isZoomEnabled={isZoomEnabled}
          handlePinToggle={handlePinToggle}
          handleToggleZoom={handleToggleZoom}
          showPinControls={showPinControls}
        />
        <FullscreenControls
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => toggleFullscreen(containerRef.current)}
          onRotate={rotateClockwise}
        />

        <video
          ref={externalVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-contain bg-black"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px) rotate(${rotationDeg}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        />

        <div className="absolute bottom-0 left-0 right-0 z-10 p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:group-active:opacity-100">
          <div className="flex items-center gap-2 min-w-0">
            <Video className="size-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-white font-medium text-xs truncate">
              {name || 'External Video'}
            </span>
            {isZoomEnabled && zoom > 1 && (
              <span className="text-white/70 text-xs ml-auto flex-shrink-0">
                {Math.round(zoom * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ExternalVideoCard.displayName = 'ExternalVideoCard';

export { ExternalVideoCard };


