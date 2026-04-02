import {
  ActivityLogType,
  DELETED_USER_IDENTITY_AND_NAME,
  OWNER_ROLE_ID,
  sha256,
  type TJoinedUser
} from '@connectmessager/shared';
import chalk from 'chalk';
import { eq, sql } from 'drizzle-orm';
import http from 'http';
import jwt from 'jsonwebtoken';
import z from 'zod';
import { config } from '../config';
import { db } from '../db';
import { publishUser } from '../db/publishers';
import { isInviteValid } from '../db/queries/invites';
import { getDefaultRole } from '../db/queries/roles';
import { getServerToken } from '../db/queries/server';
import { getUserById, getUserByIdentity, getUsers } from '../db/queries/users';
import {
  invites,
  pendingUserActivations,
  userRoles,
  users
} from '../db/schema';
import {
  consumeUserLoginCode,
  createInitialReadStatesForUser,
  findUserIdByLoginCode,
  generateUniqueIdentity
} from '../helpers/user-auth';
import { getWsInfo } from '../helpers/get-ws-info';
import { safeCompare } from '../helpers/safe-compare';
import { logger } from '../logger';
import { enqueueActivityLog } from '../queues/activity-log';
import { enqueueLogin } from '../queues/logins';
import { invariant } from '../utils/invariant';
import {
  createRateLimiter,
  getClientRateLimitKey,
  getRateLimitRetrySeconds
} from '../utils/rate-limiters/rate-limiter';
import { getJsonBody } from './helpers';
import { HttpValidationError } from './utils';

const BOOTSTRAP_DEVELOPER_PASSWORD = '12345678';
const AUTO_USER_ID_PREFIX = 'cm-user-';

const verifyUserPassword = async (
  user: TJoinedUser,
  password: string
): Promise<boolean> => {
  const isPasswordArgon = user.password.startsWith('$argon2');

  if (isPasswordArgon) {
    return Bun.password.verify(password, user.password);
  }

  const hashInputPassword = await sha256(password);
  return safeCompare(hashInputPassword, user.password);
};

const zBody = z.object({
  identity: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Identity must be at least 1 character long'),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters long')
    .max(128),
  invite: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(24, 'Name must be at most 24 characters long')
    .refine((val) => val !== DELETED_USER_IDENTITY_AND_NAME, {
      message: 'Protected username'
    })
    .optional()
});

type TLoginSuccessResponse = {
  success: true;
  token: string;
  identity: string;
  ip: string | null;
};

const loginRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.joinServer.maxRequests,
  windowMs: config.rateLimiters.joinServer.windowMs
});

const registerUser = async (
  identity: string,
  password: string,
  name: string,
  inviteCode?: string,
  inviteRoleId?: number | null,
  ip?: string
): Promise<TJoinedUser> => {
  const hashedPassword = (await Bun.password.hash(password)).toString();

  const defaultRole = await getDefaultRole();
  const existingOwnerRoleAssignment = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, OWNER_ROLE_ID))
    .limit(1)
    .get();
  const shouldAssignOwnerRole = !existingOwnerRoleAssignment;

  invariant(defaultRole, {
    code: 'NOT_FOUND',
    message: 'Default role not found'
  });

  const user = await db
    .insert(users)
    .values({
      name,
      identity,
      createdAt: Date.now(),
      password: hashedPassword
    })
    .returning()
    .get();

  if (shouldAssignOwnerRole) {
    await db.insert(userRoles).values({
      roleId: OWNER_ROLE_ID,
      userId: user.id,
      createdAt: Date.now()
    });
  } else {
    await db.insert(userRoles).values({
      roleId: inviteRoleId ?? defaultRole.id,
      userId: user.id,
      createdAt: Date.now()
    });
  }

  publishUser(user.id, 'create');

  const registeredUser = await getUserByIdentity(identity);

  if (!registeredUser) {
    throw new Error('User registration failed');
  }

  if (inviteCode) {
    enqueueActivityLog({
      type: ActivityLogType.USED_INVITE,
      userId: registeredUser.id,
      details: { code: inviteCode },
      ip
    });
  }

  return registeredUser;
};

const loginRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const data = zBody.parse(await getJsonBody(req));

  if (data.identity === DELETED_USER_IDENTITY_AND_NAME) {
    throw new HttpValidationError('identity', 'This identity is reserved');
  }

  let existingUser = await getUserByIdentity(data.identity);
  const connectionInfo = getWsInfo(undefined, req);
  const rawInviteCode = (data.invite || data.password || '').trim().toLowerCase();
  const loginCodeUserId = await findUserIdByLoginCode(rawInviteCode);
  const inviteValidation = await isInviteValid(rawInviteCode);
  const validInvite = inviteValidation.error ? null : inviteValidation.invite;
  const isAccessCodeLogin = loginCodeUserId !== null;
  const isRoleInviteLogin = !!validInvite?.roleId;
  const isUserInviteLogin = !!validInvite && !validInvite.roleId;
  logger.info(
    `${chalk.dim('[Auth]')} Login attempt identity="${data.identity}" (IP: ${connectionInfo?.ip || 'unknown'})`
  );

  const ownerRoleAssignment = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, OWNER_ROLE_ID))
    .limit(1)
    .get();
  const ownerUser = ownerRoleAssignment
    ? await getUserById(ownerRoleAssignment.userId)
    : undefined;

  // If identity is auto-generated on the client and does not exist yet,
  // allow owner login by current password (which may differ from bootstrap).
  if (isAccessCodeLogin && loginCodeUserId !== null) {
    existingUser = await getUserById(loginCodeUserId);
  }

  if (!isAccessCodeLogin && isUserInviteLogin && validInvite) {
    existingUser = await getUserById(validInvite.creatorId);
  }

  if (!existingUser && ownerUser && !isRoleInviteLogin && !isUserInviteLogin && !isAccessCodeLogin) {
    const ownerPasswordMatches = await verifyUserPassword(ownerUser, data.password);
    if (ownerPasswordMatches) {
      existingUser = ownerUser;
    }
  }

  if (isRoleInviteLogin) {
    existingUser = undefined;
  }

  // Password-first login:
  // if identity is unknown but password matches an existing account,
  // reuse that account instead of creating a new cm-user identity.
  if (!existingUser && !isRoleInviteLogin && !isUserInviteLogin && !isAccessCodeLogin) {
    const allUsers = await getUsers();
    const matchedUsers: TJoinedUser[] = [];

    for (const user of allUsers) {
      if (await verifyUserPassword(user, data.password)) {
        matchedUsers.push(user);
      }
    }

    if (matchedUsers.length > 0) {
      matchedUsers.sort((a, b) => b.lastLoginAt - a.lastLoginAt);
      const matchedUser = matchedUsers[0];
      if (matchedUser) {
        existingUser = matchedUser;
        logger.info(
          `${chalk.dim('[Auth]')} Password-first matched identity="${matchedUser.identity}" userId=${matchedUser.id}`
        );
      }
    }
  }

  if ((isUserInviteLogin || isAccessCodeLogin) && !existingUser) {
    throw new HttpValidationError('invite', 'Неверный код доступа или пароль');
  }

  if (connectionInfo?.ip) {
    const key = getClientRateLimitKey(connectionInfo.ip);
    const rateLimit = loginRateLimiter.consume(key);

    if (!rateLimit.allowed) {
      logger.debug(`[Rate Limiter HTTP] /login rate limited for key "${key}"`);

      res.setHeader(
        'Retry-After',
        getRateLimitRetrySeconds(rateLimit.retryAfterMs)
      );
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Too many login attempts. Please try again shortly.'
        })
      );

      return;
    }
  } else {
    logger.warn(
      '[Rate Limiter HTTP] Missing IP address in request info, skipping rate limiting for /login route.'
    );
  }

  if (!existingUser) {
    const usersCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .get();
    const usersCount = Number(usersCountResult?.count ?? 0);
    const isFirstUserBootstrap = usersCount === 0;

    let inviteRoleId: number | null = null;
    let inviteCode: string | undefined;
    let targetName = '';

    if (isFirstUserBootstrap) {
      if (data.password !== BOOTSTRAP_DEVELOPER_PASSWORD) {
        throw new HttpValidationError('password', 'Неверный код доступа или пароль');
      }

      targetName = 'Разработчик';
    } else {
      if (!validInvite) {
        throw new HttpValidationError('invite', 'Неверный код доступа или пароль');
      }

      inviteCode = rawInviteCode;
      inviteRoleId = validInvite.roleId ?? null;
      targetName = (data.name || '').trim();
      if (!targetName) {
        throw new HttpValidationError('name', 'Введите имя пользователя');
      }

      await db
        .update(invites)
        .set({
          uses: sql`${invites.uses} + 1`
        })
        .where(eq(invites.code, inviteCode))
        .execute();
    }

    const generatedIdentity = await generateUniqueIdentity();
    existingUser = await registerUser(
      generatedIdentity,
      data.password,
      targetName,
      inviteCode,
      inviteRoleId,
      connectionInfo?.ip
    );

    await createInitialReadStatesForUser(existingUser.id);
  }

  if (existingUser.banned) {
    throw new HttpValidationError(
      'identity',
      `Identity banned: ${existingUser.banReason || 'No reason provided'}`
    );
  }

  // temporary logic to migrate old SHA256 password hashes to argon2 on login
  const isPasswordArgon = existingUser.password.startsWith('$argon2');
  let passwordMatches = isUserInviteLogin || isAccessCodeLogin
    ? true
    : await verifyUserPassword(existingUser, data.password);

  if (!isPasswordArgon && passwordMatches) {
    logger.info(
      `${chalk.dim('[Auth]')} User "${existingUser.identity}" is using legacy SHA256 password hash, upgrading to argon2...`
    );
    const argon2Password = await Bun.password.hash(data.password);

    await db
      .update(users)
      .set({
        password: argon2Password
      })
      .where(eq(users.id, existingUser.id));
  }

  if (!passwordMatches) {
    logger.info(
      `${chalk.dim('[Auth]')} Failed login attempt for user "${existingUser.identity}" due to invalid password. (IP: ${connectionInfo?.ip || 'unknown'})`
    );

    throw new HttpValidationError('password', 'Неверный код доступа или пароль');
  }

  const pendingActivation = await db
    .select({
      userId: pendingUserActivations.userId
    })
    .from(pendingUserActivations)
    .where(eq(pendingUserActivations.userId, existingUser.id))
    .get();

  if (isUserInviteLogin && validInvite) {
    await db
      .update(invites)
      .set({
        uses: sql`${invites.uses} + 1`
      })
      .where(eq(invites.code, validInvite.code))
      .execute();
  }

  const hasTemporaryCmUserName =
    existingUser.name.startsWith(AUTO_USER_ID_PREFIX) ||
    existingUser.name === existingUser.identity;

  if (pendingActivation || hasTemporaryCmUserName) {
    const nextName = (data.name || '').trim();
    if (!nextName) {
      throw new HttpValidationError('name', 'Введите имя пользователя');
    }

    if (pendingActivation && nextName === existingUser.identity) {
      throw new HttpValidationError('name', 'Введите имя пользователя');
    }

    if (nextName !== existingUser.name) {
      await db
        .update(users)
        .set({
          name: nextName
        })
        .where(eq(users.id, existingUser.id));

      publishUser(existingUser.id, 'update');
      existingUser = {
        ...existingUser,
        name: nextName
      };
    }

    if (pendingActivation) {
      await db
        .delete(pendingUserActivations)
        .where(eq(pendingUserActivations.userId, existingUser.id));
    }
  }

  if (isAccessCodeLogin) {
    await consumeUserLoginCode(existingUser.id);
  }

  const token = jwt.sign({ userId: existingUser.id }, await getServerToken(), {
    expiresIn: '604800s' // 7 days
  });

  // Persist login IP from HTTP auth step as well, so /login/restore
  // can validate IP immediately even before websocket join flow runs.
  enqueueLogin(existingUser.id, connectionInfo);

  const responseBody: TLoginSuccessResponse = {
    success: true,
    token,
    identity: existingUser.identity,
    ip: connectionInfo?.ip || null
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(responseBody));
  logger.info(
    `${chalk.dim('[Auth]')} Login success identity="${existingUser.identity}" userId=${existingUser.id} (IP: ${connectionInfo?.ip || 'unknown'})`
  );

  return res;
};

export { loginRouteHandler };


