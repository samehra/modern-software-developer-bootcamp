# Sprint v2 — Tasks: PaperToCode

## Status: In Progress

- [x] Task 1: Add security headers in next.config.ts (P0)
  - Acceptance: All 6 security headers present in every response. Verify with `curl -I http://localhost:3000` — headers include X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control, Content-Security-Policy. App still renders correctly (CSP doesn't block fonts or styles).
  - Files: next.config.ts
  - Fixes: SEC-05
  - Completed: 2026-03-25 — Added 6 security headers in next.config.ts. CSP includes self + Google Fonts + Gemini API. 7 E2E tests passing, 32 total tests passing.

- [x] Task 2: Fix API key privacy claim and add Gemini key format validation (P0)
  - Acceptance: Privacy message updated to "Your key is sent securely to our server for processing. Never stored or logged." API key validation rejects keys not matching Gemini format (`AIza` prefix, 39 chars). Unit tests for the new validation. Frontend shows inline error for malformed keys before submission.
  - Files: src/components/api-key-input.tsx, src/lib/gemini.ts, tests/unit/gemini.test.ts
  - Fixes: SEC-01, SEC-07
  - Completed: 2026-03-25 — Added isValidGeminiKeyFormat() with /^AIza[0-9A-Za-z_-]{35}$/ regex, updated privacy message, added inline format error on blur, updated footer to v2. 8 unit tests + 32 E2E passing.

- [x] Task 3: Add rate limiting middleware to /api/generate (P0)
  - Acceptance: In-memory token bucket rate limiter (5 requests per minute per IP). 6th request within 60s returns `429 Too Many Requests` JSON response. Rate limiter resets after window expires. Unit tests for the limiter logic.
  - Files: src/lib/rate-limiter.ts, src/app/api/generate/route.ts, tests/unit/rate-limiter.test.ts
  - Fixes: SEC-02, SEC-08
  - Completed: 2026-03-25 — RateLimiter class with sliding window, 5 req/min per IP, Retry-After header, integrated into API route. 5 unit tests passing.

- [x] Task 4: Defend against prompt injection — use systemInstruction + code cell sanitizer (P0)
  - Acceptance: Gemini call uses `systemInstruction` parameter (not inline text). New `sanitizeNotebook()` function scans code cells for dangerous patterns (os.system, subprocess, eval, exec, __import__, shutil.rmtree) and adds a `# WARNING` comment above flagged lines. A warning markdown cell is prepended to every notebook. Unit tests for sanitizer with malicious code samples.
  - Files: src/lib/gemini.ts, src/lib/sanitizer.ts, src/lib/notebook-builder.ts, tests/unit/sanitizer.test.ts
  - Fixes: SEC-03
  - Completed: 2026-03-25 — systemInstruction separation in Gemini call, sanitizeCodeCell() with 7 dangerous patterns, warning banner prepended to notebooks. 11 sanitizer unit tests + 45 total unit tests passing.

- [x] Task 5: Remove unused XSS-vulnerable function + sanitize error messages (P0)
  - Acceptance: `generateColabHtml()` deleted from colab-link.ts (confirmed unused in download-section.tsx). Error messages in route.ts replaced with generic messages — no raw error.message forwarded to client. Existing colab-link tests updated. Server logs detailed errors to console.
  - Files: src/lib/colab-link.ts, src/app/api/generate/route.ts, tests/unit/colab-link.test.ts
  - Fixes: SEC-04, SEC-09
  - Completed: 2026-03-25 — Removed generateColabHtml() XSS vector, replaced raw error forwarding with 4 safe generic messages, added console.error server-side logging. 46 unit tests passing.

- [x] Task 6: Add model selection component — Gemini 2.5 Pro vs Flash (P1)
  - Acceptance: New `ModelSelector` component renders two options: "Pro (Quality)" and "Flash (Speed)" with descriptions. Default is Pro. Selected model passed through to /api/generate as a form field. API route uses the selected model name in the Gemini call. E2E test verifies selector renders and toggles.
  - Files: src/components/model-selector.tsx, src/app/page.tsx, src/app/api/generate/route.ts, src/lib/gemini.ts, tests/e2e/model-selector.spec.ts
  - Completed: 2026-03-25 — ModelSelector with Pro/Flash toggle, model param in FormData, API route whitelist validation, gemini.ts accepts modelName. 3 E2E tests passing.

- [ ] Task 7: Add PDF preview after upload (P1)
  - Acceptance: After PDF upload, a thumbnail of the first page renders below the upload zone using pdfjs-dist (canvas rendering). Preview is ~200px wide with a subtle border. If PDF rendering fails, show a graceful fallback (filename + page count text). E2E test verifies preview appears after upload.
  - Files: src/components/pdf-preview.tsx, src/components/pdf-upload.tsx, tests/e2e/pdf-preview.spec.ts, package.json (add pdfjs-dist)

- [ ] Task 8: Add Zod schema validation on Gemini JSON output (P1)
  - Acceptance: Zod schema defines the expected structure of Gemini's 12-section response. `parseGeminiResponse()` validates against schema after JSON.parse. On validation failure, returns a descriptive error ("Missing required field: implementation") instead of crashing. Unit tests with valid, partial, and malformed responses.
  - Files: src/lib/schema.ts, src/lib/prompts.ts, tests/unit/schema.test.ts
  - Fixes: SEC-11

- [ ] Task 9: Add retry logic for Gemini API failures (P1)
  - Acceptance: `generateNotebookContent()` retries up to 2 times on timeout or 5xx errors with exponential backoff (2s, then 4s). Non-retryable errors (401, 403, 400) fail immediately. Progress display shows "Retrying..." message on retry. Unit tests mock failure scenarios.
  - Files: src/lib/gemini.ts, src/lib/progress.ts, src/app/api/generate/route.ts, tests/unit/gemini.test.ts

- [ ] Task 10: E2E integration tests for v2 security and features (P2)
  - Acceptance: New Playwright tests covering: (1) rate limit error shown after rapid requests, (2) model selector integrated in full flow, (3) PDF preview visible in full flow, (4) malformed API key rejected before submission, (5) security headers present in response. All existing v1 tests still pass. Screenshots taken at key steps.
  - Files: tests/e2e/security.spec.ts, tests/e2e/v2-integration.spec.ts
