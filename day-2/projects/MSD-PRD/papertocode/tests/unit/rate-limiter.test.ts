import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter } from "../../src/lib/rate-limiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 5, windowMs: 60_000 });
  });

  it("allows requests within the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("127.0.0.1").allowed).toBe(true);
    }
  });

  it("rejects the 6th request within the window", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("127.0.0.1");
    }
    const result = limiter.check("127.0.0.1");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("10.0.0.1");
    }
    expect(limiter.check("10.0.0.1").allowed).toBe(false);
    expect(limiter.check("10.0.0.2").allowed).toBe(true);
  });

  it("resets after the window expires", () => {
    const shortLimiter = new RateLimiter({ maxRequests: 2, windowMs: 100 });
    shortLimiter.check("127.0.0.1");
    shortLimiter.check("127.0.0.1");
    expect(shortLimiter.check("127.0.0.1").allowed).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(shortLimiter.check("127.0.0.1").allowed).toBe(true);
        resolve();
      }, 150);
    });
  });

  it("returns remaining count", () => {
    const result = limiter.check("127.0.0.1");
    expect(result.remaining).toBe(4);
  });

  it("remaining decrements correctly on each request", () => {
    expect(limiter.check("1.1.1.1").remaining).toBe(4);
    expect(limiter.check("1.1.1.1").remaining).toBe(3);
    expect(limiter.check("1.1.1.1").remaining).toBe(2);
    expect(limiter.check("1.1.1.1").remaining).toBe(1);
    expect(limiter.check("1.1.1.1").remaining).toBe(0);
  });

  it("returns remaining=0 and retryAfterMs>0 when blocked", () => {
    for (let i = 0; i < 5; i++) limiter.check("2.2.2.2");
    const result = limiter.check("2.2.2.2");
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("handles many different IPs without interference", () => {
    for (let i = 0; i < 100; i++) {
      expect(limiter.check(`192.168.0.${i}`).allowed).toBe(true);
    }
    // First IP still has 4 remaining
    expect(limiter.check("192.168.0.0").remaining).toBe(3);
  });

  it("works with maxRequests=1 (single request allowed)", () => {
    const strict = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });
    expect(strict.check("5.5.5.5").allowed).toBe(true);
    expect(strict.check("5.5.5.5").allowed).toBe(false);
  });

  it("retryAfterMs decreases over time within window", () => {
    const shortLimiter = new RateLimiter({ maxRequests: 1, windowMs: 200 });
    shortLimiter.check("6.6.6.6");
    const first = shortLimiter.check("6.6.6.6");
    expect(first.allowed).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const second = shortLimiter.check("6.6.6.6");
        expect(second.allowed).toBe(false);
        expect(second.retryAfterMs).toBeLessThan(first.retryAfterMs);
        resolve();
      }, 50);
    });
  });
});
