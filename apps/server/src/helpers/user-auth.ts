import { eq, gt, isNull, max } from 'drizzle-orm';
import { db } from '../db';
import { channelReadStates, messages, userLoginCodes } from '../db/schema';
import { getUserByIdentity } from '../db/queries/users';

const ACCESS_CODE_LENGTH = 8;

const generateRandomLowerAlphaNumeric = (length: number) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    result += alphabet[idx];
  }

  return result;
};

const generateNumericAccessCode = (length: number = ACCESS_CODE_LENGTH) => {
  let result = '';

  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }

  return result;
};

const generateUniqueIdentity = async (): Promise<string> => {
  for (let i = 0; i < 20; i++) {
    const candidate = `cm-user-${generateRandomLowerAlphaNumeric(12)}`;
    const existing = await getUserByIdentity(candidate);

    if (!existing) {
      return candidate;
    }
  }

  throw new Error('Failed to generate unique user identity');
};

const issueUserLoginCode = async ({
  userId,
  expiresAt,
  createdByUserId
}: {
  userId: number;
  expiresAt: number;
  createdByUserId?: number;
}) => {
  const code = generateNumericAccessCode();
  const codeHash = (await Bun.password.hash(code)).toString();
  const now = Date.now();

  await db.delete(userLoginCodes).where(eq(userLoginCodes.userId, userId));
  await db.insert(userLoginCodes).values({
    userId,
    codeHash,
    expiresAt,
    createdByUserId: createdByUserId ?? null,
    createdAt: now,
    updatedAt: now
  });

  return code;
};

const consumeUserLoginCode = async (userId: number) => {
  await db.delete(userLoginCodes).where(eq(userLoginCodes.userId, userId));
};

const findUserIdByLoginCode = async (code: string): Promise<number | null> => {
  const now = Date.now();
  const candidates = await db
    .select({
      userId: userLoginCodes.userId,
      codeHash: userLoginCodes.codeHash
    })
    .from(userLoginCodes)
    .where(gt(userLoginCodes.expiresAt, now));

  for (const candidate of candidates) {
    if (await Bun.password.verify(code, candidate.codeHash)) {
      return candidate.userId;
    }
  }

  return null;
};

const createInitialReadStatesForUser = async (userId: number) => {
  const latestMessages = await db
    .select({
      channelId: messages.channelId,
      lastReadMessageId: max(messages.id)
    })
    .from(messages)
    .where(isNull(messages.parentMessageId))
    .groupBy(messages.channelId);

  const values = latestMessages
    .filter(
      (row): row is { channelId: number; lastReadMessageId: number } =>
        row.lastReadMessageId !== null
    )
    .map(({ channelId, lastReadMessageId }) => ({
      channelId,
      userId,
      lastReadMessageId,
      lastReadAt: Date.now()
    }));

  if (values.length > 0) {
    await db.insert(channelReadStates).values(values);
  }
};

export {
  ACCESS_CODE_LENGTH,
  consumeUserLoginCode,
  createInitialReadStatesForUser,
  findUserIdByLoginCode,
  generateUniqueIdentity,
  issueUserLoginCode
};
