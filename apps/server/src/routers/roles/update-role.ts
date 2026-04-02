import {
  ActivityLogType,
  DEFAULT_ROLE_RANK,
  DEFAULT_ROLE_SCOPE,
  OWNER_ROLE_ID,
  Permission,
  createDefaultRoleAbilities,
  createDefaultRoleLimits
} from '@connectmessager/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { syncRolePermissions } from '../../db/mutations/roles';
import { publishRole } from '../../db/publishers';
import { roles } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const zRoleLimits = z.object({
  messagesPerMinute: z.object({
    enabled: z.boolean(),
    value: z.number().int().min(1).max(10_000)
  }),
  requestsPerMinute: z.object({
    enabled: z.boolean(),
    value: z.number().int().min(1).max(10_000)
  }),
  charsPerMessage: z.object({
    enabled: z.boolean(),
    value: z.number().int().min(1).max(100_000)
  }),
  linesPerMessage: z.object({
    enabled: z.boolean(),
    value: z.number().int().min(1).max(10_000)
  }),
  fileSizeMb: z.object({
    enabled: z.boolean(),
    value: z.number().min(1).max(10_000)
  }),
  filesPerMessage: z.object({
    enabled: z.boolean(),
    value: z.number().int().min(1).max(1_000)
  }),
  fileFormats: z.object({
    enabled: z.boolean(),
    value: z.string().max(500)
  })
});

const zRoleAbilities = z.object({
  call: z.boolean(),
  videoCall: z.boolean(),
  remoteDesktop: z.boolean()
});

const updateRoleRoute = protectedProcedure
  .input(
    z.object({
      roleId: z.number().min(1),
      name: z.string().min(1).max(26),
      color: z
        .string()
        .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
      permissions: z.enum(Permission).array(),
      rank: z.number().int().min(1).max(100).default(DEFAULT_ROLE_RANK),
      scope: z.enum(['global', 'filter']).default(DEFAULT_ROLE_SCOPE),
      filter: z.string().max(500).default(''),
      limits: zRoleLimits.default(createDefaultRoleLimits()),
      abilities: zRoleAbilities.default(createDefaultRoleAbilities())
    })
  )
  .mutation(async ({ ctx, input }) => {
    const canEditRoles =
      (await ctx.hasPermission(Permission.EDIT_ROLES)) ||
      (await ctx.hasPermission(Permission.MANAGE_ROLES));

    if (!canEditRoles) {
      await ctx.needsPermission(Permission.EDIT_ROLES);
    }

    const updatedRole = await db
      .update(roles)
      .set({
        name: input.name,
        color: input.color,
        rank: input.rank,
        scope: input.scope,
        filter: input.scope === 'global' ? '' : input.filter.trim(),
        limits: input.limits,
        abilities: input.abilities,
        updatedAt: Date.now()
      })
      .where(eq(roles.id, input.roleId))
      .returning()
      .get();

    if (updatedRole.id !== OWNER_ROLE_ID) {
      await syncRolePermissions(updatedRole.id, input.permissions);
    }

    publishRole(updatedRole.id, 'update');
    enqueueActivityLog({
      type: ActivityLogType.UPDATED_ROLE,
      userId: ctx.user.id,
      details: {
        roleId: updatedRole.id,
        permissions: input.permissions,
        values: input
      }
    });
  });

export { updateRoleRoute };


