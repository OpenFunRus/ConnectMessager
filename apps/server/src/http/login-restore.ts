import { type TJoinedUser } from '@connectmessager/shared';
import http from 'http';
import ipaddr from 'ipaddr.js';
import jwt from 'jsonwebtoken';
import z from 'zod';
import { getLastLogins } from '../db/queries/logins';
import { getServerToken } from '../db/queries/server';
import { getUserByIdentity } from '../db/queries/users';
import { getWsInfo } from '../helpers/get-ws-info';
import { logger } from '../logger';
import { getIpInfo } from '../utils/logins';
import { getJsonBody } from './helpers';
import { HttpValidationError } from './utils';

const zBody = z.object({
  identity: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^cm-user-[a-z0-9]{12}$/, 'Invalid cm-user identity'),
  ip: z.string().trim().optional()
});

const normalizeIpForCompare = (value: string): string => {
  const candidate = value.trim();
  if (!candidate || !ipaddr.isValid(candidate)) {
    return '';
  }

  const parsed = ipaddr.parse(candidate);
  if (parsed.kind() === 'ipv6') {
    const v6 = parsed as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      return v6.toIPv4Address().toString();
    }
  }

  return parsed.toString();
};

const isPrivateOrLocalIp = (value: string): boolean => {
  if (!value || !ipaddr.isValid(value)) {
    return false;
  }

  const parsed = ipaddr.parse(value);
  const canonical =
    parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()
      ? (parsed as ipaddr.IPv6).toIPv4Address()
      : parsed;

  const range = canonical.range();
  return (
    range === 'private' ||
    range === 'loopback' ||
    range === 'linkLocal' ||
    range === 'uniqueLocal' ||
    range === 'carrierGradeNat'
  );
};

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

  const info = getWsInfo(undefined, req);
  const requestIp = normalizeIpForCompare(info?.ip || '');
  const savedIp = normalizeIpForCompare(data.ip || '');
  const [lastLogin] = await getLastLogins(user.id, 1);
  const lastKnownIp = normalizeIpForCompare(lastLogin?.ip || '');
  logger.info(
    '[Auth Restore] identity=%s requestIp=%s lastKnownIp=%s savedIp=%s',
    user.identity,
    requestIp || '-',
    lastKnownIp || '-',
    savedIp || '-'
  );

  // Strict check: if server already knows the last user IP (shown in moderation),
  // trust it as source of truth. Fallback to client-saved IP only when no logins exist yet.
  if (!requestIp) {
    logger.info('[Auth Restore] reject identity=%s reason=missing-request-ip', user.identity);
    throw new HttpValidationError('ip', 'IP mismatch');
  }

  if (lastKnownIp) {
    let ipMatches = requestIp === lastKnownIp;

    if (!ipMatches && isPrivateOrLocalIp(requestIp)) {
      try {
        const ipInfo = await getIpInfo(requestIp);
        const resolvedPublicIp = normalizeIpForCompare(ipInfo.ip || '');
        logger.info(
          '[Auth Restore] identity=%s resolvedPublicIp=%s fromRequestIp=%s',
          user.identity,
          resolvedPublicIp || '-',
          requestIp
        );
        ipMatches = !!resolvedPublicIp && resolvedPublicIp === lastKnownIp;
      } catch (error) {
        logger.info(
          '[Auth Restore] identity=%s failed-resolve-public-ip=%s',
          user.identity,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    if (!ipMatches) {
      logger.info('[Auth Restore] reject identity=%s reason=last-login-ip-mismatch', user.identity);
      throw new HttpValidationError('ip', 'IP mismatch');
    }
  } else if (!savedIp || requestIp !== savedIp) {
    logger.info('[Auth Restore] reject identity=%s reason=saved-ip-mismatch', user.identity);
    throw new HttpValidationError('ip', 'IP mismatch');
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
      ip: requestIp
    })
  );

  logger.info('[Auth Restore] success identity=%s ip=%s', user.identity, requestIp);
};

export { loginRestoreRouteHandler };
