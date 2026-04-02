const messageHighlightTimeouts = new WeakMap<Element, NodeJS.Timeout>();

export const getMessagesContainer = () =>
  document.querySelector('[data-messages-container]');

export const findMessageElement = (messageId: number) =>
  getMessagesContainer()?.querySelector(`[data-message-id="${messageId}"]`) ??
  null;

export const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export const highlightMessageElement = async (
  element: Element,
  highlightTime: number
) => {
  // yield twice to ensure the element is rendered and any pending layout calculations are done before we try to scroll to it and apply the highlight styles
  await nextFrame();
  await nextFrame();

  element.scrollIntoView({ behavior: 'auto', block: 'center' });

  // A second centering pass helps after late layout shifts
  setTimeout(() => {
    element.scrollIntoView({ behavior: 'auto', block: 'center' });
  }, 50);

  element.classList.add('message-jump-highlight');

  if (messageHighlightTimeouts.has(element)) {
    clearTimeout(messageHighlightTimeouts.get(element));
  }

  const timeoutId = setTimeout(() => {
    element.classList.remove('message-jump-highlight');

    messageHighlightTimeouts.delete(element);
  }, highlightTime);

  messageHighlightTimeouts.set(element, timeoutId);
};

export const waitForMessageElement = (
  messageId: number,
  timeoutMs = 3000
): Promise<Element | null> =>
  new Promise((resolve) => {
    const existing = findMessageElement(messageId);

    if (existing) {
      resolve(existing);
      return;
    }

    const container = getMessagesContainer();

    if (!container) {
      resolve(null);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = findMessageElement(messageId);

      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
