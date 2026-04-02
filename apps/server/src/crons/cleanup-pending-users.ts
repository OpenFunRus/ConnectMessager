import chalk from 'chalk';
import { eq, lte } from 'drizzle-orm';
import { db } from '../db';
import { pendingUserActivations, users } from '../db/schema';
import { logger } from '../logger';

const cleanupPendingUsers = async () => {
  logger.debug(`${chalk.dim('[Cron]')} Starting pending user cleanup...`);

  const now = Date.now();
  const expiredUsers = await db
    .select({
      userId: pendingUserActivations.userId
    })
    .from(pendingUserActivations)
    .where(lte(pendingUserActivations.expiresAt, now));

  if (expiredUsers.length === 0) {
    logger.debug(`${chalk.dim('[Cron]')} No expired pending users found.`);
    return;
  }

  for (const item of expiredUsers) {
    await db.delete(users).where(eq(users.id, item.userId));
  }

  logger.info(
    `${chalk.dim('[Cron]')} Cleaned up ${expiredUsers.length} expired pending users.`
  );
};

export { cleanupPendingUsers };
