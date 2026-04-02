import { useCallback, useRef, useState } from 'react';

type TUseScreenShareZoomOptions = {
  forceEnable?: boolean;
};

type TPoint = {
  x: number;
  y: number;
};

type TPinchState = {
  distance: number;
  zoom: number;
  position: TPoint;
  midpoint: TPoint;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

const clampZoom = (value: number) =>
  Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));

const getTouchDistance = (touches: React.TouchEvent['touches']) => {
  if (touches.length < 2) {
    return 0;
  }

  const [firstTouch, secondTouch] = [touches[0]!, touches[1]!];
  const deltaX = secondTouch.clientX - firstTouch.clientX;
  const deltaY = secondTouch.clientY - firstTouch.clientY;

  return Math.hypot(deltaX, deltaY);
};

const getTouchMidpoint = (touches: React.TouchEvent['touches']): TPoint => {
  const [firstTouch, secondTouch] = [touches[0]!, touches[1]!];

  return {
    x: (firstTouch.clientX + secondTouch.clientX) / 2,
    y: (firstTouch.clientY + secondTouch.clientY) / 2
  };
};

export const useScreenShareZoom = ({
  forceEnable = false
}: TUseScreenShareZoomOptions = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinchStateRef = useRef<TPinchState | null>(null);
  const dragStartRef = useRef<TPoint>({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const positionRef = useRef<TPoint>({ x: 0, y: 0 });

  const [isZoomEnabled, setIsZoomEnabled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const isInteractionEnabled = isZoomEnabled || forceEnable;

  const setZoomValue = useCallback((value: number) => {
    zoomRef.current = value;
    setZoom(value);
  }, []);

  const setPositionValue = useCallback((value: TPoint) => {
    positionRef.current = value;
    setPosition(value);
  }, []);

  const resetZoom = useCallback(
    ({ disableManualZoom = true }: { disableManualZoom?: boolean } = {}) => {
      setZoomValue(1);
      setPositionValue({ x: 0, y: 0 });
      pinchStateRef.current = null;
      dragStartRef.current = { x: 0, y: 0 };
      setIsDragging(false);

      if (disableManualZoom) {
        setIsZoomEnabled(false);
      }
    },
    [setPositionValue, setZoomValue]
  );

  const getZoomedPosition = useCallback(
    ({
      nextZoom,
      origin,
      baseZoom,
      basePosition
    }: {
      nextZoom: number;
      origin: TPoint;
      baseZoom: number;
      basePosition: TPoint;
    }) => {
      const container = containerRef.current;

      if (!container) {
        return basePosition;
      }

      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const offsetX = origin.x - rect.left - centerX;
      const offsetY = origin.y - rect.top - centerY;
      const zoomRatio = nextZoom / baseZoom;

      return {
        x: basePosition.x * zoomRatio + offsetX * (zoomRatio - 1),
        y: basePosition.y * zoomRatio + offsetY * (zoomRatio - 1)
      };
    },
    []
  );

  const applyZoom = useCallback(
    ({
      nextZoom,
      origin,
      baseZoom = zoomRef.current,
      basePosition = positionRef.current
    }: {
      nextZoom: number;
      origin: TPoint;
      baseZoom?: number;
      basePosition?: TPoint;
    }) => {
      const clampedZoom = clampZoom(nextZoom);

      if (clampedZoom <= MIN_ZOOM) {
        resetZoom({ disableManualZoom: !forceEnable });
        return;
      }

      const nextPosition = getZoomedPosition({
        nextZoom: clampedZoom,
        origin,
        baseZoom,
        basePosition
      });

      setPositionValue(nextPosition);
      setZoomValue(clampedZoom);
    },
    [forceEnable, getZoomedPosition, resetZoom, setPositionValue, setZoomValue]
  );

  const stopDragging = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleToggleZoom = useCallback(() => {
    setIsZoomEnabled((prev) => {
      if (prev) {
        resetZoom();
      }
      return !prev;
    });
  }, [resetZoom]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!isInteractionEnabled || !containerRef.current) return;
      e.preventDefault();

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      applyZoom({
        nextZoom: zoomRef.current + delta,
        origin: { x: e.clientX, y: e.clientY }
      });
    },
    [applyZoom, isInteractionEnabled]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isInteractionEnabled && zoomRef.current > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX - positionRef.current.x,
          y: e.clientY - positionRef.current.y
        };
      }
    },
    [isInteractionEnabled]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && isInteractionEnabled && zoomRef.current > 1) {
        setPositionValue({
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y
        });
      }
    },
    [isDragging, isInteractionEnabled, setPositionValue]
  );

  const handleMouseUp = useCallback(() => {
    stopDragging();
  }, [stopDragging]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isInteractionEnabled) {
        return;
      }

      if (e.touches.length === 2) {
        e.preventDefault();
        pinchStateRef.current = {
          distance: getTouchDistance(e.touches),
          zoom: zoomRef.current,
          position: positionRef.current,
          midpoint: getTouchMidpoint(e.touches)
        };
        stopDragging();
        return;
      }

      if (e.touches.length === 1 && zoomRef.current > 1) {
        const touch = e.touches[0]!;
        setIsDragging(true);
        dragStartRef.current = {
          x: touch.clientX - positionRef.current.x,
          y: touch.clientY - positionRef.current.y
        };
      }
    },
    [isInteractionEnabled, stopDragging]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isInteractionEnabled) {
        return;
      }

      if (e.touches.length === 2 && pinchStateRef.current) {
        e.preventDefault();
        const nextDistance = getTouchDistance(e.touches);
        const nextZoom =
          pinchStateRef.current.zoom *
          (nextDistance / pinchStateRef.current.distance);

        applyZoom({
          nextZoom,
          origin: getTouchMidpoint(e.touches),
          baseZoom: pinchStateRef.current.zoom,
          basePosition: pinchStateRef.current.position
        });
        return;
      }

      if (e.touches.length === 1 && isDragging && zoomRef.current > 1) {
        e.preventDefault();
        const touch = e.touches[0]!;
        setPositionValue({
          x: touch.clientX - dragStartRef.current.x,
          y: touch.clientY - dragStartRef.current.y
        });
      }
    },
    [applyZoom, isDragging, isInteractionEnabled, setPositionValue]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStateRef.current = null;
      }

      if (e.touches.length === 1 && zoomRef.current > 1) {
        const touch = e.touches[0]!;
        setIsDragging(true);
        dragStartRef.current = {
          x: touch.clientX - positionRef.current.x,
          y: touch.clientY - positionRef.current.y
        };
        return;
      }

      stopDragging();
    },
    [stopDragging]
  );

  const getCursor = useCallback(() => {
    if (isInteractionEnabled && zoom > 1) {
      return isDragging ? 'grabbing' : 'grab';
    }
    return 'default';
  }, [isDragging, isInteractionEnabled, zoom]);

  return {
    containerRef,
    isZoomEnabled,
    isInteractionEnabled,
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
  };
};
