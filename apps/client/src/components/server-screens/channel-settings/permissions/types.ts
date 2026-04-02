import type { ChannelPermission } from '@connectmessager/shared';

export type TChannelPermission = {
  permission: ChannelPermission;
  allow: boolean;
};

export type TChannelPermissionType = 'role' | 'user';


