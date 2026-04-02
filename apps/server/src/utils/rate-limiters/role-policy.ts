import { createRateLimiter, getClientRateLimitKey } from './rate-limiter';

type TRolePolicyLimiterKind = 'messages' | 'requests';

const limiterMaps: Record<TRolePolicyLimiterKind, Map<number, ReturnType<typeof createRateLimiter>>> =
  {
    messages: new Map(),
    requests: new Map()
  };

const getRolePolicyLimiter = (
  kind: TRolePolicyLimiterKind,
  maxRequests: number,
  windowMs = 60_000
) => {
  const bucketKey = Math.max(1, Math.floor(maxRequests));
  const existing = limiterMaps[kind].get(bucketKey);

  if (existing) {
    return existing;
  }

  const limiter = createRateLimiter({
    maxRequests: bucketKey,
    windowMs,
    maxEntries: 10_000
  });

  limiterMaps[kind].set(bucketKey, limiter);

  return limiter;
};

const consumeRolePolicyLimit = (
  kind: TRolePolicyLimiterKind,
  userId: number,
  maxRequests: number,
  windowMs = 60_000
) => {
  const limiter = getRolePolicyLimiter(kind, maxRequests, windowMs);
  return limiter.consume(getClientRateLimitKey(`user:${userId}`));
};

export { consumeRolePolicyLimit };
