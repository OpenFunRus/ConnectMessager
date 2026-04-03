type TDesktopNotificationOptions = {
  chatId?: string;
  unreadCount?: number;
  silent?: boolean;
};

type TDesktopBridge = {
  notify: (title: string, message: string, options?: TDesktopNotificationOptions) => boolean;
  setUnreadCount: (count: number) => boolean;
  flashWindow: () => boolean;
};

declare global {
  interface Window {
    ConnectMessagerDesktop?: TDesktopBridge;
  }
}

const getDesktopBridge = (): TDesktopBridge | null => {
  return window.ConnectMessagerDesktop ?? null;
};

const isDesktopBridgeAvailable = () => {
  return getDesktopBridge() !== null;
};

const showDesktopNotification = (
  title: string,
  message: string,
  options?: TDesktopNotificationOptions
) => {
  return getDesktopBridge()?.notify(title, message, options) ?? false;
};

const setDesktopUnreadCount = (count: number) => {
  return getDesktopBridge()?.setUnreadCount(Math.max(0, count)) ?? false;
};

const flashDesktopWindow = () => {
  return getDesktopBridge()?.flashWindow() ?? false;
};

export {
  flashDesktopWindow,
  isDesktopBridgeAvailable,
  setDesktopUnreadCount,
  showDesktopNotification
};
