import { Permission } from '@connectmessager/shared';
import type { TChat, TSettingsRole } from './types';

export const SETTINGS_ROLE_COLOR_POOL = [
  '#9775fa', '#845ef7', '#5f3dc4', '#e03131', '#c92a2a', '#a61e4d', '#f08c00',
  '#e67700', '#f59f00', '#2f9e44', '#2b8a3e', '#37b24d', '#1971c2', '#1864ab',
  '#1c7ed6', '#0b7285', '#1098ad', '#0ca678', '#5c940d', '#74b816', '#9c36b5',
  '#862e9c', '#d6336c', '#e64980', '#495057', '#343a40', '#212529', '#364fc7',
  '#4263eb', '#087f5b', '#d9480f', '#ff922b'
] as const;

export const ROLE_NAME_ALIASES: Record<string, string> = {
  developer: 'разработчик',
  'разработчик': 'разработчик',
  admin: 'администратор',
  administrator: 'администратор',
  'администратор': 'администратор',
  sysadmin: 'сисадмин',
  'сисадмин': 'сисадмин',
  security: 'служба безопасности',
  'служба безопасности': 'служба безопасности',
  curator: 'куратор',
  'куратор': 'куратор',
  member: 'пользователь',
  user: 'пользователь',
  'пользователь': 'пользователь'
};

export const SETTINGS_ROLE_FILTER_OPTIONS = ['Все', 'Сисадмины', 'Самара'] as const;
export const FILTER_ALL = 'Все';

export const SETTINGS_TO_SERVER_PERMISSION_MAP: Array<{
  key: keyof TSettingsRole['permissions'];
  permission: Permission;
}> = [
  { key: 'canViewSettings', permission: Permission.VIEW_SETTINGS_PANEL },
  { key: 'canAddRoles', permission: Permission.ADD_ROLES },
  { key: 'canEditRoles', permission: Permission.EDIT_ROLES },
  { key: 'canManageGroups', permission: Permission.MANAGE_GROUP_CHATS },
  { key: 'canInviteGroups', permission: Permission.GENERATE_GROUP_INVITES },
  { key: 'canInviteUsers', permission: Permission.GENERATE_USER_INVITES }
];

export const NOTES_CHAT_ID = 'notes-fixed';
export const MAIN_GROUP_CHAT_ID = 'group-main';
export const GROUP_CHAT_ID_PREFIX = 'group-';

export const notesChat: TChat = {
  id: NOTES_CHAT_ID,
  type: 'contacts',
  title: 'Заметки',
  status: 'личные заметки',
  unread: 0
};

export const SCROLL_BOTTOM_THRESHOLD_PX = 48;
export const SCROLL_TOP_LOAD_THRESHOLD_PX = 80;
export const CURRENT_MESSAGES_LIMIT = 50;
export const HISTORY_MESSAGES_LIMIT = 50;
export const MAX_VISIBLE_MESSAGES = 100;
export const MESSAGE_GROUP_WINDOW_MS = 60_000;
export const EMOJI_SHORTCODE_REGEX = /:([a-z0-9_+-]+):/gi;
export const GIF_MESSAGE_PREFIX = 'cmx-gif-url:';
export const RECENT_EMOJIS_STORAGE_KEY = 'cmx-recent-emojis-v1';
export const RECENT_GIFS_STORAGE_KEY = 'cmx-recent-gifs-v1';
export const MAX_RECENT_EMOJIS = 32;
export const MAX_RECENT_GIFS = 10;
export const TENOR_LIMIT = 10;
export const MAX_COMPOSER_SYMBOLS = 1024;
export const MAX_COMPOSER_LINES = 32;

export const EMOJI_CATEGORY_LABELS_RU: Record<string, string> = {
  recent: 'Последние',
  'people & body': 'Люди',
  'animals & nature': 'Природа',
  'food & drink': 'Еда',
  activities: 'Активности',
  'travel & places': 'Путешествия',
  objects: 'Предметы',
  symbols: 'Символы',
  flags: 'Флаги'
};
