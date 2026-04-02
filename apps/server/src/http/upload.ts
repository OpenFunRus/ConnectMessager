import { UploadHeaders } from '@connectmessager/shared';
import fs from 'fs';
import http from 'http';
import z from 'zod';
import { getPrimaryUserRole } from '../db/queries/roles';
import { getSettings } from '../db/queries/server';
import { getUserByToken } from '../db/queries/users';
import { getAllowedRoleFileExtensions, getRoleLimits } from '../helpers/role-policy';
import { getErrorMessage } from '../helpers/get-error-message';
import { logger } from '../logger';
import { fileManager } from '../utils/file-manager';
import { sanitizeFileName } from './helpers';

const zHeaders = z.object({
  [UploadHeaders.TOKEN]: z.string(),
  [UploadHeaders.ORIGINAL_NAME]: z.string(),
  [UploadHeaders.CONTENT_LENGTH]: z.string().transform((val) => Number(val))
});

const uploadFileRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const parsedHeaders = zHeaders.parse(req.headers);

  const [token, rawOriginalName, contentLength] = [
    parsedHeaders[UploadHeaders.TOKEN],
    parsedHeaders[UploadHeaders.ORIGINAL_NAME],
    parsedHeaders[UploadHeaders.CONTENT_LENGTH]
  ];

  const originalName = sanitizeFileName(rawOriginalName);

  if (!originalName) {
    req.resume();
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid file name' }));
    return;
  }

  const user = await getUserByToken(token);

  if (!user) {
    req.resume();
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const settings = await getSettings();
  const primaryRole = await getPrimaryUserRole(user.id);
  const roleLimits = getRoleLimits(primaryRole);
  const allowedExtensions = getAllowedRoleFileExtensions(roleLimits);
  const normalizedExtension = originalName.split('.').pop()?.toLowerCase() ?? '';
  const roleFileSizeBytesLimit = roleLimits.fileSizeMb.enabled
    ? roleLimits.fileSizeMb.value * 1024 * 1024
    : null;
  const maxAllowedUploadSize = roleFileSizeBytesLimit
    ? Math.min(settings.storageUploadMaxFileSize, roleFileSizeBytesLimit)
    : settings.storageUploadMaxFileSize;

  if (allowedExtensions && !allowedExtensions.has(normalizedExtension)) {
    req.resume();
    req.on('end', () => {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: `File format .${normalizedExtension || 'unknown'} is not allowed for your role`
        })
      );
    });

    return;
  }

  if (contentLength > maxAllowedUploadSize) {
    req.resume();
    req.on('end', () => {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: `File ${originalName} exceeds the maximum allowed size`
        })
      );
    });

    return;
  }

  if (!settings.storageUploadEnabled) {
    req.resume();
    req.on('end', () => {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({ error: 'File uploads are disabled on this server' })
      );
    });

    return;
  }

  const safePath = await fileManager.getSafeUploadPath(originalName);
  const fileStream = fs.createWriteStream(safePath);

  req.pipe(fileStream);

  fileStream.on('finish', async () => {
    try {
      const tempFile = await fileManager.addTemporaryFile({
        originalName,
        filePath: safePath,
        size: contentLength,
        userId: user.id
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tempFile));
    } catch (error) {
      logger.error(
        'Error processing uploaded file: %s',
        getErrorMessage(error)
      );
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File processing failed' }));
    }
  });

  fileStream.on('error', (err) => {
    logger.error('Error uploading file: %s', getErrorMessage(err));

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File upload failed' }));
  });
};

export { sanitizeFileName, uploadFileRouteHandler };


