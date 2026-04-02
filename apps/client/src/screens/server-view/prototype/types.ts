import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import type { TFile, TJoinedMessageReaction } from '@connectmessager/shared';

export type TMessage = {
  id: number;
  userId: number;
  author: string;
  avatar?: TFile | null;
  html: string;
  text: string;
  quote?: TActiveQuote | null;
  createdAt: number;
  files: TFile[];
  reactions: TJoinedMessageReaction[];
  pinned?: boolean;
  pinnedAt?: number | null;
  pinnedBy?: number | null;
  hasOwnMention?: boolean;
  hasOwnQuote?: boolean;
  emojiOnly?: boolean;
  emojiOnlyCount?: number;
};

export type TMessageReactionPickerState = {
  messageId: number;
  x: number;
  y: number;
};

export type TActiveQuote = {
  messageId: number;
  userId: number;
  author: string;
  text: string;
};

export type TChatPagingState = {
  cursor: number | null;
  hasMore: boolean;
  beforeBuffer: TMessage[];
  afterBuffer: TMessage[];
  currentWindowNewestId: number | null;
};

export type TScrollAnchor = {
  messageId: string;
  offsetTop: number;
};

export type TMessageSegment =
  | {
      type: 'text';
      value: string;
    }
  | {
      type: 'emoji';
      token: string;
      emoji: TEmojiItem;
    };

export type TGifItem = {
  id: string;
  url: string;
  previewUrl: string;
};

export type TMessageContextMenuState = {
  messageId: number;
  messageUserId: number;
  isOwnMessage: boolean;
  messageAuthor: string;
  messageText: string;
  messagePinned: boolean;
  x: number;
  y: number;
};

export type TMentionNotification = {
  messageId: number;
  messageUserId: number;
  channelId: number;
  chatId: string;
  author: string;
  text: string;
  html: string;
  createdAt: number;
};

export type TChat = {
  id: string;
  type: 'contacts' | 'groups';
  title: string;
  status: string;
  unread: number;
  channelId?: number | null;
  isMainGroup?: boolean;
  canManage?: boolean;
  avatar?: TFile | null;
};

export type TSettingsRole = {
  id: number;
  name: string;
  rank: number;
  color: string;
  scope: 'global' | 'filter';
  filter?: string;
  permissions: {
    canViewSettings: boolean;
    canAddRoles: boolean;
    canEditRoles: boolean;
    canManageGroups: boolean;
    canInviteGroups: boolean;
    canInviteUsers: boolean;
  };
  limits: {
    messagesPerMinute: { enabled: boolean; value: number };
    requestsPerMinute: { enabled: boolean; value: number };
    charsPerMessage: { enabled: boolean; value: number };
    linesPerMessage: { enabled: boolean; value: number };
    fileSizeMb: { enabled: boolean; value: number };
    filesPerMessage: { enabled: boolean; value: number };
    fileFormats: { enabled: boolean; value: string };
  };
  abilities: {
    call: boolean;
    videoCall: boolean;
    remoteDesktop: boolean;
  };
};

export type TSettingsPermissions = {
  canViewSettings: boolean;
  canAddRoles: boolean;
  canEditRoles: boolean;
  canManageGroups: boolean;
  canInviteGroups: boolean;
  canInviteUsers: boolean;
};

export type TSettingsUser = {
  id: number;
  name: string;
  rank: number;
  color: string;
  banned: boolean;
};

export type TMessageImageThumbnailProps = {
  file: TFile;
  onOpen: (file: TFile) => void;
  onDownload: (file: TFile) => void;
};
