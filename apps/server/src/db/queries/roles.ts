import type { Permission, TJoinedRole, TRole } from '@connectmessager/shared';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import { db } from '..';
import { rolePermissions, roles, userRoles } from '../schema';
type TQueryResult = TRole & {
  permissions: string | null;
};

const roleSelectFields = {
  ...getTableColumns(roles),
  permissions: sql<string>`group_concat(${rolePermissions.permission}, ',')`.as(
    'permissions'
  )
};

const parseRole = (role: TQueryResult): TJoinedRole => ({
  ...role,
  permissions: role.permissions
    ? (role.permissions.split(',') as Permission[])
    : []
});

const getDefaultRole = async (): Promise<TRole | undefined> =>
  db.select().from(roles).where(eq(roles.isDefault, true)).get();

const getRole = async (roleId: number): Promise<TJoinedRole | undefined> => {
  const role = await db
    .select(roleSelectFields)
    .from(roles)
    .leftJoin(rolePermissions, sql`${roles.id} = ${rolePermissions.roleId}`)
    .where(sql`${roles.id} = ${roleId}`)
    .groupBy(roles.id)
    .limit(1)
    .get();

  if (!role) return undefined;

  return parseRole(role);
};

const getRoles = async (): Promise<TJoinedRole[]> => {
  const results = await db
    .select(roleSelectFields)
    .from(roles)
    .leftJoin(rolePermissions, sql`${roles.id} = ${rolePermissions.roleId}`)
    .groupBy(roles.id);

  return results.map(parseRole);
};

const getUserRoles = async (userId: number): Promise<TJoinedRole[]> => {
  const results = await db
    .select(roleSelectFields)
    .from(roles)
    .innerJoin(userRoles, eq(userRoles.roleId, roles.id))
    .leftJoin(rolePermissions, sql`${roles.id} = ${rolePermissions.roleId}`)
    .where(eq(userRoles.userId, userId))
    .groupBy(roles.id);

  return results.map(parseRole);
};

const getHighestRankRole = (joinedRoles: TJoinedRole[]): TJoinedRole | undefined =>
  [...joinedRoles].sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    if (a.scope !== b.scope) {
      return a.scope === 'filter' ? -1 : 1;
    }
    return b.id - a.id;
  })[0];

const getPrimaryUserRole = async (
  userId: number
): Promise<TJoinedRole | undefined> => {
  const joinedRoles = await getUserRoles(userId);
  return getHighestRankRole(joinedRoles);
};

const getUserRoleIds = async (userId: number): Promise<number[]> => {
  const userRoleRecords = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  return userRoleRecords.map((ur) => ur.roleId);
};

export {
  getDefaultRole,
  getHighestRankRole,
  getPrimaryUserRole,
  getRole,
  getRoles,
  getUserRoleIds,
  getUserRoles
};


