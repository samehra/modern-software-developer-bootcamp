const RETRYABLE_PATTERNS = [
  /5\d{2}/,                  // 5xx server errors
  /timeout/i,
  /DEADLINE_EXCEEDED/,
  /RESOURCE_EXHAUSTED/,
  /UNAVAILABLE/,
  /ECONNRESET/,
  /ENOTFOUND/,
];

const NON_RETRYABLE_PATTERNS = [
  /40[013]/,  // 400, 401, 403
  /API_KEY_INVALID/,
  /PERMISSION_DENIED/,
];

export function isRetryableError(error: Error): boolean {
  const msg = error.message;
  if (NON_RETRYABLE_PATTERNS.some((p) => p.test(msg))) return false;
  if (RETRYABLE_PATTERNS.some((p) => p.test(msg))) return true;
  return false;
}

interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, baseDelayMs, onRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries && isRetryableError(lastError)) {
        onRetry?.(attempt + 1, lastError);
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw lastError;
      }
    }
  }

  throw lastError;
}
