import { PinActionButton } from '@/components/pin-action-button';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import {
  VOICE_CARD_ACTION_BUTTON_ACTIVE_CLASS,
  VOICE_CARD_ACTION_BUTTON_BASE_CLASS
} from './action-button-styles';

type TPinButtonProps = {
  isPinned: boolean;
  handlePinToggle: () => void;
};

const PinButton = memo(({ isPinned, handlePinToggle }: TPinButtonProps) => {
  return (
    <PinActionButton
      active={isPinned}
      onClick={handlePinToggle}
      title={isPinned ? 'Unpin' : 'Pin'}
      className={cn(
        VOICE_CARD_ACTION_BUTTON_BASE_CLASS,
        isPinned && VOICE_CARD_ACTION_BUTTON_ACTIVE_CLASS
      )}
    />
  );
});

export { PinButton };
