import { eq } from 'drizzle-orm';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { db } from '../db';
import { isFileOrphaned } from '../db/queries/files';
import { getMessageByFileId } from '../db/queries/messages';
import { channels, files } from '../db/schema';
import { verifyFileToken } from '../helpers/files-crypto';
import { getErrorMessage } from '../helpers/get-error-message';
import { PUBLIC_PATH } from '../helpers/paths';
import { ensureThumbnail, getThumbnailCachePath } from '../helpers/thumbnails';
import { logger } from '../logger';

const pipeFileStream = (
  filePath: string,
  res: http.ServerResponse,
  streamOptions?: { start: number; end: number }
) => {
  const fileStream = fs.createReadStream(filePath, streamOptions);

  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    logger.error('Error serving file: %s', getErrorMessage(err));

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  res.on('close', () => {
    fileStream.destroy();
  });

  fileStream.on('end', () => {
    res.end();
  });
};

const getThumbnailSourceFileName = (fileName: string): string | null => {
  const parsed = path.posix.parse(fileName);

  if (!parsed.name.endsWith('_thumb') || parsed.ext.toLowerCase() !== '.png') {
    return null;
  }

  const originalBaseName = parsed.name.slice(0, -'_thumb'.length);
  if (!originalBaseName) {
    return null;
  }

  const originalExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

  for (const extension of originalExtensions) {
    const originalFileName = parsed.dir
      ? path.posix.join(parsed.dir, `${originalBaseName}${extension}`)
      : `${originalBaseName}${extension}`;

    if (fs.existsSync(path.join(PUBLIC_PATH, ...originalFileName.split('/')))) {
      return originalFileName;
    }
  }

  return null;
};

const publicRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad request' }));
    return;
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const publicPrefix = '/public/';
  if (!url.pathname.startsWith(publicPrefix)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad request' }));
    return;
  }

  const decodedPath = decodeURIComponent(url.pathname.slice(publicPrefix.length));
  const normalizedPublicPath = path.posix.normalize(decodedPath);
  const invalidPath =
    !normalizedPublicPath ||
    normalizedPublicPath.startsWith('..') ||
    path.isAbsolute(normalizedPublicPath);

  if (invalidPath) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad request' }));
    return;
  }

  const requestedFileName = normalizedPublicPath;
  const thumbnailSourceFileName = getThumbnailSourceFileName(requestedFileName);
  const fileName = thumbnailSourceFileName ?? requestedFileName;
  const isDirectThumbnailRequest = thumbnailSourceFileName !== null;
  const wantsThumbnail =
    isDirectThumbnailRequest ||
    url.searchParams.get('thumb') === '1' ||
    url.searchParams.get('thumbnail') === '1';

  const dbFile = await db
    .select()
    .from(files)
    .where(eq(files.name, fileName))
    .get();

  if (!dbFile) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found' }));
    return;
  }

  const isOrphaned = await isFileOrphaned(dbFile.id);

  if (isOrphaned) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found' }));
    return;
  }

  // it's gonna be defined if it's a message file
  // otherwise is something like an avatar or banner or something else
  // we can assume this because of the orphaned check above
  const associatedMessage = await getMessageByFileId(dbFile.id);

  if (associatedMessage) {
    const channel = await db
      .select()
      .from(channels)
      .where(eq(channels.id, associatedMessage.channelId))
      .get();

    if (channel) {
      const accessToken = url.searchParams.get('accessToken');
      const isValidToken = verifyFileToken(
        dbFile.id,
        channel.fileAccessToken,
        accessToken || ''
      );

      if (!isValidToken) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }
    }
  }

  const filePath = path.join(PUBLIC_PATH, dbFile.name);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found on disk' }));
    return;
  }

  const stat = fs.statSync(filePath);
  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  };

  if (wantsThumbnail) {
    try {
      const thumbPath = getThumbnailCachePath(dbFile.name);

      if (fs.existsSync(thumbPath)) {
        const thumbStat = fs.statSync(thumbPath);

        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': thumbStat.size,
          ...noCacheHeaders
        });

        pipeFileStream(thumbPath, res);
        return res;
      }

      if (isDirectThumbnailRequest) {
        void ensureThumbnail(filePath, dbFile.name, dbFile.mimeType);

        res.writeHead(404, {
          'Content-Type': 'application/json',
          ...noCacheHeaders
        });
        res.end(JSON.stringify({ error: 'Thumbnail not found' }));
        return res;
      }

      void ensureThumbnail(filePath, dbFile.name, dbFile.mimeType);

      res.writeHead(404, {
        'Content-Type': 'application/json',
        ...noCacheHeaders
      });
      res.end(JSON.stringify({ error: 'Thumbnail not ready' }));
      return res;
    } catch (error) {
      logger.warn('Thumbnail generation failed: %s', getErrorMessage(error));
      res.writeHead(404, {
        'Content-Type': 'application/json',
        ...noCacheHeaders
      });
      res.end(JSON.stringify({ error: 'Thumbnail generation failed' }));
      return res;
    }
  }

  const inlineAllowlist = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'video/mp4',
    'audio/mpeg'
  ];

  const contentDisposition = inlineAllowlist.includes(dbFile.mimeType)
    ? 'inline'
    : 'attachment';

  const safeFileName = dbFile.originalName
    .replace(/[\r\n]/g, '') // strip CR/LF to prevent header injection
    .replace(/"/g, '\\"'); // escape double quotes for header safety

  const encodedFileName = encodeURIComponent(dbFile.originalName).replace(
    /'/g,
    '%27'
  );

  const dispositionHeader = `${contentDisposition}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`;

  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    const match = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);

    if (!match) {
      res.writeHead(416, {
        'Content-Range': `bytes */${stat.size}`
      });
      res.end();
      return;
    }

    const start = parseInt(match[1]!, 10);
    const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;

    if (start >= stat.size || end >= stat.size || start > end) {
      res.writeHead(416, {
        'Content-Range': `bytes */${stat.size}`
      });
      res.end();
      return;
    }

    const contentLength = end - start + 1;

    res.writeHead(206, {
      'Content-Type': dbFile.mimeType,
      'Content-Length': contentLength,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': dispositionHeader,
      ...noCacheHeaders
    });

    pipeFileStream(filePath, res, { start, end });
  } else {
    res.writeHead(200, {
      'Content-Type': dbFile.mimeType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': dispositionHeader,
      ...noCacheHeaders
    });

    pipeFileStream(filePath, res);
  }

  return res;
};

export { publicRouteHandler };
