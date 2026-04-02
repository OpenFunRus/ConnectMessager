import { Permission } from '@connectmessager/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { getPrimaryUserRole } from '../../db/queries/roles';
import { roles, pendingUserActivations, userRoles, users } from '../../db/schema';
import {
  createInitialReadStatesForUser,
  generateUniqueIdentity,
  issueUserLoginCode
} from '../../helpers/user-auth';
import { canRolesSeeEachOther } from '../../helpers/user-visibility';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const ROLE_ACCESS_TTL_MS = 15 * 60 * 1000;

const provisionRoleAccessRoute = protectedProcedure
  .input(
    z.object({
      roleId: z.number().min(1)
    })
  )
  .mutation(async ({ ctx, input }) => {
    const canManageAllInvites = await ctx.hasPermission(Permission.MANAGE_INVITES);
    const canGenerateGroupInvite = await ctx.hasPermission(Permission.GENERATE_GROUP_INVITES);

    if (!canManageAllInvites && !canGenerateGroupInvite) {
      await ctx.needsPermission(Permission.GENERATE_GROUP_INVITES);
    }

    const role = await db
      .select({
        id: roles.id,
        rank: roles.rank,
        scope: roles.scope,
        filter: roles.filter
      })
      .from(roles)
      .where(eq(roles.id, input.roleId))
      .get();

    invariant(role, {
      code: 'NOT_FOUND',
      message: 'Role not found'
    });

    if (!canManageAllInvites) {
      const actorRole = await getPrimaryUserRole(ctx.userId);
      invariant(actorRole, {
        code: 'FORBIDDEN',
        message: 'You cannot issue access codes without a role'
      });
      invariant(actorRole.rank >= role.rank, {
        code: 'FORBIDDEN',
        message: 'You cannot issue access codes for a higher role'
      });
      invariant(canRolesSeeEachOther(actorRole, role), {
        code: 'FORBIDDEN',
        message: 'You cannot issue access codes for this role'
      });
    }

    const now = Date.now();
    const expiresAt = now + ROLE_ACCESS_TTL_MS;
    const identity = await generateUniqueIdentity();
    const randomPassword = (await Bun.password.hash(Bun.randomUUIDv7())).toString();

    const insertedUser = await db
      .insert(users)
      .values({
        identity,
        password: randomPassword,
        name: identity,
        createdAt: now
      })
      .returning({
        id: users.id
      })
      .get();

    invariant(insertedUser, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to provision user'
    });

    await db.insert(userRoles).values({
      userId: insertedUser.id,
      roleId: role.id,
      createdAt: now
    });

    await db.insert(pendingUserActivations).values({
      userId: insertedUser.id,
      expiresAt,
      createdAt: now
    });

    await createInitialReadStatesForUser(insertedUser.id);
    const code = await issueUserLoginCode({
      userId: insertedUser.id,
      expiresAt,
      createdByUserId: ctx.userId
    });

    await publishUser(insertedUser.id, 'create');

    return {
      code,
      expiresAt,
      userId: insertedUser.id
    };
  });

export { provisionRoleAccessRoute };
