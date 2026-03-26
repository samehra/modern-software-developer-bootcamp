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

    // Simulate time passing by manipulating the internal state
    // We test the reset by creating a new window
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
});
