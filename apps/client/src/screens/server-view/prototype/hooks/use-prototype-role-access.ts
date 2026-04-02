import { useRoles } from '@/features/server/roles/hooks';
import { Permission, type TJoinedRole } from '@connectmessager/shared';
import { FILTER_ALL, MAX_COMPOSER_LINES, MAX_COMPOSER_SYMBOLS, ROLE_NAME_ALIASES } from '../constants';
import type { TSettingsPermissions, TSettingsRole } from '../types';
import {
  createDefaultRoleAbilities,
  createDefaultRoleLimits,
  createDefaultRolePermissions,
  normalizeRoleName,
  normalizeVisibilityFilter
} from '../utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

const createInitialSettingsRoles = (): TSettingsRole[] => [
  {
    id: 1,
    name: 'Разработчик',
    rank: 100,
    color: '#9775fa',
    scope: 'global',
    filter: FILTER_ALL,
    permissions: {
      canViewSettings: true,
      canAddRoles: true,
      canEditRoles: true,
      canManageGroups: true,
      canInviteGroups: true,
      canInviteUsers: true
    },
    limits: createDefaultRoleLimits(),
    abilities: createDefaultRoleAbilities()
  },
  {
    id: 2,
    name: 'Администратор',
    rank: 90,
    color: '#e03131',
    scope: 'global',
    filter: FILTER_ALL,
    permissions: {
      canViewSettings: true,
      canAddRoles: true,
      canEditRoles: true,
      canManageGroups: true,
      canInviteGroups: true,
      canInviteUsers: true
    },
    limits: createDefaultRoleLimits(),
    abilities: createDefaultRoleAbilities()
  },
  {
    id: 3,
    name: 'Сисадмин',
    rank: 80,
    color: '#1971c2',
    scope: 'global',
    filter: FILTER_ALL,
    permissions: {
      canViewSettings: true,
      canAddRoles: true,
      canEditRoles: true,
      canManageGroups: true,
      canInviteGroups: true,
      canInviteUsers: true
    },
    limits: createDefaultRoleLimits(),
    abilities: createDefaultRoleAbilities()
  },
  {
    id: 4,
    name: 'Служба безопасности',
    rank: 70,
    color: '#f08c00',
    scope: 'global',
    filter: FILTER_ALL,
    permissions: {
      canViewSettings: true,
      canAddRoles: false,
      canEditRoles: false,
      canManageGroups: true,
      canInviteGroups: true,
      canInviteUsers: true
    },
    limits: {
      ...createDefaultRoleLimits(),
      messagesPerMinute: { enabled: true, value: 15 }
    },
    abilities: createDefaultRoleAbilities()
  },
  {
    id: 5,
    name: 'Куратор',
    rank: 40,
    color: '#37b24d',
    scope: 'filter',
    filter: 'Самара',
    permissions: {
      canViewSettings: true,
      canAddRoles: false,
      canEditRoles: false,
      canManageGroups: true,
      canInviteGroups: true,
      canInviteUsers: true
    },
    limits: {
      ...createDefaultRoleLimits(),
      messagesPerMinute: { enabled: true, value: 15 }
    },
    abilities: createDefaultRoleAbilities()
  },
  {
    id: 6,
    name: 'Пользователь',
    rank: 10,
    color: '#495057',
    scope: 'filter',
    filter: 'Самара',
    permissions: createDefaultRolePermissions(),
    limits: {
      ...createDefaultRoleLimits(),
      messagesPerMinute: { enabled: true, value: 15 }
    },
    abilities: createDefaultRoleAbilities()
  }
];

type TUsePrototypeRoleAccessParams = {
  ownUserRoleIds: number[];
};

const usePrototypeRoleAccess = ({ ownUserRoleIds }: TUsePrototypeRoleAccessParams) => {
  const serverRoles = useRoles();
  const [settingsRoles, setSettingsRoles] = useState<TSettingsRole[]>(createInitialSettingsRoles);

  const serverRoleById = useMemo(
    () =>
      serverRoles.reduce<Record<number, TJoinedRole>>((acc, role) => {
        acc[role.id] = {
          ...role,
          permissions: role.permissions as Permission[]
        };
        return acc;
      }, {}),
    [serverRoles]
  );

  const getCanonicalRoleName = useCallback((name: string) => {
    const normalized = normalizeRoleName(name);
    return ROLE_NAME_ALIASES[normalized] || normalized;
  }, []);

  const findServerRoleByLocalName = useCallback(
    (localRoleName: string) => {
      const canonicalLocal = getCanonicalRoleName(localRoleName);
      return serverRoles.find((serverRole) => getCanonicalRoleName(serverRole.name) === canonicalLocal);
    },
    [getCanonicalRoleName, serverRoles]
  );

  const mapServerPermissionsToSettings = useCallback(
    (serverPermissions: string[]): TSettingsRole['permissions'] => {
      const has = (permission: Permission) => serverPermissions.includes(permission);
      return {
        canViewSettings: has(Permission.VIEW_SETTINGS_PANEL),
        canAddRoles: has(Permission.ADD_ROLES),
        canEditRoles: has(Permission.EDIT_ROLES),
        canManageGroups: has(Permission.MANAGE_GROUP_CHATS),
        canInviteGroups: has(Permission.GENERATE_GROUP_INVITES),
        canInviteUsers: has(Permission.GENERATE_USER_INVITES)
      };
    },
    []
  );

  const mapServerRoleToSettings = useCallback(
    (serverRole: TJoinedRole): TSettingsRole => ({
      id: serverRole.id,
      name: serverRole.name,
      rank: serverRole.rank ?? 10,
      color: serverRole.color || '#495057',
      scope: serverRole.scope ?? 'global',
      filter: normalizeVisibilityFilter({
        scope: serverRole.scope ?? 'global',
        filter: serverRole.filter ?? ''
      }),
      permissions: mapServerPermissionsToSettings(serverRole.permissions as string[]),
      limits: serverRole.limits ?? createDefaultRoleLimits(),
      abilities: serverRole.abilities ?? createDefaultRoleAbilities()
    }),
    [mapServerPermissionsToSettings]
  );

  const resolveLocalRoleByServerRole = useCallback(
    (roleId: number) => {
      const serverRole = serverRoleById[roleId];
      if (serverRole) {
        return mapServerRoleToSettings(serverRole);
      }
      return undefined;
    },
    [mapServerRoleToSettings, serverRoleById]
  );

  const getHighestLocalRole = useCallback(
    (roleIds: number[]) => {
      const assignedRoles = roleIds
        .map((roleId) => resolveLocalRoleByServerRole(roleId))
        .filter(Boolean) as TSettingsRole[];

      if (assignedRoles.length === 0) return null;
      return (
        [...assignedRoles].sort((a, b) => {
          if (b.rank !== a.rank) return b.rank - a.rank;
          if (a.scope !== b.scope) return a.scope === 'filter' ? -1 : 1;
          return b.id - a.id;
        })[0] ?? null
      );
    },
    [resolveLocalRoleByServerRole]
  );

  const currentUserLocalRole = useMemo(
    () => getHighestLocalRole(ownUserRoleIds),
    [getHighestLocalRole, ownUserRoleIds]
  );

  const currentUserRank = currentUserLocalRole?.rank ?? 10;
  const canManageUsersStrict = currentUserLocalRole?.name === 'Разработчик';
  const roleMessageCharsLimit =
    currentUserLocalRole?.limits.charsPerMessage.enabled
      ? currentUserLocalRole.limits.charsPerMessage.value
      : MAX_COMPOSER_SYMBOLS;
  const roleMessageLinesLimit =
    currentUserLocalRole?.limits.linesPerMessage.enabled
      ? currentUserLocalRole.limits.linesPerMessage.value
      : MAX_COMPOSER_LINES;
  const roleFilesPerMessageLimit =
    currentUserLocalRole?.limits.filesPerMessage.enabled
      ? currentUserLocalRole.limits.filesPerMessage.value
      : null;
  const roleFileSizeBytesLimit =
    currentUserLocalRole?.limits.fileSizeMb.enabled
      ? currentUserLocalRole.limits.fileSizeMb.value * 1024 * 1024
      : null;

  const roleAllowedFileExtensions = useMemo(() => {
    if (!currentUserLocalRole?.limits.fileFormats.enabled) return null;
    return new Set(
      currentUserLocalRole.limits.fileFormats.value
        .split(',')
        .map((part) => part.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean)
    );
  }, [currentUserLocalRole?.limits.fileFormats.enabled, currentUserLocalRole?.limits.fileFormats.value]);

  const roleAllowedFileFormatsLabel = useMemo(() => {
    if (!currentUserLocalRole?.limits.fileFormats.enabled) return '';
    return currentUserLocalRole.limits.fileFormats.value
      .split(',')
      .map((part) => part.trim().replace(/^\./, ''))
      .filter(Boolean)
      .join(', ');
  }, [currentUserLocalRole?.limits.fileFormats.enabled, currentUserLocalRole?.limits.fileFormats.value]);

  const canUseVoiceCalls = Boolean(currentUserLocalRole?.abilities.call);
  const canUseVideoCalls = Boolean(currentUserLocalRole?.abilities.videoCall);
  const canUseRemoteDesktop = Boolean(currentUserLocalRole?.abilities.remoteDesktop);

  const currentUserPermissionSet = useMemo<Set<Permission>>(() => {
    const isDeveloper = ownUserRoleIds.length === 0 || ownUserRoleIds.includes(1);
    if (isDeveloper) return new Set(Object.values(Permission) as Permission[]);

    const assignedServerRoles = ownUserRoleIds.map((roleId) => serverRoleById[roleId]).filter(Boolean);
    return new Set(
      assignedServerRoles.flatMap((role) =>
        role.permissions.filter((permission): permission is Permission =>
          Object.values(Permission).includes(permission as Permission)
        )
      )
    );
  }, [ownUserRoleIds, serverRoleById]);

  const hasCurrentPermission = useCallback(
    (permission: Permission) => currentUserPermissionSet.has(permission),
    [currentUserPermissionSet]
  );

  const settingsPermissions = useMemo<TSettingsPermissions>(
    () => ({
      canViewSettings: hasCurrentPermission(Permission.VIEW_SETTINGS_PANEL),
      canAddRoles: hasCurrentPermission(Permission.ADD_ROLES),
      canEditRoles: hasCurrentPermission(Permission.EDIT_ROLES),
      canManageGroups: hasCurrentPermission(Permission.MANAGE_GROUP_CHATS),
      canInviteGroups: hasCurrentPermission(Permission.GENERATE_GROUP_INVITES),
      canInviteUsers: hasCurrentPermission(Permission.GENERATE_USER_INVITES)
    }),
    [hasCurrentPermission]
  );

  const visibleSettingsRoles = useMemo(
    () => settingsRoles.filter((role) => role.rank <= currentUserRank),
    [currentUserRank, settingsRoles]
  );

  useEffect(() => {
    if (serverRoles.length === 0) return;
    setSettingsRoles(
      [...serverRoles]
        .sort((a, b) => b.rank - a.rank || a.id - b.id)
        .map((role) => mapServerRoleToSettings(role))
    );
  }, [mapServerRoleToSettings, serverRoles]);

  return {
    serverRoles,
    settingsRoles,
    setSettingsRoles,
    currentUserLocalRole,
    currentUserRank,
    canManageUsersStrict,
    roleMessageCharsLimit,
    roleMessageLinesLimit,
    roleFilesPerMessageLimit,
    roleFileSizeBytesLimit,
    roleAllowedFileExtensions,
    roleAllowedFileFormatsLabel,
    canUseVoiceCalls,
    canUseVideoCalls,
    canUseRemoteDesktop,
    settingsPermissions,
    findServerRoleByLocalName,
    getHighestLocalRole,
    visibleSettingsRoles
  };
};

export { usePrototypeRoleAccess };
