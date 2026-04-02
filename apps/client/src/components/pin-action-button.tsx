import { cn } from '@/lib/utils';
import { Button } from '@connectmessager/ui';
import { memo } from 'react';

type TPushPinIconProps = {
  className?: string;
};

const PushPinIcon = memo(({ className }: TPushPinIconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
      aria-hidden="true"
    >
      <path d="M9 4h6" />
      <path d="M10 4v5l-3 4v1h10v-1l-3-4V4" />
      <path d="M12 14v6" />
    </svg>
  );
});

type TPinActionButtonProps = Omit<
  React.ComponentProps<'button'>,
  'children' | 'type'
> & {
  active?: boolean;
};

const PinActionButton = memo(
  ({ active = false, className, title, ...props }: TPinActionButtonProps) => {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={title}
        title={title}
        className={cn(
          'h-8 w-8 rounded-lg border p-0 shadow-none',
          active
            ? 'border-[#4677b8] !bg-[#1c2e48] text-[#a8c9ff] hover:border-[#5f90d1] hover:!bg-[#22385a] hover:text-white'
            : 'border-[#314055] !bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white',
          className
        )}
        {...props}
      >
        <PushPinIcon />
      </Button>
    );
  }
);

PushPinIcon.displayName = 'PushPinIcon';
PinActionButton.displayName = 'PinActionButton';

export { PinActionButton, PushPinIcon };


