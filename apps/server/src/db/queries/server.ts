import type { TJoinedSettings, TPublicServerSettings } from '@connectmessager/shared';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { db } from '..';
import { config } from '../../config';
import {
  DEFAULT_SERVER_DESCRIPTION,
  DEFAULT_SERVER_LOGO_FILE_NAME,
  DEFAULT_SERVER_LOGO_SVG,
  DEFAULT_SERVER_NAME
} from '../../constants/default-server-branding';
import { PUBLIC_PATH } from '../../helpers/paths';
import { files, settings } from '../schema';

// since this is static, we can keep it in memory to avoid querying the DB every time
let token: string;
const LEGACY_GARBLED_SERVER_DESCRIPTION = 'пїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅпїЅ пїЅпїЅпїЅпїЅпїЅпїЅ Connect Messager';
const LEGACY_DEFAULT_SERVER_NAMES = new Set([
  'connectmessager Server',
  'Connect Messager Server',
  'Connect Messager'
]);

const normalizeServerDescription = (description: string | null) => {
  if (description === LEGACY_GARBLED_SERVER_DESCRIPTION) {
    return DEFAULT_SERVER_DESCRIPTION;
  }

  return description;
};

const normalizeServerName = (name: string) => {
  if (LEGACY_DEFAULT_SERVER_NAMES.has(name)) {
    return DEFAULT_SERVER_NAME;
  }

  return name;
};

const ensureDefaultServerLogo = async (serverId: string, currentLogoId?: number | null) => {
  if (currentLogoId) {
    return currentLogoId;
  }

  const existingLogo = await db
    .select()
    .from(files)
    .where(eq(files.name, DEFAULT_SERVER_LOGO_FILE_NAME))
    .get();

  if (existingLogo) {
    await db
      .update(settings)
      .set({ logoId: existingLogo.id })
      .where(eq(settings.serverId, serverId))
      .execute();
    return existingLogo.id;
  }

  const logoFileBuffer = Buffer.from(DEFAULT_SERVER_LOGO_SVG, 'utf8');
  const logoFileMd5 = createHash('md5').update(logoFileBuffer).digest('hex');
  await fs.mkdir(PUBLIC_PATH, { recursive: true });
  await fs.writeFile(
    path.join(PUBLIC_PATH, DEFAULT_SERVER_LOGO_FILE_NAME),
    logoFileBuffer
  );

  const [insertedLogo] = await db
    .insert(files)
    .values({
      name: DEFAULT_SERVER_LOGO_FILE_NAME,
      originalName: DEFAULT_SERVER_LOGO_FILE_NAME,
      md5: logoFileMd5,
      userId: 0,
      size: logoFileBuffer.byteLength,
      mimeType: 'image/svg+xml',
      extension: '.svg',
      createdAt: Date.now()
    })
    .returning();

  if (insertedLogo) {
    await db
      .update(settings)
      .set({ logoId: insertedLogo.id })
      .where(eq(settings.serverId, serverId))
      .execute();
    return insertedLogo.id;
  }

  return null;
};

const getSettings = async (): Promise<TJoinedSettings> => {
  const serverSettings = await db.select().from(settings).get()!;
  const normalizedName = normalizeServerName(serverSettings.name);
  const normalizedDescription = normalizeServerDescription(
    serverSettings.description
  );
  const normalizedLogoId = await ensureDefaultServerLogo(
    serverSettings.serverId,
    serverSettings.logoId
  );

  if (
    normalizedDescription !== serverSettings.description ||
    normalizedName !== serverSettings.name ||
    normalizedLogoId !== serverSettings.logoId
  ) {
    await db
      .update(settings)
      .set({
        description: normalizedDescription,
        name: normalizedName,
        logoId: normalizedLogoId
      })
      .where(eq(settings.serverId, serverSettings.serverId))
      .execute();
  }

  const logo = normalizedLogoId
    ? await db
        .select()
        .from(files)
        .where(eq(files.id, normalizedLogoId))
        .get()
    : undefined;

  return {
    ...serverSettings,
    name: normalizedName,
    description: normalizedDescription,
    logoId: normalizedLogoId,
    logo: logo ?? null
  };
};

const getPublicSettings: () => Promise<TPublicServerSettings> = async () => {
  const settings = await getSettings();

  const publicSettings: TPublicServerSettings = {
    description: settings.description ?? '',
    name: settings.name,
    serverId: settings.serverId,
    storageUploadEnabled: settings.storageUploadEnabled,
    directMessagesEnabled: settings.directMessagesEnabled,
    storageQuota: settings.storageQuota,
    storageUploadMaxFileSize: settings.storageUploadMaxFileSize,
    storageFileSharingInDirectMessages:
      settings.storageFileSharingInDirectMessages,
    storageMaxAvatarSize: settings.storageMaxAvatarSize,
    storageMaxBannerSize: settings.storageMaxBannerSize,
    storageMaxFilesPerMessage: settings.storageMaxFilesPerMessage,
    storageSpaceQuotaByUser: settings.storageSpaceQuotaByUser,
    storageOverflowAction: settings.storageOverflowAction,
    enablePlugins: settings.enablePlugins,
    webRtcMaxBitrate: config.webRtc.maxBitrate,
    enableSearch: settings.enableSearch,
    messageMaxTextLength: settings.messageMaxTextLength,
    messageMaxLines: settings.messageMaxLines
  };

  return publicSettings;
};

const getServerTokenSync = (): string => {
  if (!token) {
    throw new Error('Server token has not been initialized yet');
  }

  return token;
};

const getServerToken = async (): Promise<string> => {
  if (token) return token;

  const { secretToken } = await getSettings();

  if (!secretToken) {
    throw new Error('Secret token not found in database settings');
  }

  token = secretToken;

  return token;
};

export { getPublicSettings, getServerToken, getServerTokenSync, getSettings };


