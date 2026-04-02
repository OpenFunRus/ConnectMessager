import { cn } from '@/lib/utils';
import { memo } from 'react';

type TOverrideLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

const OverrideLayout = memo(({ children, className }: TOverrideLayoutProps) => {
  return <div className={cn('flex flex-col gap-1 p-2', className)}>{children}</div>;
});

export { OverrideLayout };
