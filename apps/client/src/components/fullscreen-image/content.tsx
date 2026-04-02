import { cn } from '@/lib/utils';
import { Button } from '@connectmessager/ui';
import { X } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const portalRoot = document.getElementById('imagePortal')!;

type TFullScreenImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fullscreenSrc?: string;
};

const FullScreenImage = memo(({ fullscreenSrc, ...props }: TFullScreenImageProps) => {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const scaleRef = useRef(0.8);
  const posRef = useRef({ x: 0, y: 0 });
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const applyTransform = useCallback(() => {
    const el = imgRef.current;

    if (!el) return;

    el.style.transform = `scale(${scaleRef.current}) translate(${posRef.current.x}px, ${posRef.current.y}px)`;
  }, []);

  const onOpenClick = useCallback(() => {
    scaleRef.current = 0.8;
    posRef.current = { x: 0, y: 0 };

    setOpen(true);

    setTimeout(() => setVisible(true), 10);
  }, []);

  const onCloseClick = useCallback(() => {
    setVisible(false);

    scaleRef.current = 1;
    posRef.current = { x: 0, y: 0 };

    setTimeout(() => setOpen(false), 300);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    const el = imgRef.current;

    if (el) {
      el.style.cursor = 'grabbing';
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseClick();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const prev = scaleRef.current;

      scaleRef.current = Math.min(Math.max(prev - e.deltaY * 0.001, 0.5), 3);

      applyTransform();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;

      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      posRef.current = {
        x: posRef.current.x + dx,
        y: posRef.current.y + dy
      };

      applyTransform();
    };

    const handleMouseUp = () => {
      draggingRef.current = false;

      const el = imgRef.current;

      if (el) {
        el.style.cursor = 'grab';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [open, onCloseClick, applyTransform]);

  const onClickOutside = useCallback(() => {
    if (!draggingRef.current) {
      onCloseClick();
    }
  }, [onCloseClick]);

  const portalContainer =
    open &&
    createPortal(
      <>
        <div
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-300',
            visible ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClickOutside}
        >
          <img
            {...props}
            ref={imgRef}
            src={fullscreenSrc ?? props.src}
            decoding="async"
            style={{
              transform: `scale(${scaleRef.current}) translate(${posRef.current.x}px, ${posRef.current.y}px)`,
              cursor: 'grab'
            }}
            className="max-h-full max-w-full object-contain p-4"
            onMouseDown={handleMouseDown}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            onClick={onCloseClick}
            size="icon"
            variant="outline"
            className="absolute top-2 right-2 z-50"
          >
            <X size="1.1rem" />
          </Button>
        </div>
      </>,
      portalRoot
    );

  return (
    <>
      <img
        {...props}
        loading={props.loading ?? 'lazy'}
        decoding="async"
        className={cn('cursor-pointer', props.className)}
        onClick={onOpenClick}
        draggable={false}
      />
      {portalContainer}
    </>
  );
});

export { FullScreenImage };


