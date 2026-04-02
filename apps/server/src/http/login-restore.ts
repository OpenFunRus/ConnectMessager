import { type TJoinedUser } from '@connectmessager/shared';
import http from 'http';
import jwt from 'jsonwebtoken';
import z from 'zod';
import { getServerToken } from '../db/queries/server';
import { getUserByIdentity } from '../db/queries/users';
import { logger } from '../logger';
import { getJsonBody } from './helpers';
import { HttpValidationError } from './utils';

const zBody = z.object({
  identity: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^cm-user-[a-z0-9]{12}$/, 'Invalid cm-user identity')
});

const loginRestoreRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const data = zBody.parse(await getJsonBody(req));
  logger.info('[Auth Restore] attempt identity=%s', data.identity);

  const user = (await getUserByIdentity(data.identity)) as TJoinedUser | undefined;

  if (!user) {
    logger.info('[Auth Restore] user not found identity=%s', data.identity);
    throw new HttpValidationError('identity', 'User not found');
  }

  if (user.banned) {
    logger.info('[Auth Restore] banned identity=%s', user.identity);
    throw new HttpValidationError('identity', 'User is banned');
  }

  const token = jwt.sign({ userId: user.id }, await getServerToken(), {
    expiresIn: '604800s'
  });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      success: true,
      token,
      identity: user.identity,
      ip: null
    })
  );

  logger.info('[Auth Restore] success identity=%s', user.identity);
};

export { loginRestoreRouteHandler };
