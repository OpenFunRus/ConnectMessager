export enum LocalStorageKey {
  IDENTITY = 'connectmessager-identity',
  REMEMBER_CREDENTIALS = 'connectmessager-remember-identity',
  USER_PASSWORD = 'connectmessager-user-password',
  SERVER_PASSWORD = 'connectmessager-server-password',
  VITE_UI_THEME = 'vite-ui-theme',
  DEVICES_SETTINGS = 'connectmessager-devices-settings',
  FLOATING_CARD_POSITION = 'connectmessager-floating-card-position',
  RIGHT_SIDEBAR_STATE = 'connectmessager-right-sidebar-state',
  VOICE_CHAT_SIDEBAR_STATE = 'connectmessager-voice-chat-sidebar-state',
  VOICE_CHAT_SIDEBAR_CHANNEL_ID = 'connectmessager-voice-chat-sidebar-channel-id',
  VOICE_CHAT_SIDEBAR_WIDTH = 'connectmessager-voice-chat-sidebar-width',
  VOICE_CHAT_SHOW_USER_BANNERS = 'connectmessager-voice-chat-show-user-banners',
  VOLUME_SETTINGS = 'connectmessager-volume-settings',
  RECENT_EMOJIS = 'connectmessager-recent-emojis',
  DEBUG = 'connectmessager-debug',
  DRAFT_MESSAGES = 'connectmessager-draft-messages',
  HIDE_NON_VIDEO_PARTICIPANTS = 'connectmessager-hide-non-video-participants',
  THREAD_SIDEBAR_WIDTH = 'connectmessager-thread-sidebar-width',
  LEFT_SIDEBAR_WIDTH = 'connectmessager-left-sidebar-width',
  RIGHT_SIDEBAR_WIDTH = 'connectmessager-right-sidebar-width',
  CATEGORIES_EXPANDED = 'connectmessager-categories-expanded',
  AUTO_LOGIN = 'connectmessager-auto-login',
  AUTO_LOGIN_TOKEN = 'connectmessager-auto-login-token',
  CM_USER_ID = 'connectmessager-cm-user-id',
  CM_USER_IP = 'connectmessager-cm-user-ip',
  LAST_SELECTED_CHANNEL = 'connectmessager-last-selected-channel',
  AUTO_JOIN_LAST_CHANNEL = 'connectmessager-auto-join-last-channel',
  BROWSER_NOTIFICATIONS = 'connectmessager-browser-notifications',
  BROWSER_NOTIFICATIONS_FOR_MENTIONS = 'connectmessager-browser-notifications-for-mentions',
  BROWSER_NOTIFICATIONS_FOR_DMS = 'connectmessager-browser-notifications-for-dms',
  LANGUAGE = 'connectmessager-language',
  SETUP_NAME = 'connectmessager-setup-name',
  LAST_SERVER_BUILD_ID = 'connectmessager-last-server-build-id'
}

export enum SessionStorageKey {
  TOKEN = 'connectmessager-token',
  RELOADED_SERVER_BUILD_ID = 'connectmessager-reloaded-server-build-id'
}

const getLocalStorageItem = (key: LocalStorageKey): string | null => {
  return localStorage.getItem(key);
};

const getLocalStorageItemBool = (
  key: LocalStorageKey,
  defaultValue: boolean = false
): boolean => {
  const item = localStorage.getItem(key);

  if (item === null) {
    return defaultValue ?? false;
  }

  return item === 'true';
};

const setLocalStorageItemBool = (
  key: LocalStorageKey,
  value: boolean
): void => {
  localStorage.setItem(key, value.toString());
};

const getLocalStorageItemAsNumber = (
  key: LocalStorageKey,
  defaultValue?: number
): number | undefined => {
  const item = localStorage.getItem(key);

  if (item === null) {
    return defaultValue;
  }

  const parsed = parseInt(item, 10);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const getLocalStorageItemAsJSON = <T>(
  key: LocalStorageKey,
  defaultValue: T | undefined = undefined
): T | undefined => {
  const item = localStorage.getItem(key);

  if (item) {
    return JSON.parse(item) as T;
  }

  return defaultValue;
};

const setLocalStorageItemAsJSON = <T>(key: LocalStorageKey, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const setLocalStorageItem = (key: LocalStorageKey, value: string): void => {
  localStorage.setItem(key, value);
};

const removeLocalStorageItem = (key: LocalStorageKey): void => {
  localStorage.removeItem(key);
};

const getSessionStorageItem = (key: SessionStorageKey): string | null => {
  return sessionStorage.getItem(key);
};

const setSessionStorageItem = (key: SessionStorageKey, value: string): void => {
  sessionStorage.setItem(key, value);
};

const removeSessionStorageItem = (key: SessionStorageKey): void => {
  sessionStorage.removeItem(key);
};

export {
  getLocalStorageItem,
  getLocalStorageItemAsJSON,
  getLocalStorageItemAsNumber,
  getLocalStorageItemBool,
  getSessionStorageItem,
  removeLocalStorageItem,
  removeSessionStorageItem,
  setLocalStorageItem,
  setLocalStorageItemAsJSON,
  setLocalStorageItemBool,
  setSessionStorageItem
};


