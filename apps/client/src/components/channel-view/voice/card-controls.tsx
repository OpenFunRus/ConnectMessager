import { memo } from 'react';

type TCardControlsProps = {
  children?: React.ReactNode;
};

const CardControls = memo(({ children }: TCardControlsProps) => {
  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:group-active:opacity-100">
      {children}
    </div>
  );
});

export { CardControls };
