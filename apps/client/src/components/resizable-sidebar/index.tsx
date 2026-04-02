import type { LocalStorageKey } from '@/helpers/storage';
import { useResizableSidebar } from '@/hooks/use-resizable-sidebar';
import { cn } from '@/lib/utils';
import { memo, type ReactNode } from 'react';

type TResizableSidebarProps = {
  storageKey: LocalStorageKey;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  edge: 'left' | 'right';
  isOpen?: boolean;
  className?: string;
  children: ReactNode;
};

const ResizableSidebar = memo(
  ({
    storageKey,
    minWidth,
    maxWidth,
    defaultWidth,
    edge,
    isOpen = true,
    className,
    children
  }: TResizableSidebarProps) => {
    const { width, isResizing, sidebarRef, handleMouseDown } =
      useResizableSidebar({
        storageKey,
        minWidth,
        maxWidth,
        defaultWidth,
        edge
      });

    const isLeftEdge = edge === 'left';

    return (
      <div
        ref={sidebarRef}
        className={cn(
          'relative flex shrink-0 flex-col overflow-hidden bg-[#182433] text-[#d7e2f0]',
          isLeftEdge ? 'border-l border-[#2b3544]' : 'border-r border-[#2b3544]',
          !isOpen && 'w-0 overflow-hidden border-transparent!',
          !isResizing && 'transition-[width,border-color] duration-300 ease-out',
          className
        )}
        style={{
          width: isOpen ? `${width}px` : '0px'
        }}
      >
        {isOpen && (
          <>
            <div
              className={cn(
                'absolute top-0 bottom-0 z-50 hidden w-1 cursor-col-resize transition-colors lg:block',
                isLeftEdge ? 'left-0' : 'right-0',
                isResizing ? 'bg-[#206bc4]/80' : 'hover:bg-[#206bc4]/30'
              )}
              onMouseDown={handleMouseDown}
            />
            {children}
          </>
        )}
      </div>
    );
  }
);

export { ResizableSidebar };
