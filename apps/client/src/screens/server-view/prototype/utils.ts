import { FileCategory, UserStatus, getFileCategory, imageExtensions, type TFile } from '@connectmessager/shared';
import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import {
  EMOJI_SHORTCODE_REGEX,
  FILTER_ALL,
  GIF_MESSAGE_PREFIX,
  GROUP_CHAT_ID_PREFIX,
  MAIN_GROUP_CHAT_ID,
  MAX_RECENT_EMOJIS,
  MAX_RECENT_GIFS,
  NOTES_CHAT_ID,
  RECENT_EMOJIS_STORAGE_KEY,
  RECENT_GIFS_STORAGE_KEY
} from './constants';
import type {
  TActiveQuote,
  TChatPagingState,
  TMessage,
  TMessageSegment,
  TScrollAnchor,
  TSettingsRole
} from './types';

export const COMPOSER_LEADING_GUARD = '\u200B';

export const stripComposerInvisibleChars = (value: string) =>
  value.replace(/\u200B/g, '');

export const createDefaultRolePermissions = (): TSettingsRole['permissions'] => ({
  canViewSettings: false,
  canAddRoles: false,
  canEditRoles: false,
  canManageGroups: false,
  canInviteGroups: false,
  canInviteUsers: false
});

export const createDefaultRoleLimits = (): TSettingsRole['limits'] => ({
  messagesPerMinute: { enabled: false, value: 15 },
  requestsPerMinute: { enabled: false, value: 15 },
  charsPerMessage: { enabled: false, value: 1024 },
  linesPerMessage: { enabled: false, value: 32 },
  fileSizeMb: { enabled: false, value: 3 },
  filesPerMessage: { enabled: false, value: 9 },
  fileFormats: { enabled: false, value: 'pdf, png, jpg, jpeg, xls, xlsx, doc, docx' }
});

export const createDefaultRoleAbilities = (): TSettingsRole['abilities'] => ({
  call: false,
  videoCall: false,
  remoteDesktop: false
});

export const countEnabledRoleLimits = (role: TSettingsRole) =>
  Object.values(role.limits).filter((item) => item.enabled).length;

export const normalizeRoleName = (name: string) => name.trim().toLowerCase();

export const normalizeVisibilityFilter = (
  role?: Pick<TSettingsRole, 'scope' | 'filter'> | null
) => {
  if (!role || role.scope === 'global') return FILTER_ALL;

  const raw = (role.filter || '').trim();
  if (!raw) return FILTER_ALL;

  const lower = raw.toLowerCase();
  if (lower === 'все' || lower === 'all') return FILTER_ALL;
  if (lower === 'сисадмины' || lower === 'sysadmins') return 'Сисадмины';
  if (lower === 'самара') return 'Самара';

  return raw;
};

export const canRolesSeeEachOther = (
  leftRole?: Pick<TSettingsRole, 'scope' | 'filter'> | null,
  rightRole?: Pick<TSettingsRole, 'scope' | 'filter'> | null
) => {
  const leftFilter = normalizeVisibilityFilter(leftRole);
  const rightFilter = normalizeVisibilityFilter(rightRole);
  return leftFilter === FILTER_ALL || rightFilter === FILTER_ALL || leftFilter === rightFilter;
};

export const canManageGroupWithFilter = (
  managerRole?: Pick<TSettingsRole, 'scope' | 'filter'> | null,
  groupFilter?: string | null
) => {
  const managerFilter = normalizeVisibilityFilter(managerRole);
  const normalizedGroupFilter = normalizeVisibilityFilter({
    scope: groupFilter === FILTER_ALL ? 'global' : 'filter',
    filter: groupFilter ?? ''
  });

  return managerFilter === FILTER_ALL || managerFilter === normalizedGroupFilter;
};

export const createDefaultPagingState = (): TChatPagingState => ({
  cursor: null,
  hasMore: true,
  beforeBuffer: [],
  afterBuffer: [],
  currentWindowNewestId: null
});

export const mergeMessagesAsc = (current: TMessage[], incoming: TMessage[]) => {
  const byId = new Map<number, TMessage>();

  current.forEach((message) => {
    byId.set(message.id, message);
  });

  incoming.forEach((message) => {
    byId.set(message.id, message);
  });

  return [...byId.values()].sort((a, b) => a.id - b.id);
};

export const mergeMessageIdsAsc = (current: number[], incoming: number[]) =>
  [...new Set([...current, ...incoming])].sort((a, b) => a - b);

export const getTopVisibleAnchor = (container: HTMLElement): TScrollAnchor | null => {
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

export const parseMessageSegments = (
  text: string,
  emojiByShortcode: Map<string, TEmojiItem>
): TMessageSegment[] => {
  if (!text) {
    return [];
  }

  const segments: TMessageSegment[] = [];
  EMOJI_SHORTCODE_REGEX.lastIndex = 0;
  let cursor = 0;

  for (const match of text.matchAll(EMOJI_SHORTCODE_REGEX)) {
    const matchIndex = match.index ?? -1;
    const rawToken = match[0];
    const shortcodeName = (match[1] ?? '').toLowerCase();
    if (matchIndex < 0) continue;

    const before = text.slice(cursor, matchIndex);
    if (before) {
      segments.push({ type: 'text', value: before });
    }

    const emoji = emojiByShortcode.get(shortcodeName);
    if (emoji) {
      segments.push({
        type: 'emoji',
        token: rawToken,
        emoji
      });
    } else {
      segments.push({ type: 'text', value: rawToken });
    }

    cursor = matchIndex + rawToken.length;
  }

  const tail = text.slice(cursor);
  if (tail) {
    segments.push({ type: 'text', value: tail });
  }

  return segments;
};

export const extractDisplayTextFromHtml = (html: string) =>
  html
    .replace(/<img[^>]*class="ProseMirror-separator"[^>]*>/gi, '')
    .replace(/<br[^>]*class="ProseMirror-trailingBreak"[^>]*>/gi, '')
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<\/(p|div|li|blockquote|pre|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const getPlainTextFromCopiedHtml = (html: string) =>
  html
    .replace(/<img[^>]*class="ProseMirror-separator"[^>]*>/gi, '')
    .replace(/<br[^>]*class="ProseMirror-trailingBreak"[^>]*>/gi, '')
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<\/(p|div|li|blockquote|pre|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

export const getInitials = (title: string) => {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export const getStatusText = (status?: string) => {
  if (status === UserStatus.ONLINE) return 'в сети';
  if (status === UserStatus.IDLE) return 'не активен';
  return 'не в сети';
};

export const escapePlainTextToHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '<br />');

const CMX_QUOTE_TOKEN_PREFIX = ':::cmx-quote|';
const CMX_QUOTE_TOKEN_REGEX = /:::cmx-quote\|(\d+)\|(\d+)\|([^|]*)\|([^:]*):::/i;
const CMX_QUOTE_PARAGRAPH_REGEX = /<p>\s*:::cmx-quote\|\d+\|\d+\|[^|]*\|[^:]*:::\s*<\/p>/i;
const CMX_QUOTE_PREVIEW_MAX_LENGTH = 48;

export const normalizeQuoteText = (value: string) =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const encodeQuoteTokenPart = (value: string) =>
  value.replace(/%/g, '%25').replace(/\|/g, '%7C').replace(/:/g, '%3A');

const decodeQuoteTokenPart = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value.replace(/%3A/gi, ':').replace(/%7C/gi, '|').replace(/%25/gi, '%');
  }
};

const clampQuotePreviewText = (value: string) =>
  value.length > CMX_QUOTE_PREVIEW_MAX_LENGTH
    ? `${value.slice(0, Math.max(0, CMX_QUOTE_PREVIEW_MAX_LENGTH - 3)).trimEnd()}...`
    : value;

export const buildQuotedMessageHtml = (quote: TActiveQuote) => {
  const previewText = clampQuotePreviewText(normalizeQuoteText(quote.text) || '[вложение]');
  const authorLabel = quote.author.trim() || 'Пользователь';
  const token = `${CMX_QUOTE_TOKEN_PREFIX}${quote.messageId}|${quote.userId}|${encodeQuoteTokenPart(authorLabel)}|${encodeQuoteTokenPart(previewText)}:::`;
  return `<p>${token}</p>`;
};

export const extractMessageQuoteFromHtml = (
  html: string | null | undefined
): TActiveQuote | null => {
  if (!html) {
    return null;
  }

  const match = html.match(CMX_QUOTE_TOKEN_REGEX);
  if (!match) {
    return null;
  }

  const messageId = Number(match[1]);
  const userId = Number(match[2]);
  const author = decodeQuoteTokenPart(match[3] ?? '').trim();
  const text = decodeQuoteTokenPart(match[4] ?? '').trim();

  if (!Number.isFinite(messageId) || !Number.isFinite(userId) || !author) {
    return null;
  }

  return {
    messageId,
    userId,
    author,
    text: text || '[вложение]'
  };
};

export const stripMessageQuoteFromHtml = (html: string | null | undefined) => {
  if (!html) {
    return html ?? '';
  }

  return html
    .replace(CMX_QUOTE_PARAGRAPH_REGEX, '')
    .replace(CMX_QUOTE_TOKEN_REGEX, '')
    .trim();
};

export const hasQuoteForUser = (html: string | null | undefined, userId?: number) => {
  if (!html || !userId) {
    return false;
  }

  const quote = extractMessageQuoteFromHtml(html);
  return quote?.userId === userId;
};

export const getFileIconNameByExtension = (extension: string) => {
  const normalizedExtension = extension.startsWith('.')
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;
  const category = getFileCategory(normalizedExtension);
  if (category === FileCategory.IMAGE) return 'photo';
  if (category === FileCategory.VIDEO) return 'video';
  if (category === FileCategory.AUDIO) return 'music';
  if (category === FileCategory.DOCUMENT) return 'file-text';
  return 'file';
};

export const isImageFile = (file: TFile) => {
  const normalizedExtension = file.extension.startsWith('.')
    ? file.extension.toLowerCase()
    : `.${file.extension.toLowerCase()}`;
  const byExtension = imageExtensions.includes(normalizedExtension);
  const byMimeType = (file.mimeType || '').toLowerCase().startsWith('image/');
  return byExtension || byMimeType;
};

export const getDmUserIdFromChatId = (chatId: string, ownUserId?: number): number | null => {
  if (chatId === NOTES_CHAT_ID) {
    return ownUserId ?? null;
  }
  if (chatId === MAIN_GROUP_CHAT_ID || !chatId.startsWith('contact-')) {
    return null;
  }
  const raw = chatId.slice('contact-'.length);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getGroupChatId = (channelId: number) => `${GROUP_CHAT_ID_PREFIX}${channelId}`;

export const getGroupChannelIdFromChatId = (chatId: string) => {
  if (!chatId.startsWith(GROUP_CHAT_ID_PREFIX)) {
    return null;
  }

  const raw = chatId.slice(GROUP_CHAT_ID_PREFIX.length);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const loadRecentEmojiNames = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(RECENT_EMOJIS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === 'string').slice(0, MAX_RECENT_EMOJIS);
  } catch {
    return [];
  }
};

export const loadRecentGifUrls = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(RECENT_GIFS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === 'string').slice(0, MAX_RECENT_GIFS);
  } catch {
    return [];
  }
};

export const getGifUrlFromMessageText = (text: string): string | null => {
  if (!text?.startsWith(GIF_MESSAGE_PREFIX)) return null;
  const rawUrl = text.slice(GIF_MESSAGE_PREFIX.length).trim();
  if (!rawUrl) return null;
  if (!/^https?:\/\//i.test(rawUrl)) return null;
  return rawUrl;
};

export const convertComposerHtmlToShortcodes = (html: string) => {
  if (!html || typeof DOMParser === 'undefined') {
    return stripComposerInvisibleChars(html);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('span[data-type="emoji"]').forEach((node) => {
    const name = node.getAttribute('data-name')?.trim();
    if (!name) return;
    node.replaceWith(doc.createTextNode(`:${name}:`));
  });

  return stripComposerInvisibleChars(doc.body.innerHTML);
};
