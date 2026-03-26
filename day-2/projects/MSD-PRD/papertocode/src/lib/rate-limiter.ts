interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private maxRequests: number;
  private windowMs: number;

  constructor({ maxRequests, windowMs }: RateLimiterOptions) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(ip: string): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(ip);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.store.set(ip, { count: 1, windowStart: now });
      return { allowed: true, remaining: this.maxRequests - 1, retryAfterMs: 0 };
    }

    if (entry.count < this.maxRequests) {
      entry.count++;
      const remaining = this.maxRequests - entry.count;
      return { allowed: true, remaining, retryAfterMs: 0 };
    }

    const retryAfterMs = this.windowMs - (now - entry.windowStart);
    return { allowed: false, remaining: 0, retryAfterMs };
  }
}

export const apiRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60_000,
});
