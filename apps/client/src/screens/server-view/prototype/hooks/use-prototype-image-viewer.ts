import type { TFile } from '@connectmessager/shared';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

type TPanStart = {
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
};

const usePrototypeImageViewer = (activeChatId: string | null) => {
  const [imageViewerFile, setImageViewerFile] = useState<TFile | null>(null);
  const [imageViewerZoom, setImageViewerZoom] = useState(1);
  const [imageViewerPan, setImageViewerPan] = useState({ x: 0, y: 0 });
  const [isImageViewerPanning, setIsImageViewerPanning] = useState(false);
  const imageViewerStageRef = useRef<HTMLDivElement | null>(null);
  const imageViewerPanStartRef = useRef<TPanStart | null>(null);

  const resetImageViewer = useCallback(() => {
    setImageViewerFile(null);
    setImageViewerZoom(1);
    setImageViewerPan({ x: 0, y: 0 });
    setIsImageViewerPanning(false);
    imageViewerPanStartRef.current = null;
  }, []);

  const openImageViewer = useCallback((file: TFile) => {
    setImageViewerFile(file);
    setImageViewerZoom(1);
    setImageViewerPan({ x: 0, y: 0 });
    setIsImageViewerPanning(false);
    imageViewerPanStartRef.current = null;
  }, []);

  const closeImageViewer = useCallback(() => {
    resetImageViewer();
  }, [resetImageViewer]);

  const onImageViewerWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const step = event.deltaY < 0 ? 0.15 : -0.15;
      const nextZoom = Math.max(0.5, Math.min(4, Number((imageViewerZoom + step).toFixed(2))));
      const stage = imageViewerStageRef.current;

      if (stage) {
        const rect = stage.getBoundingClientRect();
        const cursorX = event.clientX - rect.left - rect.width / 2;
        const cursorY = event.clientY - rect.top - rect.height / 2;
        const ratio = nextZoom / imageViewerZoom;

        setImageViewerPan((prev) => ({
          x: cursorX - (cursorX - prev.x) * ratio,
          y: cursorY - (cursorY - prev.y) * ratio
        }));
      }

      setImageViewerZoom(nextZoom);
    },
    [imageViewerZoom]
  );

  const onImageViewerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      if (imageViewerZoom <= 1) return;
      const stage = imageViewerStageRef.current;
      if (!stage) return;

      stage.setPointerCapture(event.pointerId);
      imageViewerPanStartRef.current = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: imageViewerPan.x,
        startPanY: imageViewerPan.y
      };
      setIsImageViewerPanning(true);
    },
    [imageViewerPan.x, imageViewerPan.y, imageViewerZoom]
  );

  const onImageViewerPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isImageViewerPanning) return;
      event.preventDefault();
      const panStart = imageViewerPanStartRef.current;
      if (!panStart) return;

      const deltaX = event.clientX - panStart.startClientX;
      const deltaY = event.clientY - panStart.startClientY;
      setImageViewerPan({
        x: panStart.startPanX + deltaX,
        y: panStart.startPanY + deltaY
      });
    },
    [isImageViewerPanning]
  );

  const onImageViewerPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const stage = imageViewerStageRef.current;
    if (stage?.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
    imageViewerPanStartRef.current = null;
    setIsImageViewerPanning(false);
  }, []);

  const onImageViewerLostPointerCapture = useCallback(() => {
    imageViewerPanStartRef.current = null;
    setIsImageViewerPanning(false);
  }, []);

  useEffect(() => {
    resetImageViewer();
  }, [activeChatId, resetImageViewer]);

  useEffect(() => {
    if (!imageViewerFile) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeImageViewer();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeImageViewer, imageViewerFile]);

  return {
    imageViewerFile,
    imageViewerZoom,
    imageViewerPan,
    isImageViewerPanning,
    imageViewerStageRef,
    openImageViewer,
    closeImageViewer,
    onImageViewerWheel,
    onImageViewerPointerDown,
    onImageViewerPointerMove,
    onImageViewerPointerUp,
    onImageViewerLostPointerCapture
  };
};

export { usePrototypeImageViewer };
