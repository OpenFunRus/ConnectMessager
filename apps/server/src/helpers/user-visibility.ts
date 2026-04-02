import { type TJoinedRole } from '@connectmessager/shared';
import { getPrimaryUserRole } from '../db/queries/roles';

const FILTER_ALL = 'Все';

const normalizeVisibilityFilter = (role?: Pick<TJoinedRole, 'scope' | 'filter'> | null) => {
  if (!role || role.scope === 'global') return FILTER_ALL;

  const raw = (role.filter || '').trim();
  if (!raw) return FILTER_ALL;

  const lower = raw.toLowerCase();
  if (lower === 'all' || lower === 'все') return FILTER_ALL;
  if (lower === 'сисадмины' || lower === 'sysadmins') return 'Сисадмины';
  if (lower === 'самара') return 'Самара';

  return raw;
};

const canFiltersSeeEachOther = (leftFilter: string, rightFilter: string) =>
  leftFilter === FILTER_ALL ||
  rightFilter === FILTER_ALL ||
  leftFilter === rightFilter;

const canManageGroupWithFilter = (managerFilter: string, groupFilter: string) =>
  managerFilter === FILTER_ALL || managerFilter === groupFilter;

const canRolesSeeEachOther = (
  leftRole?: Pick<TJoinedRole, 'scope' | 'filter'> | null,
  rightRole?: Pick<TJoinedRole, 'scope' | 'filter'> | null
) =>
  canFiltersSeeEachOther(
    normalizeVisibilityFilter(leftRole),
    normalizeVisibilityFilter(rightRole)
  );

const canUsersSeeEachOther = async (leftUserId: number, rightUserId: number) => {
  if (leftUserId === rightUserId) return true;

  const [leftRole, rightRole] = await Promise.all([
    getPrimaryUserRole(leftUserId),
    getPrimaryUserRole(rightUserId)
  ]);

  return canRolesSeeEachOther(leftRole, rightRole);
};

export {
  FILTER_ALL,
  canFiltersSeeEachOther,
  canManageGroupWithFilter,
  canRolesSeeEachOther,
  canUsersSeeEachOther,
  normalizeVisibilityFilter
};
