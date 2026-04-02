import {
  ActivityLogType,
  DEFAULT_ROLE_RANK,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_ROLE_SCOPE,
  Permission,
  createDefaultRoleAbilities,
  createDefaultRoleLimits
} from '@connectmessager/shared';
import { db } from '../../db';
import { syncRolePermissions } from '../../db/mutations/roles';
import { publishRole } from '../../db/publishers';
import { roles } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const addRoleRoute = protectedProcedure.mutation(async ({ ctx }) => {
  const canAddRoles =
    (await ctx.hasPermission(Permission.ADD_ROLES)) ||
    (await ctx.hasPermission(Permission.MANAGE_ROLES));

  if (!canAddRoles) {
    await ctx.needsPermission(Permission.ADD_ROLES);
  }

  const role = await db
    .insert(roles)
    .values({
      name: 'New Role',
      color: '#ffffff',
      rank: DEFAULT_ROLE_RANK,
      scope: DEFAULT_ROLE_SCOPE,
      filter: '',
      limits: createDefaultRoleLimits(),
      abilities: createDefaultRoleAbilities(),
      isDefault: false,
      isPersistent: false,
      createdAt: Date.now()
    })
    .returning()
    .get();

  await syncRolePermissions(role.id, DEFAULT_ROLE_PERMISSIONS);

  publishRole(role.id, 'create');
  enqueueActivityLog({
    type: ActivityLogType.CREATED_ROLE,
    userId: ctx.user.id,
    details: {
      roleId: role.id,
      roleName: role.name
    }
  });

  return role.id;
});

export { addRoleRoute };


