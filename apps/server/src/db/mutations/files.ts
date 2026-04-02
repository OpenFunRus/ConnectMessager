import type { TFile } from '@connectmessager/shared';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { db } from '..';
import { getErrorMessage } from '../../helpers/get-error-message';
import { PUBLIC_PATH } from '../../helpers/paths';
import { getThumbnailCachePath } from '../../helpers/thumbnails';
import { logger } from '../../logger';
import { files, messageFiles } from '../schema';

const removeFile = async (fileId: number): Promise<TFile | undefined> => {
  await db.delete(messageFiles).where(eq(messageFiles.fileId, fileId));

  const removedFile = await db
    .delete(files)
    .where(eq(files.id, fileId))
    .returning()
    .get();

  if (removedFile) {
    try {
      const filePath = path.join(PUBLIC_PATH, removedFile.name);

      await fs.unlink(filePath);

      const thumbnailPath = getThumbnailCachePath(removedFile.name);
      await fs.unlink(thumbnailPath).catch(() => {
        // no thumbnail exists for this file or already removed
      });
    } catch (error) {
      logger.error('Error deleting file from disk: %s', getErrorMessage(error));
    }
  }

  return removedFile;
};

export { removeFile };


