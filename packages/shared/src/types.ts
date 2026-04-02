import { ChannelPermission, type TFile, type TSettings, type TUser } from '.';

export enum ChannelType {
  TEXT = 'TEXT',
  VOICE = 'VOICE'
}

export enum StreamKind {
  AUDIO = 'audio',
  VIDEO = 'video',
  SCREEN = 'screen',
  SCREEN_AUDIO = 'screen_audio',
  EXTERNAL_VIDEO = 'external_video',
  EXTERNAL_AUDIO = 'external_audio'
}

export type TExternalStreamTrackKind = 'audio' | 'video';

export type TExternalStreamTracks = {
  audio?: boolean;
  video?: boolean;
};

export type TRemoteProducerIds = {
  remoteVideoIds: number[];
  remoteAudioIds: number[];
  remoteScreenIds: number[];
  remoteScreenAudioIds: number[];
  remoteExternalStreamIds: number[];
};

export type TPublicServerSettings = Pick<
  TSettings,
  | 'name'
  | 'description'
  | 'serverId'
  | 'storageUploadEnabled'
  | 'directMessagesEnabled'
  | 'storageQuota'
  | 'storageUploadMaxFileSize'
  | 'storageFileSharingInDirectMessages'
  | 'storageMaxAvatarSize'
  | 'storageMaxBannerSize'
  | 'storageMaxFilesPerMessage'
  | 'storageSpaceQuotaByUser'
  | 'storageOverflowAction'
  | 'enablePlugins'
  | 'enableSearch'
  | 'messageMaxTextLength'
  | 'messageMaxLines'
> & {
  webRtcMaxBitrate: number;
};

export type TRoleScope = 'global' | 'filter';

export type TRoleNumericLimit = {
  enabled: boolean;
  value: number;
};

export type TRoleStringLimit = {
  enabled: boolean;
  value: string;
};

export type TRoleLimits = {
  messagesPerMinute: TRoleNumericLimit;
  requestsPerMinute: TRoleNumericLimit;
  charsPerMessage: TRoleNumericLimit;
  linesPerMessage: TRoleNumericLimit;
  fileSizeMb: TRoleNumericLimit;
  filesPerMessage: TRoleNumericLimit;
  fileFormats: TRoleStringLimit;
};

export type TRoleAbilities = {
  call: boolean;
  videoCall: boolean;
  remoteDesktop: boolean;
};

export const DEFAULT_ROLE_RANK = 10;
export const DEFAULT_ROLE_SCOPE: TRoleScope = 'global';

export const createDefaultRoleLimits = (): TRoleLimits => ({
  messagesPerMinute: { enabled: false, value: 15 },
  requestsPerMinute: { enabled: false, value: 15 },
  charsPerMessage: { enabled: false, value: 1024 },
  linesPerMessage: { enabled: false, value: 32 },
  fileSizeMb: { enabled: false, value: 3 },
  filesPerMessage: { enabled: false, value: 9 },
  fileFormats: {
    enabled: false,
    value: 'pdf, png, jpg, jpeg, xls, xlsx, doc, docx'
  }
});

export const createDefaultRoleAbilities = (): TRoleAbilities => ({
  call: false,
  videoCall: false,
  remoteDesktop: false
});

export type TGenericObject = {
  [key: string]: any;
};

export type TGenericFunction = {
  (...args: any[]): any;
};

export type TMessageMetadata = {
  url: string;
  title?: string;
  siteName?: string;
  description?: string;
  mediaType: string;
  images?: string[];
  videos?: string[];
  favicons?: string[];
};

export type WithOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

export enum UserStatus {
  ONLINE = 'online',
  IDLE = 'idle',
  OFFLINE = 'offline'
}

export type TOwnUser = WithOptional<TUser, 'identity'>;

export type TConnectionParams = {
  token: string;
};

export type TTempFile = {
  id: string;
  originalName: string;
  size: number;
  md5: string;
  path: string;
  extension: string;
  userId: number;
};

export type TServerInfo = Pick<
  TSettings,
  'serverId' | 'name' | 'description' | 'allowNewUsers'
> & {
  logo: TFile | null;
  version: string;
  buildId: string;
  setupRequired: boolean;
};

export type TWebAppManifest = {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
};

export type TArtifact = {
  name: string;
  target: string;
  size: number;
  checksum: string;
};

export type TVersionInfo = {
  version: string;
  releaseDate: string;
  artifacts: TArtifact[];
};

export type TIpInfo = {
  ip: string;
  hostname: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  org: string;
  postal: string;
  timezone: string;
};

export type TChannelPermissionsMap = Record<ChannelPermission, boolean>;

export type TChannelUserPermissionsMap = Record<
  number,
  { channelId: number; permissions: TChannelPermissionsMap }
>;

export type TReadStateMap = Record<number, number>;

export type TDirectMessageConversation = {
  channelId: number;
  userId: number;
  unreadCount: number;
  lastMessageAt: number;
};
