import { Permission } from '@connectmessager/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { users } from '../../db/schema';
import { canUsersSeeEachOther } from '../../helpers/user-visibility';
import { issueUserLoginCode } from '../../helpers/user-auth';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const LOGIN_CODE_TTL_MS = 15 * 60 * 1000;

const issueLoginCodeRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number().min(1)
    })
  )
  .mutation(async ({ ctx, input }) => {
    const canManageAllInvites = await ctx.hasPermission(Permission.MANAGE_INVITES);
    const canGenerateUserInvite = await ctx.hasPermission(Permission.GENERATE_USER_INVITES);

    if (!canManageAllInvites && !canGenerateUserInvite) {
      await ctx.needsPermission(Permission.GENERATE_USER_INVITES);
    }

    const targetUser = await db
      .select({
        id: users.id,
        banned: users.banned
      })
      .from(users)
      .where(eq(users.id, input.userId))
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    invariant(!targetUser.banned, {
      code: 'FORBIDDEN',
      message: 'Cannot issue login code for banned user'
    });

    if (!canManageAllInvites) {
      const canSeeTarget = await canUsersSeeEachOther(ctx.userId, input.userId);
      invariant(canSeeTarget, {
        code: 'FORBIDDEN',
        message: 'You cannot issue a login code for this user'
      });
    }

    const expiresAt = Date.now() + LOGIN_CODE_TTL_MS;
    const code = await issueUserLoginCode({
      userId: input.userId,
      expiresAt,
      createdByUserId: ctx.userId
    });

    return {
      code,
      expiresAt
    };
  });

export { issueLoginCodeRoute };
