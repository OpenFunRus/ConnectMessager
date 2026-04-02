import { cn } from '@/lib/utils';
import { Button, Tooltip } from '@connectmessager/ui';
import { memo } from 'react';

type TIconComponent = React.ComponentType<{
  size?: number;
  className?: string;
}>;

type TControlToggleButtonProps = {
  enabled: boolean;
  enabledLabel: string;
  disabledLabel: string;
  enabledIcon: TIconComponent;
  disabledIcon: TIconComponent;

  enabledClassName: string;
  disabledClassName?: string;

  onClick: () => void;
  disabled?: boolean;
};

const ControlToggleButton = memo(
  ({
    enabled,
    enabledLabel,
    disabledLabel,
    enabledIcon: EnabledIcon,
    disabledIcon: DisabledIcon,
    enabledClassName,
    disabledClassName,
    onClick,
    disabled
  }: TControlToggleButtonProps) => {
    const label = enabled ? enabledLabel : disabledLabel;

    return (
      <Tooltip content={label}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-10 w-10 rounded-lg border border-[#314055] !bg-[#101926] text-[#8fa2bb] shadow-none transition-all duration-200 hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white',
            enabled
              ? enabledClassName
              : (disabledClassName ?? ''),
            disabled &&
              'opacity-60 hover:border-[#314055] hover:!bg-[#101926] hover:text-[#8fa2bb]'
          )}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {enabled ? <EnabledIcon size={22} /> : <DisabledIcon size={22} />}
        </Button>
      </Tooltip>
    );
  }
);

ControlToggleButton.displayName = 'ControlToggleButton';

export { ControlToggleButton };
export type { TControlToggleButtonProps };


