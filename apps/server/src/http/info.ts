import type { TServerInfo } from '@connectmessager/shared';
import http from 'http';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { getSettings } from '../db/queries/server';
import { users } from '../db/schema';
import { SERVER_VERSION } from '../utils/env';

const SERVER_RUNTIME_BUILD_ID = `${SERVER_VERSION}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const infoRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const settings = await getSettings();
  const realUsersCountRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(sql`${users.identity} NOT LIKE 'connectmessager-system-%'`)
    .get();
  const realUsersCount = Number(realUsersCountRow?.count ?? 0);

  const info: TServerInfo = {
    serverId: settings.serverId,
    version: SERVER_VERSION,
    buildId: SERVER_RUNTIME_BUILD_ID,
    name: settings.name,
    description: settings.description,
    logo: settings.logo,
    allowNewUsers: settings.allowNewUsers,
    setupRequired: realUsersCount === 0
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(info));
};

export { infoRouteHandler };


