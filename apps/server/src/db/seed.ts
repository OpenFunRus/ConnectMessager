import {
  ChannelType,
  DEFAULT_ROLE_RANK,
  DEFAULT_ROLE_SCOPE,
  DEFAULT_ROLE_PERMISSIONS,
  MESSAGE_DEFAULT_LINES_LIMIT,
  MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT,
  Permission,
  STORAGE_DEFAULT_MAX_AVATAR_SIZE,
  STORAGE_DEFAULT_MAX_BANNER_SIZE,
  STORAGE_DEFAULT_MAX_FILES_PER_MESSAGE,
  STORAGE_MAX_FILE_SIZE,
  STORAGE_MIN_QUOTA_PER_USER,
  STORAGE_OVERFLOW_ACTION,
  STORAGE_QUOTA,
  createDefaultRoleAbilities,
  createDefaultRoleLimits,
  type TICategory,
  type TIChannel,
  type TIRole,
  type TISettings
} from '@connectmessager/shared';
import { randomUUIDv7 } from 'bun';
import { createHash } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import {
  DEFAULT_SERVER_DESCRIPTION,
  DEFAULT_SERVER_LOGO_FILE_NAME,
  DEFAULT_SERVER_LOGO_SVG,
  DEFAULT_SERVER_NAME
} from '../constants/default-server-branding';
import { PUBLIC_PATH } from '../helpers/paths';
import { logger } from '../logger';
import { db } from './index';
import {
  categories,
  channels,
  files,
  rolePermissions,
  roles,
  settings
} from './schema';

const seedDatabase = async () => {
  const needsSeeding = (await db.select().from(settings)).length === 0;
  const firstStart = Date.now();

  if (needsSeeding) {
    logger.debug('Seeding initial database values...');

    const logoFileBuffer = Buffer.from(DEFAULT_SERVER_LOGO_SVG, 'utf8');
    const logoFileMd5 = createHash('md5').update(logoFileBuffer).digest('hex');

    await fs.mkdir(PUBLIC_PATH, { recursive: true });
    await fs.writeFile(
      path.join(PUBLIC_PATH, DEFAULT_SERVER_LOGO_FILE_NAME),
      logoFileBuffer
    );

    const [defaultLogoFile] = await db
      .insert(files)
      .values({
        name: DEFAULT_SERVER_LOGO_FILE_NAME,
        originalName: DEFAULT_SERVER_LOGO_FILE_NAME,
        md5: logoFileMd5,
        userId: 0,
        size: logoFileBuffer.byteLength,
        mimeType: 'image/svg+xml',
        extension: '.svg',
        createdAt: firstStart
      })
      .returning();

    const initialSettings: TISettings = {
      name: DEFAULT_SERVER_NAME,
      description: DEFAULT_SERVER_DESCRIPTION,
      password: '',
      serverId: Bun.randomUUIDv7(),
      secretToken: await Bun.password.hash(randomUUIDv7()),
      logoId: defaultLogoFile?.id ?? null,
      allowNewUsers: true,
      directMessagesEnabled: true,
      storageUploadEnabled: true,
      storageQuota: STORAGE_QUOTA,
      storageUploadMaxFileSize: STORAGE_MAX_FILE_SIZE,
      storageMaxAvatarSize: STORAGE_DEFAULT_MAX_AVATAR_SIZE,
      storageMaxBannerSize: STORAGE_DEFAULT_MAX_BANNER_SIZE,
      storageMaxFilesPerMessage: STORAGE_DEFAULT_MAX_FILES_PER_MESSAGE,
      storageFileSharingInDirectMessages: true,
      storageSpaceQuotaByUser: STORAGE_MIN_QUOTA_PER_USER,
      storageOverflowAction: STORAGE_OVERFLOW_ACTION,
      enablePlugins: false,
      enableSearch: true,
      messageMaxTextLength: MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT,
      messageMaxLines: MESSAGE_DEFAULT_LINES_LIMIT
    };

    await db.insert(settings).values(initialSettings);

    const initialRoles: TIRole[] = [
      {
        name: 'Разработчик',
        color: '#FFFFFF',
        rank: 100,
        scope: DEFAULT_ROLE_SCOPE,
        filter: '',
        limits: createDefaultRoleLimits(),
        abilities: createDefaultRoleAbilities(),
        isDefault: false,
        isPersistent: true,
        createdAt: firstStart
      },
      {
        name: 'Member',
        color: '#FFFFFF',
        rank: DEFAULT_ROLE_RANK,
        scope: DEFAULT_ROLE_SCOPE,
        filter: '',
        limits: createDefaultRoleLimits(),
        abilities: createDefaultRoleAbilities(),
        isPersistent: true,
        isDefault: true,
        createdAt: firstStart
      }
    ];

    const initialRolePermissions: {
      [roleId: number]: Permission[];
    } = {
      1: Object.values(Permission), // Owner (all permissions)
      2: DEFAULT_ROLE_PERMISSIONS // Member (default permissions)
    };

    await db.insert(roles).values(initialRoles);

    for (const [roleId, permissions] of Object.entries(initialRolePermissions)) {
      for (const permission of permissions) {
        await db.insert(rolePermissions).values({
          roleId: Number(roleId),
          permission,
          createdAt: Date.now()
        });
      }
    }
  }

  const existingPublicChannel = await db
    .select({ id: channels.id })
    .from(channels)
    .where(eq(channels.isDm, false))
    .limit(1)
    .get();

  if (!existingPublicChannel) {
    logger.debug('Creating default public group channel...');

    let targetCategoryId: number | null = null;
    const existingCategory = await db
      .select()
      .from(categories)
      .orderBy(desc(categories.position))
      .limit(1)
      .get();

    if (existingCategory) {
      targetCategoryId = existingCategory.id;
    } else {
      const defaultCategory: TICategory = {
        name: 'Группы',
        position: 0,
        createdAt: firstStart
      };

      const insertedCategory = await db
        .insert(categories)
        .values(defaultCategory)
        .returning()
        .get();

      targetCategoryId = insertedCategory?.id ?? null;
    }

    const lastCategoryChannel =
      targetCategoryId !== null
        ? await db
            .select()
            .from(channels)
            .where(eq(channels.categoryId, targetCategoryId))
            .orderBy(desc(channels.position))
            .limit(1)
            .get()
        : undefined;

    const defaultChannel: TIChannel = {
      type: ChannelType.TEXT,
      name: DEFAULT_SERVER_NAME,
      topic: 'Общая группа',
      position:
        lastCategoryChannel?.position !== undefined
          ? lastCategoryChannel.position + 1
          : 0,
      categoryId: targetCategoryId,
      private: false,
      isDm: false,
      fileAccessToken: randomUUIDv7(),
      fileAccessTokenUpdatedAt: firstStart,
      createdAt: firstStart
    };

    await db.insert(channels).values(defaultChannel);
  }
};

export { seedDatabase };


