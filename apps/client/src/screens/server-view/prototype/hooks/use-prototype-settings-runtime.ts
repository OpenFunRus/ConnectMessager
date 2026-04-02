import { getTRPCClient } from '@/lib/trpc';
import { uploadFile } from '@/helpers/upload-file';
import type { TFile } from '@connectmessager/shared';
import { DEFAULT_ROLE_PERMISSIONS, Permission } from '@connectmessager/shared';
import { FILTER_ALL, SETTINGS_ROLE_COLOR_POOL, SETTINGS_TO_SERVER_PERMISSION_MAP } from '../constants';
import type { TSettingsPermissions, TSettingsRole, TSettingsUser } from '../types';
import {
  canRolesSeeEachOther,
  createDefaultRoleAbilities,
  createDefaultRoleLimits,
  createDefaultRolePermissions,
  normalizeVisibilityFilter
} from '../utils';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type TOwnUserLike = {
  id?: number;
  name?: string;
  roleIds?: number[];
  bannerColor?: string | null;
  bio?: string | null;
  avatar?: TFile | null;
};

type TContactLike = {
  id: number;
  name: string;
  roleIds?: number[];
};

type TUsePrototypeSettingsRuntimeParams = {
  ownUser?: TOwnUserLike | null;
  contacts: TContactLike[];
  onDeleteUserLocal?: (userId: number) => void | Promise<void>;
  settingsPermissions: TSettingsPermissions;
  canManageUsersStrict: boolean;
  currentUserRank: number;
  currentUserLocalRole: Pick<TSettingsRole, 'scope' | 'filter'> | null;
  settingsRoles: TSettingsRole[];
  setSettingsRoles: Dispatch<SetStateAction<TSettingsRole[]>>;
  serverRoles: Array<{
    id: number;
    name: string;
    permissions?: string[];
  }>;
  getHighestLocalRole: (roleIds: number[]) => TSettingsRole | null;
  findServerRoleByLocalName: (localRoleName: string) => { id: number; name: string; permissions?: string[] } | undefined;
};

const usePrototypeSettingsRuntime = ({
  ownUser,
  contacts,
  onDeleteUserLocal,
  settingsPermissions,
  canManageUsersStrict,
  currentUserRank,
  currentUserLocalRole,
  settingsRoles,
  setSettingsRoles,
  serverRoles,
  getHighestLocalRole,
  findServerRoleByLocalName
}: TUsePrototypeSettingsRuntimeParams) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<'roles' | 'users'>('roles');
  const [settingsUsers, setSettingsUsers] = useState<TSettingsUser[]>([]);
  const [settingsUsersSearch, setSettingsUsersSearch] = useState('');
  const [settingsDeleteUserTarget, setSettingsDeleteUserTarget] = useState<TSettingsUser | null>(null);
  const [settingsDeleteSubmitting, setSettingsDeleteSubmitting] = useState(false);
  const [settingsEditUserTarget, setSettingsEditUserTarget] = useState<TSettingsUser | null>(null);
  const [settingsEditUserName, setSettingsEditUserName] = useState('');
  const [settingsInviteCode, setSettingsInviteCode] = useState('');
  const [settingsInviteLabel, setSettingsInviteLabel] = useState('');
  const [settingsInviteKind, setSettingsInviteKind] = useState<'role' | 'user' | null>(null);
  const [settingsInviteRoleName, setSettingsInviteRoleName] = useState<string | null>(null);
  const [settingsInviteUserId, setSettingsInviteUserId] = useState<number | null>(null);
  const [settingsInviteGenerating, setSettingsInviteGenerating] = useState(false);
  const [settingsRoleEditorOpen, setSettingsRoleEditorOpen] = useState(false);
  const [settingsRoleEditorMode, setSettingsRoleEditorMode] = useState<'add' | 'edit'>('add');
  const [settingsRoleEditorRoleId, setSettingsRoleEditorRoleId] = useState<number | null>(null);
  const [settingsRoleEditorDraft, setSettingsRoleEditorDraft] = useState<TSettingsRole>({
    id: 0,
    name: '',
    rank: 40,
    color: '#2fb344',
    scope: 'global',
    filter: FILTER_ALL,
    permissions: createDefaultRolePermissions(),
    limits: createDefaultRoleLimits(),
    abilities: createDefaultRoleAbilities()
  });
  const [settingsRoleColorMenuOpen, setSettingsRoleColorMenuOpen] = useState(false);

  useEffect(() => {
    let closedAnyWindow = false;

    if (!settingsPermissions.canViewSettings && isSettingsModalOpen) {
      setIsSettingsModalOpen(false);
      closedAnyWindow = true;
    }

    if (!settingsPermissions.canEditRoles && settingsRoleEditorOpen) {
      setSettingsRoleEditorOpen(false);
      setSettingsRoleColorMenuOpen(false);
      setSettingsRoleEditorRoleId(null);
      closedAnyWindow = true;
    }

    const inviteWindowForbidden =
      !!settingsInviteKind &&
      (!settingsPermissions.canViewSettings ||
        (settingsInviteKind === 'role' && !settingsPermissions.canInviteGroups) ||
        (settingsInviteKind === 'user' && !settingsPermissions.canInviteUsers));

    if (inviteWindowForbidden) {
      setSettingsInviteLabel('');
      setSettingsInviteCode('');
      setSettingsInviteKind(null);
      setSettingsInviteRoleName(null);
      setSettingsInviteUserId(null);
      closedAnyWindow = true;
    }

    if (
      !canManageUsersStrict &&
      settingsEditUserTarget &&
      settingsEditUserTarget.id !== ownUser?.id
    ) {
      setSettingsEditUserTarget(null);
      setSettingsEditUserName('');
      closedAnyWindow = true;
    }

    if (!canManageUsersStrict && settingsDeleteUserTarget) {
      setSettingsDeleteUserTarget(null);
      closedAnyWindow = true;
    }

    if (closedAnyWindow) {
      toast.error('Права были изменены. Открытые окна настроек закрыты.');
    }
  }, [
    canManageUsersStrict,
    isSettingsModalOpen,
    settingsDeleteUserTarget,
    settingsEditUserTarget,
    settingsInviteKind,
    ownUser?.id,
    settingsPermissions.canEditRoles,
    settingsPermissions.canInviteGroups,
    settingsPermissions.canInviteUsers,
    settingsPermissions.canViewSettings,
    settingsRoleEditorOpen
  ]);

  useEffect(() => {
    const seedUsers: TSettingsUser[] = [];
    const pushUnique = (candidate?: { id?: number; name?: string; roleIds?: number[] }) => {
      if (!candidate?.id || !candidate?.name) return;
      if (seedUsers.some((item) => item.id === candidate.id)) return;

      const roleIds = candidate.roleIds ?? [];
      const visualRole = getHighestLocalRole(roleIds);

      seedUsers.push({
        id: candidate.id,
        name: candidate.name,
        rank: visualRole?.rank ?? 10,
        color: visualRole?.color ?? '#495057',
        banned: false
      });
    };

    pushUnique({
      id: ownUser?.id,
      name: ownUser?.name,
      roleIds: (ownUser?.roleIds ?? []) as number[]
    });

    contacts.forEach((contact) =>
      pushUnique({
        id: contact.id,
        name: contact.name,
        roleIds: (contact.roleIds ?? []) as number[]
      })
    );

    setSettingsUsers((prev) => {
      const prevById = new Map(prev.map((item) => [item.id, item]));
      return seedUsers
        .map((item) => ({
          ...prevById.get(item.id),
          ...item
        }))
        .sort((a, b) => b.rank - a.rank);
    });
  }, [contacts, getHighestLocalRole, ownUser?.id, ownUser?.name, ownUser?.roleIds]);

  const filteredSettingsUsers = useMemo(() => {
    const term = settingsUsersSearch.trim().toLowerCase();
    const byFilter = settingsUsers.filter((user) => {
      if (user.id === ownUser?.id) return true;
      const targetUser = contacts.find((contact) => contact.id === user.id);
      const targetRole = getHighestLocalRole(((targetUser?.roleIds ?? []) as number[]));
      return canRolesSeeEachOther(currentUserLocalRole, targetRole);
    });
    if (!term) return byFilter;
    return byFilter.filter((user) => user.name.toLowerCase().includes(term));
  }, [
    contacts,
    currentUserLocalRole,
    getHighestLocalRole,
    ownUser?.id,
    settingsUsers,
    settingsUsersSearch
  ]);

  const openSettingsModal = useCallback(() => {
    if (!settingsPermissions.canViewSettings) return;
    setIsSettingsModalOpen(true);
    setSettingsModalTab('roles');
  }, [settingsPermissions.canViewSettings]);

  const issueSettingsInviteCode = useCallback(
    async ({
      label,
      kind,
      roleName,
      userId
    }: {
      label: string;
      kind: 'role' | 'user';
      roleName?: string | null;
      userId?: number | null;
    }) => {
      if (settingsInviteGenerating) return;
      setSettingsInviteGenerating(true);
      try {
        const canGenerateForKind =
          kind === 'role' ? settingsPermissions.canInviteGroups : settingsPermissions.canInviteUsers;

        if (!canGenerateForKind) {
          toast.error('Недостаточно прав для генерации этого кода.');
          return;
        }

        let mappedRoleId: number | undefined;
        if (kind === 'role' && roleName) {
          const matchedRole = findServerRoleByLocalName(roleName);
          if (!matchedRole) {
            throw new Error(`Роль "${roleName}" не найдена на сервере. Сначала создайте ее в Server Settings.`);
          }
          mappedRoleId = matchedRole.id;
        }

        let createdCode: string | null = null;

        if (kind === 'role') {
          if (!mappedRoleId) {
            throw new Error('Не удалось определить роль для доступа.');
          }

          const result = await getTRPCClient().users.provisionRoleAccess.mutate({
            roleId: mappedRoleId
          });
          createdCode = result.code;
        } else {
          if (!userId) {
            throw new Error('Не удалось определить пользователя для входа.');
          }

          const result = await getTRPCClient().users.issueLoginCode.mutate({
            userId
          });
          createdCode = result.code;
        }

        if (!createdCode) {
          throw new Error('Не удалось создать код доступа');
        }

        setSettingsInviteLabel(label);
        setSettingsInviteCode(createdCode);
        setSettingsInviteKind(kind);
        setSettingsInviteRoleName(roleName ?? null);
        setSettingsInviteUserId(userId ?? null);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.toLowerCase().includes('insufficient permissions')) {
          toast.error('Недостаточно прав для генерации этого кода.');
        } else {
          toast.error(message || 'Не удалось создать код доступа');
        }
      } finally {
        setSettingsInviteGenerating(false);
      }
    },
    [
      findServerRoleByLocalName,
      settingsInviteGenerating,
      settingsPermissions.canInviteGroups,
      settingsPermissions.canInviteUsers
    ]
  );

  const openSettingsUserEdit = useCallback(
    (user: TSettingsUser) => {
      if (!canManageUsersStrict && user.id !== ownUser?.id) return;
      setSettingsEditUserTarget(user);
      setSettingsEditUserName(user.name);
    },
    [canManageUsersStrict, ownUser?.id]
  );

  const openOwnUserEdit = useCallback(() => {
    if (!ownUser?.id || !ownUser?.name) return;

    const ownRole = getHighestLocalRole(((ownUser.roleIds ?? []) as number[]));

    openSettingsUserEdit({
      id: ownUser.id,
      name: ownUser.name,
      rank: ownRole?.rank ?? 10,
      color: ownRole?.color ?? '#495057',
      banned: false
    });
  }, [getHighestLocalRole, openSettingsUserEdit, ownUser?.id, ownUser?.name, ownUser?.roleIds]);

  const closeSettingsUserEdit = useCallback(() => {
    setSettingsEditUserTarget(null);
    setSettingsEditUserName('');
  }, []);

  const saveSettingsUserEdit = useCallback((
    payload?: {
      avatarFile?: File | null;
      clearAvatar?: boolean;
    }
  ) => {
    if (!settingsEditUserTarget) return;
    const nextName = settingsEditUserName.trim();
    if (!nextName) return;

    void (async () => {
      let tempAvatarId: string | undefined;
      try {
        if (settingsEditUserTarget.id === ownUser?.id) {
          const avatarFile = payload?.avatarFile ?? null;
          const clearAvatar = !!payload?.clearAvatar;

          if (avatarFile) {
            const temporaryFile = await uploadFile(avatarFile);
            if (!temporaryFile) {
              toast.error('Не удалось загрузить аватарку.');
              return;
            }
            tempAvatarId = temporaryFile.id;
          }

          await getTRPCClient().users.update.mutate({
            name: nextName,
            bannerColor: ownUser?.bannerColor ?? '#495057',
            bio: ownUser?.bio ?? undefined
          });

          if (tempAvatarId || clearAvatar) {
            await getTRPCClient().users.changeAvatar.mutate({
              fileId: tempAvatarId
            });
          }
        }

        setSettingsUsers((prev) =>
          prev.map((item) =>
            item.id === settingsEditUserTarget.id ? { ...item, name: nextName } : item
          )
        );
        closeSettingsUserEdit();
      } catch {
        if (tempAvatarId) {
          await getTRPCClient().files.deleteTemporary
            .mutate({ fileId: tempAvatarId })
            .catch(() => undefined);
        }
        toast.error('Не удалось сохранить профиль пользователя.');
      }
    })();
  }, [
    closeSettingsUserEdit,
    ownUser?.bannerColor,
    ownUser?.bio,
    ownUser?.id,
    settingsEditUserName,
    settingsEditUserTarget
  ]);

  const openSettingsUserDelete = useCallback(
    (user: TSettingsUser) => {
      if (!canManageUsersStrict) return;
      setSettingsDeleteUserTarget(user);
    },
    [canManageUsersStrict]
  );

  const closeSettingsUserDelete = useCallback(() => {
    setSettingsDeleteUserTarget(null);
  }, []);

  const confirmSettingsUserDelete = useCallback(() => {
    if (!settingsDeleteUserTarget || settingsDeleteSubmitting) return;

    void (async () => {
      try {
        setSettingsDeleteSubmitting(true);

        await getTRPCClient().users.delete.mutate({
          userId: settingsDeleteUserTarget.id,
          wipe: true
        });

        await onDeleteUserLocal?.(settingsDeleteUserTarget.id);
        setSettingsUsers((prev) =>
          prev.filter((item) => item.id !== settingsDeleteUserTarget.id)
        );
        setSettingsDeleteUserTarget(null);
        toast.success('Пользователь удалён полностью.');
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Не удалось удалить пользователя с сервера.';
        toast.error(message);
      } finally {
        setSettingsDeleteSubmitting(false);
      }
    })();
  }, [onDeleteUserLocal, settingsDeleteSubmitting, settingsDeleteUserTarget]);

  const openSettingsUserInvite = useCallback(
    async (user: TSettingsUser) => {
      if (!settingsPermissions.canInviteUsers) return;
      await issueSettingsInviteCode({
        label: `Пользователь: ${user.name}`,
        kind: 'user',
        userId: user.id
      });
    },
    [issueSettingsInviteCode, settingsPermissions.canInviteUsers]
  );

  const openSettingsRoleInvite = useCallback(
    async (role: TSettingsRole) => {
      if (!settingsPermissions.canInviteGroups) return;
      await issueSettingsInviteCode({
        label: `Роль: ${role.name}`,
        kind: 'role',
        roleName: role.name
      });
    },
    [issueSettingsInviteCode, settingsPermissions.canInviteGroups]
  );

  const refreshSettingsInviteCode = useCallback(async () => {
    if (!settingsInviteKind) return;
    await issueSettingsInviteCode({
      label: settingsInviteLabel || 'Код',
      kind: settingsInviteKind,
      roleName: settingsInviteRoleName,
      userId: settingsInviteUserId
    });
  }, [
    issueSettingsInviteCode,
    settingsInviteKind,
    settingsInviteLabel,
    settingsInviteRoleName,
    settingsInviteUserId
  ]);

  const closeSettingsInviteCode = useCallback(() => {
    setSettingsInviteLabel('');
    setSettingsInviteCode('');
    setSettingsInviteKind(null);
    setSettingsInviteRoleName(null);
    setSettingsInviteUserId(null);
  }, []);

  const buildRoleEditorDraft = useCallback((role?: TSettingsRole): TSettingsRole => {
    if (!role) {
      return {
        id: 0,
        name: '',
        rank: 40,
        color: SETTINGS_ROLE_COLOR_POOL[0],
        scope: 'global',
        filter: FILTER_ALL,
        permissions: createDefaultRolePermissions(),
        limits: createDefaultRoleLimits(),
        abilities: createDefaultRoleAbilities()
      };
    }
    return {
      ...role,
      permissions: { ...role.permissions },
      limits: {
        messagesPerMinute: { ...role.limits.messagesPerMinute },
        requestsPerMinute: { ...role.limits.requestsPerMinute },
        charsPerMessage: { ...role.limits.charsPerMessage },
        linesPerMessage: { ...role.limits.linesPerMessage },
        fileSizeMb: { ...role.limits.fileSizeMb },
        filesPerMessage: { ...role.limits.filesPerMessage },
        fileFormats: { ...role.limits.fileFormats }
      },
      abilities: { ...role.abilities }
    };
  }, []);

  const openSettingsAddRole = useCallback(() => {
    if (!settingsPermissions.canAddRoles) return;
    setSettingsRoleEditorMode('add');
    setSettingsRoleEditorRoleId(null);
    setSettingsRoleEditorDraft(() => ({
      ...buildRoleEditorDraft(),
      rank: Math.min(currentUserRank, 40)
    }));
    setSettingsRoleColorMenuOpen(false);
    setSettingsRoleEditorOpen(true);
  }, [buildRoleEditorDraft, currentUserRank, settingsPermissions.canAddRoles]);

  const openSettingsEditRole = useCallback(
    (role: TSettingsRole) => {
      if (!settingsPermissions.canEditRoles) return;
      if (role.rank > currentUserRank) return;
      setSettingsRoleEditorMode('edit');
      setSettingsRoleEditorRoleId(role.id);
      setSettingsRoleEditorDraft(buildRoleEditorDraft(role));
      setSettingsRoleColorMenuOpen(false);
      setSettingsRoleEditorOpen(true);
    },
    [buildRoleEditorDraft, currentUserRank, settingsPermissions.canEditRoles]
  );

  const closeSettingsRoleEditor = useCallback(() => {
    setSettingsRoleEditorOpen(false);
    setSettingsRoleColorMenuOpen(false);
    setSettingsRoleEditorRoleId(null);
  }, []);

  const saveSettingsRole = useCallback(async () => {
    const normalizedName = settingsRoleEditorDraft.name.trim();
    if (!normalizedName) {
      toast.error('Укажите название роли.');
      return;
    }

    const nextRole: TSettingsRole = {
      ...settingsRoleEditorDraft,
      name: normalizedName,
      rank: Math.max(1, Math.min(currentUserRank, Number(settingsRoleEditorDraft.rank) || 1)),
      scope: normalizeVisibilityFilter(settingsRoleEditorDraft) === FILTER_ALL ? 'global' : 'filter',
      filter: normalizeVisibilityFilter(settingsRoleEditorDraft)
    };

    if (nextRole.rank > currentUserRank) {
      toast.error('Нельзя ставить ранг выше собственного.');
      return;
    }

    const applySettingsPermissionsToServer = (
      basePermissions: string[],
      draftPermissions: TSettingsRole['permissions']
    ) => {
      const next = new Set<Permission>([
        ...DEFAULT_ROLE_PERMISSIONS,
        ...(basePermissions as Permission[])
      ]);
      next.delete(Permission.MANAGE_SETTINGS);
      next.delete(Permission.MANAGE_ROLES);
      next.delete(Permission.MANAGE_INVITES);
      SETTINGS_TO_SERVER_PERMISSION_MAP.forEach(({ key, permission }) => {
        if (draftPermissions[key]) {
          next.add(permission);
        } else {
          next.delete(permission);
        }
      });
      return Array.from(next) as Permission[];
    };

    try {
      if (settingsRoleEditorMode === 'add') {
        const newRoleId = await getTRPCClient().roles.add.mutate();
        const currentServerRole = serverRoles.find((role) => role.id === newRoleId);
        const serverPermissions = applySettingsPermissionsToServer(
          (currentServerRole?.permissions ?? []) as string[],
          nextRole.permissions
        );
        await getTRPCClient().roles.update.mutate({
          roleId: newRoleId,
          name: nextRole.name,
          color: nextRole.color,
          permissions: serverPermissions,
          rank: nextRole.rank,
          scope: nextRole.scope,
          filter: nextRole.filter ?? '',
          limits: nextRole.limits,
          abilities: nextRole.abilities
        });

        setSettingsRoles((prev) => [...prev, { ...nextRole, id: newRoleId }]);
      } else {
        const existingLocalRole = settingsRoles.find((role) => role.id === settingsRoleEditorRoleId);
        const matchedServerRole =
          (existingLocalRole && findServerRoleByLocalName(existingLocalRole.name)) ||
          findServerRoleByLocalName(nextRole.name);

        if (!matchedServerRole) {
          toast.error('Не удалось сопоставить роль с сервером. Обновите страницу и повторите.');
          return;
        }

        const serverPermissions = applySettingsPermissionsToServer(
          (matchedServerRole.permissions ?? []) as string[],
          nextRole.permissions
        );
        await getTRPCClient().roles.update.mutate({
          roleId: matchedServerRole.id,
          name: nextRole.name,
          color: nextRole.color,
          permissions: serverPermissions,
          rank: nextRole.rank,
          scope: nextRole.scope,
          filter: nextRole.filter ?? '',
          limits: nextRole.limits,
          abilities: nextRole.abilities
        });

        setSettingsRoles((prev) =>
          prev.map((role) =>
            role.id === settingsRoleEditorRoleId ? { ...nextRole, id: role.id } : role
          )
        );
      }
    } catch {
      toast.error('Не удалось сохранить роль на сервере.');
      return;
    }

    closeSettingsRoleEditor();
  }, [
    closeSettingsRoleEditor,
    currentUserRank,
    findServerRoleByLocalName,
    serverRoles,
    settingsRoleEditorDraft,
    settingsRoleEditorMode,
    settingsRoleEditorRoleId,
    settingsRoles,
    setSettingsRoles
  ]);

  return {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    settingsModalTab,
    setSettingsModalTab,
    settingsUsersSearch,
    setSettingsUsersSearch,
    filteredSettingsUsers,
    settingsInviteGenerating,
    settingsRoleEditorOpen,
    settingsRoleEditorMode,
    settingsRoleEditorDraft,
    setSettingsRoleEditorDraft,
    settingsRoleColorMenuOpen,
    setSettingsRoleColorMenuOpen,
    settingsDeleteSubmitting,
    settingsDeleteUserTarget,
    settingsEditUserTarget,
    settingsEditUserName,
    setSettingsEditUserName,
    settingsInviteCode,
    settingsInviteLabel,
    openSettingsModal,
    openSettingsEditRole,
    openSettingsRoleInvite,
    openSettingsUserDelete,
    openSettingsUserEdit,
    openOwnUserEdit,
    openSettingsUserInvite,
    openSettingsAddRole,
    closeSettingsRoleEditor,
    saveSettingsRole,
    closeSettingsUserDelete,
    confirmSettingsUserDelete,
    closeSettingsUserEdit,
    saveSettingsUserEdit,
    closeSettingsInviteCode,
    refreshSettingsInviteCode
  };
};

export { usePrototypeSettingsRuntime };
