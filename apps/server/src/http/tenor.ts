import http from 'http';
import { getErrorMessage } from '../helpers/get-error-message';
import { logger } from '../logger';

type TTenorGifItem = {
  id: string;
  url: string;
  previewUrl: string;
};

type TTenorV2Response = {
  results?: Array<{
    id: string;
    media_formats?: {
      gif?: { url?: string };
      tinygif?: { url?: string };
    };
  }>;
};

type TTenorV1Response = {
  results?: Array<{
    id: string;
    media?: Array<{
      gif?: { url?: string };
      tinygif?: { url?: string };
    }>;
  }>;
};

const TENOR_LIMIT_DEFAULT = 10;
const TENOR_LIMIT_MAX = 10;
const TENOR_PUBLIC_KEY = 'LIVDSRZULELA';
const TENOR_CLIENT_KEY = 'connectmessager-web';

const mapV2 = (payload: TTenorV2Response): TTenorGifItem[] =>
  (payload.results ?? [])
    .map((item) => {
      const url = item.media_formats?.gif?.url;
      const previewUrl = item.media_formats?.tinygif?.url ?? url;

      if (!url || !previewUrl) {
        return null;
      }

      return {
        id: item.id,
        url,
        previewUrl
      };
    })
    .filter((item): item is TTenorGifItem => !!item);

const mapV1 = (payload: TTenorV1Response): TTenorGifItem[] =>
  (payload.results ?? [])
    .map((item) => {
      const media = item.media?.[0];
      const url = media?.gif?.url;
      const previewUrl = media?.tinygif?.url ?? url;

      if (!url || !previewUrl) {
        return null;
      }

      return {
        id: item.id,
        url,
        previewUrl
      };
    })
    .filter((item): item is TTenorGifItem => !!item);

const getLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? '', 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return TENOR_LIMIT_DEFAULT;
  }

  return Math.min(parsed, TENOR_LIMIT_MAX);
};

const fetchTenorV2 = async (query: string, limit: number) => {
  const key = process.env.CONNECTMESSAGER_TENOR_API_KEY ?? TENOR_PUBLIC_KEY;
  const isSearching = query.length > 0;
  const endpoint = isSearching ? 'search' : 'featured';
  const params = new URLSearchParams({
    key,
    client_key: TENOR_CLIENT_KEY,
    limit: String(limit),
    media_filter: 'gif',
    random: 'true'
  });

  if (isSearching) {
    params.set('q', query);
  }

  const response = await fetch(
    `https://tenor.googleapis.com/v2/${endpoint}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Tenor v2 failed with status ${response.status}`);
  }

  const payload = (await response.json()) as TTenorV2Response;
  return mapV2(payload);
};

const fetchTenorV1 = async (query: string, limit: number) => {
  const isSearching = query.length > 0;
  const endpoint = isSearching ? 'search' : 'random';
  const params = new URLSearchParams({
    key: TENOR_PUBLIC_KEY,
    media_filter: 'minimal',
    limit: String(limit),
    q: isSearching ? query : 'random'
  });

  const response = await fetch(`https://g.tenor.com/v1/${endpoint}?${params}`);

  if (!response.ok) {
    throw new Error(`Tenor v1 failed with status ${response.status}`);
  }

  const payload = (await response.json()) as TTenorV1Response;
  return mapV1(payload);
};

const tenorRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const url = new URL(req.url ?? '/tenor', `http://${req.headers.host}`);
  const q = (url.searchParams.get('q') ?? '').trim();
  const limit = getLimit(url.searchParams.get('limit'));

  try {
    let items: TTenorGifItem[] = [];

    try {
      items = await fetchTenorV2(q, limit);
    } catch {
      items = await fetchTenorV1(q, limit);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ results: items.slice(0, limit) }));
  } catch (error) {
    logger.warn('Tenor route failed: %s', getErrorMessage(error));
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to load gifs from Tenor' }));
  }
};

export { tenorRouteHandler };

