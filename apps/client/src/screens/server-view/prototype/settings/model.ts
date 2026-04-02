import type { Permission } from '@connectmessager/shared';
import { SETTINGS_TO_SERVER_PERMISSION_MAP } from '../constants';
import { countEnabledRoleLimits } from '../utils';

export { SETTINGS_TO_SERVER_PERMISSION_MAP, countEnabledRoleLimits };

export type TSettingsServerPermission = Permission;
