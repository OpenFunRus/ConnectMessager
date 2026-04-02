import { useCallback, useEffect, useState } from 'react';

type TFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type TFullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

const getIsFullscreenActive = (): boolean => {
  const fullDocument = document as TFullscreenDocument;

  return Boolean(
    document.fullscreenElement ?? fullDocument.webkitFullscreenElement
  );
};

const requestElementFullscreen = async (
  element: TFullscreenElement
): Promise<void> => {
  if (element.requestFullscreen) {
    await element.requestFullscreen();
    return;
  }

  if (element.webkitRequestFullscreen) {
    await element.webkitRequestFullscreen();
  }
};

const exitAnyFullscreen = async (): Promise<void> => {
  const fullDocument = document as TFullscreenDocument;

  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }

  if (fullDocument.webkitExitFullscreen) {
    await fullDocument.webkitExitFullscreen();
  }
};

const useMediaFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenActive = getIsFullscreenActive();
      setIsFullscreen(fullscreenActive);

      if (!fullscreenActive) {
        setRotationDeg(0);
      }
    };

    handleFullscreenChange();

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener(
      'webkitfullscreenchange',
      handleFullscreenChange as EventListener
    );

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange as EventListener
      );
    };
  }, []);

  const toggleFullscreen = useCallback(
    async (element: HTMLElement | null | undefined) => {
      if (isFullscreen) {
        await exitAnyFullscreen();
        return;
      }

      if (!element) {
        return;
      }

      await requestElementFullscreen(element as TFullscreenElement);
    },
    [isFullscreen]
  );

  const rotateClockwise = useCallback(() => {
    setRotationDeg((prev) => (prev + 90) % 360);
  }, []);

  return {
    isFullscreen,
    rotationDeg,
    toggleFullscreen,
    rotateClockwise
  };
};

export { useMediaFullscreen };
