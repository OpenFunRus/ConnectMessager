import fs from 'fs';
import http from 'http';
import path from 'path';
import { getErrorMessage } from '../helpers/get-error-message';
import { INTERFACE_PATH } from '../helpers/paths';
import { logger } from '../logger';
import { IS_DEVELOPMENT, IS_TEST } from '../utils/env';

const interfaceRouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  if (IS_DEVELOPMENT && !IS_TEST) {
    res.writeHead(302, { Location: 'http://localhost:5173' });
    res.end();

    return res;
  }

  let subPath = req.url || '/';

  const urlPart = subPath.split('?')[0];

  subPath = urlPart ? decodeURIComponent(urlPart) : '/';
  subPath = subPath === '/' ? 'index.html' : subPath;

  const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;

  const requestedPath = path.resolve(INTERFACE_PATH, cleanSubPath);
  const basePath = path.resolve(INTERFACE_PATH);

  if (!requestedPath.startsWith(basePath)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));

    return res;
  }

  if (!fs.existsSync(requestedPath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));

    return res;
  }

  const stats = fs.statSync(requestedPath);

  if (stats.isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));

    return res;
  }

  const file = Bun.file(requestedPath);
  const fileStream = fs.createReadStream(requestedPath);
  const relativePath = path.relative(basePath, requestedPath).replace(/\\/g, '/');
  const isIndexHtml = relativePath === 'index.html';
  const isViteHashedAsset = /^assets\/.+-[A-Za-z0-9_-]{6,}\.(js|css)$/.test(
    relativePath
  );

  fileStream.on('open', () => {
    const cacheHeaders: Record<string, string> = isIndexHtml
      ? {
          // Always revalidate shell HTML so clients discover new asset hashes.
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0'
        }
      : isViteHashedAsset
        ? {
            // Hashed assets are content-addressed and safe to cache for long time.
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        : {
            'Cache-Control': 'public, max-age=3600'
          };

    res.writeHead(200, {
      'Content-Type': file.type,
      'Content-Length': file.size,
      ...cacheHeaders
    });
    fileStream.pipe(res);
  });

  fileStream.on('error', (err) => {
    logger.error('Error serving file: %s', getErrorMessage(err));

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    } else {
      res.destroy();
    }
  });

  res.on('close', () => {
    fileStream.destroy();
  });

  return res;
};

export { interfaceRouteHandler };
