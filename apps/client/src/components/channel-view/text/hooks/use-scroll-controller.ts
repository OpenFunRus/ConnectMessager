import { useCallback, useEffect, useRef, useState } from 'react';

// TODO: this might be improved in the future

type TUseScrollControllerProps = {
  messages: unknown[];
  fetching: boolean;
  hasMore: boolean;
  hasMoreAfter?: boolean;
  loadMore: () => Promise<{ preserveScroll?: boolean } | void>;
  loadNewer?: () => Promise<void> | void;
  hasTypingUsers?: boolean;
};

type TUseScrollControllerReturn = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  scrollToBottom: () => void;
  showScrollToBottom: boolean;
};

const SCROLL_THRESHOLD = 80;

type TScrollAnchor = {
  messageId: string;
  offsetTop: number;
};

const getTopVisibleAnchor = (container: HTMLDivElement): TScrollAnchor | null => {
  const containerRect = container.getBoundingClientRect();
  const messageElements = Array.from(
    container.querySelectorAll<HTMLElement>('[data-message-id]')
  );

  for (const element of messageElements) {
    const rect = element.getBoundingClientRect();

    if (rect.bottom > containerRect.top + 1) {
      return {
        messageId: element.dataset.messageId ?? '',
        offsetTop: rect.top - containerRect.top
      };
    }
  }

  return null;
};

const useScrollController = ({
  messages,
  fetching,
  hasMore,
  hasMoreAfter = false,
  loadMore,
  loadNewer,
  hasTypingUsers = false
}: TUseScrollControllerProps): TUseScrollControllerReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialScroll = useRef(false);
  const shouldStickToBottom = useRef(true);
  const previousScrollTop = useRef(0);
  const topLoadLocked = useRef(false);
  const bottomLoadLocked = useRef(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const isNearBottom = useCallback((container: HTMLDivElement) => {
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);

    return distanceFromBottom <= 120;
  }, []);

  // scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
    shouldStickToBottom.current = true;
    setShowScrollToBottom(false);
  }, []);

  // detect scroll-to-top and load more messages
  const onScroll = useCallback(() => {
    const container = containerRef.current;

    if (!container) return;

    const currentScrollTop = container.scrollTop;
    const isScrollingDown = currentScrollTop > previousScrollTop.current;
    previousScrollTop.current = currentScrollTop;

    if (container.scrollTop > SCROLL_THRESHOLD * 2) {
      topLoadLocked.current = false;
    }

    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);

    if (distanceFromBottom > SCROLL_THRESHOLD * 2) {
      bottomLoadLocked.current = false;
    }

    shouldStickToBottom.current = isNearBottom(container);
    setShowScrollToBottom(hasMoreAfter || !shouldStickToBottom.current);

    if (fetching) return;

    if (container.scrollTop <= SCROLL_THRESHOLD && hasMore && !topLoadLocked.current) {
      topLoadLocked.current = true;
      const topAnchor = getTopVisibleAnchor(container);

      loadMore().then((result) => {
        if (result?.preserveScroll === false) {
          topLoadLocked.current = false;
          return;
        }

        if (topAnchor?.messageId) {
          const target = container.querySelector<HTMLElement>(
            `[data-message-id="${topAnchor.messageId}"]`
          );

          if (target) {
            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const delta =
              targetRect.top - containerRect.top - topAnchor.offsetTop;

            container.scrollTop += delta;
          }
        }

        topLoadLocked.current = false;
        shouldStickToBottom.current = isNearBottom(container);
        setShowScrollToBottom(hasMoreAfter || !shouldStickToBottom.current);
      });
    }

    if (
      loadNewer &&
      hasMoreAfter &&
      isScrollingDown &&
      distanceFromBottom <= SCROLL_THRESHOLD &&
      !bottomLoadLocked.current
    ) {
      bottomLoadLocked.current = true;
      const topAnchor = getTopVisibleAnchor(container);

      Promise.resolve(loadNewer()).finally(() => {
        if (topAnchor?.messageId) {
          const target = container.querySelector<HTMLElement>(
            `[data-message-id="${topAnchor.messageId}"]`
          );

          if (target) {
            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const delta =
              targetRect.top - containerRect.top - topAnchor.offsetTop;

            container.scrollTop += delta;
          }
        }

        bottomLoadLocked.current = false;
        shouldStickToBottom.current = isNearBottom(container);
        setShowScrollToBottom(hasMoreAfter || !shouldStickToBottom.current);
      });
    }
  }, [
    loadMore,
    loadNewer,
    hasMore,
    hasMoreAfter,
    fetching,
    isNearBottom
  ]);

  // Handle initial scroll after messages load
  useEffect(() => {
    if (!containerRef.current) return;
    if (fetching || messages.length === 0) return;

    if (!hasInitialScroll.current) {
      // try multiple methods to ensure scroll happens after all content is rendered
      const performScroll = () => {
        scrollToBottom();
        hasInitialScroll.current = true;
        shouldStickToBottom.current = true;
        setShowScrollToBottom(false);
      };

      // 1: immediate attempt
      performScroll();

      // 2: wait for next frame
      requestAnimationFrame(() => {
        performScroll();
      });

      // 3: short timeout for any async content
      setTimeout(() => {
        performScroll();
      }, 50);

      // 4: longer timeout for images and other media
      setTimeout(() => {
        performScroll();
      }, 200);
    }
  }, [fetching, messages.length, scrollToBottom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    previousScrollTop.current = container.scrollTop;
    topLoadLocked.current = false;
    bottomLoadLocked.current = hasMoreAfter;
    setShowScrollToBottom(hasMoreAfter || !shouldStickToBottom.current);
  }, [hasMoreAfter, messages]);

  // auto-scroll on new messages if user is near bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasInitialScroll.current || messages.length === 0)
      return;

    if (hasMoreAfter) {
      return;
    }

    if (shouldStickToBottom.current) {
      // scroll after a short delay to allow content to render
      setTimeout(() => {
        scrollToBottom();
      }, 10);
    }
  }, [messages, hasTypingUsers, hasMoreAfter, scrollToBottom]);

  // keep bottom lock on container resize (input/footer height changes)
  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    if (hasMoreAfter) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!shouldStickToBottom.current) {
        return;
      }

      scrollToBottom();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreAfter, scrollToBottom]);

  return {
    containerRef,
    onScroll,
    scrollToBottom,
    showScrollToBottom
  };
};

export { useScrollController };
