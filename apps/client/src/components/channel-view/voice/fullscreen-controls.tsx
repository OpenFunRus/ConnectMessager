import { IconButton } from '@connectmessager/ui';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2, RotateCw } from 'lucide-react';
import { memo } from 'react';
import {
  VOICE_CARD_ACTION_BUTTON_ACTIVE_CLASS,
  VOICE_CARD_ACTION_BUTTON_BASE_CLASS
} from './action-button-styles';

type TFullscreenControlsProps = {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onRotate: () => void;
};

const FullscreenControls = memo(
  ({ isFullscreen, onToggleFullscreen, onRotate }: TFullscreenControlsProps) => {
    return (
      <div className="absolute left-2 top-2 z-20 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:group-active:opacity-100">
        <IconButton
          variant="ghost"
          icon={isFullscreen ? Minimize2 : Maximize2}
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'}
          size="sm"
          className={cn(
            VOICE_CARD_ACTION_BUTTON_BASE_CLASS,
            isFullscreen && VOICE_CARD_ACTION_BUTTON_ACTIVE_CLASS
          )}
        />
        {isFullscreen && (
          <IconButton
            variant="ghost"
            icon={RotateCw}
            onClick={onRotate}
            title="Rotate 90 degrees"
            size="sm"
            className={cn(
              VOICE_CARD_ACTION_BUTTON_BASE_CLASS,
              VOICE_CARD_ACTION_BUTTON_ACTIVE_CLASS
            )}
          />
        )}
      </div>
    );
  }
);

FullscreenControls.displayName = 'FullscreenControls';

export { FullscreenControls };

