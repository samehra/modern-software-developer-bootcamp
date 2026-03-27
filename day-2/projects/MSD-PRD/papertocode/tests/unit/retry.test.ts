import { describe, it, expect, vi } from "vitest";
import { withRetry, isRetryableError } from "../../src/lib/retry";

describe("Retry Logic", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("500 Internal Server Error"))
      .mockResolvedValue("ok");
    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-retryable error (401)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("401 Unauthorized"));
    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    ).rejects.toThrow("401");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry on non-retryable error (400)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("400 Bad Request"));
    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    ).rejects.toThrow("400");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting all retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("503 Service Unavailable"));
    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })
    ).rejects.toThrow("503");
    expect(fn).toHaveBeenCalledTimes(3); // 1 original + 2 retries
  });

  it("calls onRetry callback", async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("ok");
    await withRetry(fn, { maxRetries: 2, baseDelayMs: 10, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });
});

describe("isRetryableError", () => {
  it("returns true for 500 errors", () => {
    expect(isRetryableError(new Error("500 Internal Server Error"))).toBe(true);
  });

  it("returns true for timeout errors", () => {
    expect(isRetryableError(new Error("DEADLINE_EXCEEDED"))).toBe(true);
    expect(isRetryableError(new Error("timeout"))).toBe(true);
  });

  it("returns true for 503 errors", () => {
    expect(isRetryableError(new Error("503 Service Unavailable"))).toBe(true);
  });

  it("returns true for RESOURCE_EXHAUSTED", () => {
    expect(isRetryableError(new Error("RESOURCE_EXHAUSTED"))).toBe(true);
  });

  it("returns false for 401 errors", () => {
    expect(isRetryableError(new Error("401 Unauthorized"))).toBe(false);
  });

  it("returns false for 400 errors", () => {
    expect(isRetryableError(new Error("400 Bad Request"))).toBe(false);
  });

  it("returns false for 403 errors", () => {
    expect(isRetryableError(new Error("403 Forbidden"))).toBe(false);
  });

  it("returns true for UNAVAILABLE errors", () => {
    expect(isRetryableError(new Error("UNAVAILABLE"))).toBe(true);
  });

  it("returns true for ECONNRESET errors", () => {
    expect(isRetryableError(new Error("ECONNRESET"))).toBe(true);
  });

  it("returns true for ENOTFOUND errors", () => {
    expect(isRetryableError(new Error("ENOTFOUND"))).toBe(true);
  });

  it("returns false for API_KEY_INVALID errors", () => {
    expect(isRetryableError(new Error("API_KEY_INVALID"))).toBe(false);
  });

  it("returns false for PERMISSION_DENIED errors", () => {
    expect(isRetryableError(new Error("PERMISSION_DENIED"))).toBe(false);
  });

  it("returns false for unknown error messages", () => {
    expect(isRetryableError(new Error("something random happened"))).toBe(false);
  });
});

describe("Retry Edge Cases", () => {
  it("works with maxRetries=0 (no retries, just one attempt)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("500 error"));
    await expect(withRetry(fn, { maxRetries: 0, baseDelayMs: 10 })).rejects.toThrow("500");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("wraps non-Error throws into Error objects", async () => {
    const fn = vi.fn().mockRejectedValue("string error");
    await expect(withRetry(fn, { maxRetries: 0, baseDelayMs: 10 })).rejects.toThrow("string error");
  });

  it("onRetry receives correct attempt numbers on multiple retries", async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("500 first"))
      .mockRejectedValueOnce(new Error("502 second"))
      .mockResolvedValue("ok");
    await withRetry(fn, { maxRetries: 2, baseDelayMs: 10, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error));
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error));
  });
});
