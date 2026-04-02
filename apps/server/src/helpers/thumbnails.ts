import fs from 'fs/promises';
import path from 'path';
import { PUBLIC_PATH } from './paths';

const THUMBNAIL_MAX_WIDTH = 320;

const THUMBNAIL_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);
let jimpLoaderAttempted = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let jimpReader: any | null = null;
const thumbnailJobs = new Map<string, Promise<string | null>>();

const canGenerateThumbnailForMime = (mimeType: string): boolean => {
  return THUMBNAIL_ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
};

const getThumbnailCachePath = (fileName: string): string => {
  const parsed = path.posix.parse(fileName);
  const relativeThumbPath = parsed.dir
    ? path.posix.join(parsed.dir, `${parsed.name}_thumb.png`)
    : `${parsed.name}_thumb.png`;

  return path.join(PUBLIC_PATH, ...relativeThumbPath.split('/'));
};

const getJimpReader = async () => {
  if (jimpLoaderAttempted) {
    return jimpReader;
  }

  jimpLoaderAttempted = true;

  try {
    // jimp is pure JS, so it works in both Windows .exe and Linux runtime.
    const jimpModule = (await import('jimp')) as unknown as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Jimp?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default?: any;
    };
    jimpReader = jimpModule.Jimp ?? jimpModule.default ?? null;
  } catch {
    jimpReader = null;
  }

  return jimpReader;
};

const ensureThumbnail = async (
  sourcePath: string,
  fileName: string,
  mimeType: string
): Promise<string | null> => {
  if (!canGenerateThumbnailForMime(mimeType)) {
    return null;
  }

  const thumbPath = getThumbnailCachePath(fileName);

  try {
    await fs.access(thumbPath);
    return thumbPath;
  } catch {
    // continue and generate new thumbnail
  }

  const existingJob = thumbnailJobs.get(fileName);
  if (existingJob) {
    return existingJob;
  }

  const job = (async () => {
    try {
      await fs.mkdir(path.dirname(thumbPath), { recursive: true });

      const Jimp = await getJimpReader();
      if (!Jimp) {
        return null;
      }

      const image = await Jimp.read(sourcePath);
      image.scaleToFit({
        w: THUMBNAIL_MAX_WIDTH,
        h: THUMBNAIL_MAX_WIDTH
      });
      await image.write(thumbPath);
      return thumbPath;
    } catch {
      // Failed to decode/encode this specific image.
      return null;
    } finally {
      thumbnailJobs.delete(fileName);
    }
  })();

  thumbnailJobs.set(fileName, job);
  return job;
};

export {
  canGenerateThumbnailForMime,
  ensureThumbnail,
  getThumbnailCachePath
};
