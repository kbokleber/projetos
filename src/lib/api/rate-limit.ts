/**
 * Rate limiter em memória — chave por token (ou IP se anônimo).
 * Janela deslizante simples: 100 req/min por padrão.
 *
 * Suficiente para MVP / single-instance. Em produção multi-instância,
 * trocar por Redis ou similar.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number; // epoch seconds
  retryAfter: number; // seconds
};

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  limit: 100,
  windowMs: 60 * 1000,
};

export function rateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + config.windowMs };
    buckets.set(key, fresh);
    return {
      allowed: true,
      remaining: config.limit - 1,
      reset: Math.floor(fresh.resetAt / 1000),
      retryAfter: 0,
    };
  }

  if (bucket.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      reset: Math.floor(bucket.resetAt / 1000),
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: config.limit - bucket.count,
    reset: Math.floor(bucket.resetAt / 1000),
    retryAfter: 0,
  };
}

/** Aplica os headers HTTP padrão em uma resposta. */
export function applyRateLimitHeaders(
  res: Response,
  result: RateLimitResult,
  limit: number,
): Response {
  res.headers.set("X-RateLimit-Limit", String(limit));
  res.headers.set("X-RateLimit-Remaining", String(Math.max(0, result.remaining)));
  res.headers.set("X-RateLimit-Reset", String(result.reset));
  if (!result.allowed) {
    res.headers.set("Retry-After", String(result.retryAfter));
  }
  return res;
}
