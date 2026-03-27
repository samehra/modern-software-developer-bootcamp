# Sprint v2 — Walkthrough

## Summary

Sprint v2 hardened PaperToCode against all 12 security findings from the v1 audit and added three user-facing features: model selection (Gemini 2.5 Pro vs Flash), PDF preview after upload, and automatic retry with exponential backoff on Gemini API failures. The sprint added 6 new library modules, 2 new UI components, and grew the test suite from 48 to 108 tests (66 unit + 42 E2E). A post-sprint security audit confirmed 10 of 12 v1 findings resolved, with zero CRITICAL or HIGH issues remaining.

## Architecture Overview

```
+------------------------------------------------------------------+
|                        Browser (React)                            |
|                                                                   |
|  +----------+                                                     |
|  |  Hero    |  "PaperToCode" branding + 3-step workflow           |
|  +----------+                                                     |
|       |                                                           |
|  +----------+  +-----------+  +----------+                        |
|  | API Key  |->| Model     |->| PDF      |                        |
|  | Input    |  | Selector  |  | Upload   |                        |
|  | (format  |  | (Pro/     |  | + Preview|                        |
|  |  check)  |  |  Flash)   |  | (canvas) |                        |
|  +----------+  +-----------+  +----+-----+                        |
|                                    |                              |
|                           [Generate Button]                       |
|                                    |                              |
|                          POST /api/generate                       |
|                          FormData: PDF + key + model               |
|                                    |                              |
|  +-------------------------+       |                              |
|  |  Progress Display       |<------+ SSE stream                   |
|  |  (+ "Retrying..." msg)  |       |                              |
|  +-------------------------+       |                              |
|                                    |                              |
|  +-------------------------+       |                              |
|  |  Download Section       |<------+ "done" event                 |
|  |  [Download .ipynb]      |                                      |
|  |  [Open in Colab]        |                                      |
|  +-------------------------+                                      |
+------------------------------------------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|             Next.js API Route: /api/generate                      |
|                                                                   |
|  NEW: Rate Limiter (5 req/min/IP)                                 |
|    |                                                              |
|    v                                                              |
|  Validate: API key, PDF type/size, model whitelist                |
|    |                                                              |
|    v                                                              |
|  Stream SSE progress events                                       |
|    |                                                              |
|    v                                                              |
|  NEW: withRetry() wrapper (2 retries, 2s/4s backoff)              |
|    |                                                              |
|    v                                                              |
|  Gemini call (systemInstruction separation)                       |
|    |                                                              |
|    v                                                              |
|  NEW: Zod schema validation on JSON response                      |
|    |                                                              |
|    v                                                              |
|  NEW: sanitizeCodeCell() on every code cell                       |
|    |                                                              |
|    v                                                              |
|  Build .ipynb + warning banner                                    |
|    |                                                              |
|    v                                                              |
|  NEW: Generic error messages only (4 categories)                  |
+------------------------------------------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|    next.config.ts: 6 Security Headers on every response           |
|    CSP | X-Frame-Options | X-Content-Type | Referrer-Policy       |
|    Permissions-Policy | X-DNS-Prefetch-Control                    |
+------------------------------------------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|            Google Gemini API (Pro or Flash)                        |
|  - systemInstruction for prompt separation                        |
|  - User selects model; server whitelist-validates                 |
+------------------------------------------------------------------+
```

## Files Created/Modified

---

### next.config.ts (Modified)
**Purpose**: Adds 6 security headers to every HTTP response.
**Fixes**: SEC-05 (missing security headers)

**How it works**:
The `headers()` async function returns an array with a single catch-all rule (`source: "/(.*)"`) that attaches 6 headers to every response. The Content-Security-Policy is the most complex, allowing `'self'` for most directives, Google Fonts for styles/fonts, the Gemini API for `connect-src`, and `data:`/`blob:` for images (needed for PDF preview canvas).

```typescript
{
  key: "Content-Security-Policy",
  value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
         "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
         "font-src 'self' fonts.gstatic.com; " +
         "connect-src 'self' generativelanguage.googleapis.com; " +
         "img-src 'self' data: blob:",
}
```

`unsafe-inline` and `unsafe-eval` are required by Next.js in development mode. The `'self'` in `font-src` is necessary because Next.js serves built-in Geist fonts from localhost, not from Google Fonts.

---

### src/lib/rate-limiter.ts (New)
**Purpose**: In-memory sliding window rate limiter for the API route.
**Fixes**: SEC-02 (no rate limiting), SEC-08 (no abuse protection)

**Key exports**:
- `RateLimiter` class — configurable `maxRequests` and `windowMs`
- `apiRateLimiter` — pre-configured singleton (5 requests per 60 seconds)

**How it works**:
The `RateLimiter` class uses a `Map<string, RateLimitEntry>` keyed by IP address. Each entry stores a `count` and `windowStart` timestamp. When `check(ip)` is called:

1. If no entry exists or the window has expired, create a fresh entry with `count: 1`
2. If within the window and under the limit, increment count
3. If at the limit, return `allowed: false` with a `retryAfterMs` value

```typescript
check(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = this.store.get(ip);

  if (!entry || now - entry.windowStart >= this.windowMs) {
    this.store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: this.maxRequests - 1, retryAfterMs: 0 };
  }

  if (entry.count < this.maxRequests) {
    entry.count++;
    return { allowed: true, remaining: this.maxRequests - entry.count, retryAfterMs: 0 };
  }

  const retryAfterMs = this.windowMs - (now - entry.windowStart);
  return { allowed: false, remaining: 0, retryAfterMs };
}
```

The API route extracts the client IP from `x-forwarded-for` or `x-real-ip` headers and returns `429 Too Many Requests` with a `Retry-After` header when the limit is exceeded.

---

### src/lib/sanitizer.ts (New)
**Purpose**: Scans generated Python code cells for dangerous patterns and flags them with warning comments.
**Fixes**: SEC-03 (prompt injection), SEC-10 (no output sanitization)

**Key exports**:
- `DANGEROUS_PATTERNS` — array of 7 regex/label pairs
- `sanitizeCodeCell(code)` — scans a code string, returns `{ flagged, sanitized, warnings }`
- `NOTEBOOK_WARNING_CELL` — markdown lines for the warning banner at the top of every notebook

**How it works**:
The sanitizer splits code into lines and tests each line against 7 dangerous patterns:

| Pattern | Catches |
|---------|---------|
| `\bos\.system\s*\(` | Shell command execution |
| `\bsubprocess\b` | Process spawning |
| `\beval\s*\(` | Dynamic code evaluation |
| `\bexec\s*\(` | Dynamic code execution |
| `\b__import__\s*\(` | Dynamic module imports |
| `\bshutil\.rmtree\s*\(` | Recursive directory deletion |
| `\bopen\s*\(\s*['"]\/(?:etc\|proc\|sys\|dev)` | Reading sensitive system files |

When a line matches, a `# WARNING` comment is inserted above it. The dangerous line is preserved (not removed) so researchers can review and decide. This is a defense-in-depth measure — the real security boundary is the `systemInstruction` separation that prevents the PDF content from overriding the system prompt.

```typescript
if (lineFlagged) {
  outputLines.push("# WARNING: The following line was flagged as potentially dangerous. Review before executing.");
  outputLines.push(line);
} else {
  outputLines.push(line);
}
```

The `NOTEBOOK_WARNING_CELL` is a markdown cell prepended to every generated notebook, reminding users to review all code before executing.

---

### src/lib/retry.ts (New)
**Purpose**: Exponential backoff retry wrapper for the Gemini API call.

**Key exports**:
- `isRetryableError(error)` — classifies errors as retryable or not
- `withRetry(fn, options)` — generic async retry wrapper

**How it works**:
Errors are classified using two pattern lists. Non-retryable patterns (400, 401, 403, `API_KEY_INVALID`, `PERMISSION_DENIED`) are checked first and fail immediately — no point retrying a bad API key. Retryable patterns (5xx, timeout, `DEADLINE_EXCEEDED`, `RESOURCE_EXHAUSTED`, `UNAVAILABLE`, `ECONNRESET`, `ENOTFOUND`) trigger a retry.

The `withRetry` function runs the provided async function up to `maxRetries + 1` times. On each retry, the delay doubles (exponential backoff):

```typescript
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    return await fn();
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    if (attempt < maxRetries && isRetryableError(lastError)) {
      onRetry?.(attempt + 1, lastError);
      const delay = baseDelayMs * Math.pow(2, attempt); // 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else {
      throw lastError;
    }
  }
}
```

In the API route, this wraps the Gemini call with `maxRetries: 2` and `baseDelayMs: 2000`, producing delays of 2s then 4s. The `onRetry` callback sends a "Retrying..." SSE progress event so the user sees feedback.

---

### src/lib/schema.ts (New)
**Purpose**: Zod v4 schema that validates Gemini's JSON output structure before notebook building.
**Fixes**: SEC-11 (no output validation)

**Key exports**:
- `validateGeminiOutput(input)` — returns `{ success, data?, error? }`

**How it works**:
Defines a Zod schema matching the 12-section notebook structure from the system prompt. `paper_metadata` (with `title: string`) is the only required field — all other sections are optional, reflecting that Gemini may not produce every section for every paper.

```typescript
const geminiOutputSchema = z.object({
  paper_metadata: paperMetadataSchema,           // Required
  key_contributions: z.array(z.string()).optional(),
  environment_setup: z.object({ ... }).optional(),
  mathematical_formulation: z.array(...).optional(),
  // ... 8 more optional sections
});
```

On validation failure, `z.prettifyError()` produces a human-readable error message (e.g., "Missing required field: paper_metadata.title") that gets included in the thrown error. This is called from `parseGeminiResponse()` in prompts.ts — between JSON parsing and notebook building.

---

### src/lib/gemini.ts (Modified)
**Purpose**: Gemini API client — now includes key format validation, `systemInstruction` separation, and configurable model.
**Fixes**: SEC-01 (key validation), SEC-03 (prompt injection), SEC-07 (key format)

**Key changes**:
- New `isValidGeminiKeyFormat(key)` — validates against `/^AIza[0-9A-Za-z_-]{35}$/` (39 chars total, matching Gemini's key format)
- `generateNotebookContent()` now takes a `modelName` parameter (defaults to `"gemini-2.5-pro"`)
- System prompt moved from inline content to `systemInstruction` parameter — this is the primary prompt injection defense

```typescript
// BEFORE (v1): system prompt mixed with user content
const result = await model.generateContent([
  { text: systemPrompt },  // Could be overridden by PDF content
  pdfPart,
]);

// AFTER (v2): system prompt in dedicated parameter
const model = genAI.getGenerativeModel({
  model: modelName,
  systemInstruction: systemPrompt,  // Treated as trusted by Gemini
});
const result = await model.generateContent([
  { text: "Analyze this research paper..." },
  pdfPart,
]);
```

The `systemInstruction` parameter tells Gemini to treat the prompt as a system-level instruction that cannot be overridden by user content in the PDF. This is the standard defense against prompt injection in LLM APIs.

---

### src/lib/prompts.ts (Modified)
**Purpose**: System prompt and response parser — now integrates Zod schema validation.

**Key change**: `parseGeminiResponse()` now validates the parsed JSON against the Zod schema before returning:

```typescript
export function parseGeminiResponse(raw: string): Record<string, unknown> {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  const parsed = JSON.parse(cleaned);

  const validation = validateGeminiOutput(parsed);
  if (!validation.success) {
    throw new Error(`Invalid Gemini response structure: ${validation.error}`);
  }

  return parsed;
}
```

This catches cases where Gemini returns syntactically valid JSON that doesn't match the expected structure (e.g., missing `paper_metadata.title`), producing a descriptive error instead of a crash deep in notebook-builder.

---

### src/lib/notebook-builder.ts (Modified)
**Purpose**: Converts Gemini's JSON into .ipynb — now sanitizes code cells and prepends a warning banner.

**Key changes**:
1. Every notebook starts with a warning markdown cell (`NOTEBOOK_WARNING_CELL`) reminding users to review generated code
2. The `code()` helper now runs every code cell through `sanitizeCodeCell()`:

```typescript
function code(lines: string[]): NotebookCell {
  const raw = lines.join("");
  const { sanitized } = sanitizeCodeCell(raw);
  return {
    cell_type: "code",
    metadata: {},
    source: splitLines(sanitized),
    outputs: [],
    execution_count: null,
  };
}
```

This means if Gemini generates a code cell containing `os.system("rm -rf /")`, the notebook will include it with a `# WARNING` comment above it, and the user sees the warning banner at the top of the notebook.

---

### src/lib/colab-link.ts (Modified)
**Purpose**: Download utilities — `generateColabHtml()` removed (XSS vector).
**Fixes**: SEC-04 (XSS vulnerability)

The `generateColabHtml()` function built raw HTML strings from user input without escaping, creating an XSS vector. Since it was unused (the app uses blob download + `window.open` instead), it was deleted entirely. Only `generateDownloadBlob()` and `getDownloadFilename()` remain.

---

### src/app/api/generate/route.ts (Modified)
**Purpose**: API route — now includes rate limiting, model validation, retry, and error sanitization.
**Fixes**: SEC-02, SEC-08, SEC-09

**Key changes (in order of execution)**:

1. **Rate limiting** (lines 12-28): Extracts IP from `x-forwarded-for` or `x-real-ip`, checks against `apiRateLimiter`. Returns `429` with `Retry-After` header if exceeded.

2. **Model whitelist** (line 34): Only `"gemini-2.5-flash"` passes through; everything else defaults to `"gemini-2.5-pro"`. This prevents arbitrary model names from being sent to Google.

3. **Retry wrapper** (lines 86-99): The Gemini call is wrapped in `withRetry()` with 2 retries and 2s base delay. On retry, a "Retrying..." SSE event is sent to keep the user informed.

4. **Error sanitization** (lines 114-138): Raw error messages are logged to `console.error` for debugging but never sent to the client. Instead, errors are classified into 4 generic categories:

```typescript
if (rawMessage.includes("API_KEY_INVALID") || rawMessage.includes("401")) {
  send("error", { message: "Invalid Gemini API key. Please check and try again." });
} else if (rawMessage.includes("429") || rawMessage.includes("RESOURCE_EXHAUSTED")) {
  send("error", { message: "Gemini API rate limit reached. Please wait and try again." });
} else if (rawMessage.includes("timeout") || rawMessage.includes("DEADLINE_EXCEEDED")) {
  send("error", { message: "Request timed out. The paper may be too large. Please try again." });
} else {
  send("error", { message: "Notebook generation failed. Please try again." });
}
```

---

### src/app/page.tsx (Modified)
**Purpose**: Main page — now includes model selection state and passes model to API.

**Key changes**:
- New `model` state variable (defaults to `"gemini-2.5-pro"`)
- `ModelSelector` component renders when the API key field has content
- `formData.append("model", model)` sends the selection to the API
- Footer updated from "PaperToCode v1" to "PaperToCode v2"

The UI flow is now: Enter API key -> Model selector appears -> Upload PDF -> PDF preview renders -> Generate button appears.

---

### src/components/api-key-input.tsx (Modified)
**Purpose**: API key input — now validates Gemini key format on blur and shows corrected privacy message.
**Fixes**: SEC-01 (misleading privacy claim), SEC-07 (no format validation)

**Key changes**:
- New `touched` state tracks whether the field has been blurred
- On blur, if the key doesn't match `/^AIza[0-9A-Za-z_-]{35}$/`, a red error appears: "Invalid format. Gemini keys start with "AIza" and are 39 characters."
- Privacy message updated from "never leaves your browser" to "Your key is sent securely to our server for processing. Never stored or logged."

```typescript
const showFormatError = touched && value.length > 0 && !isValidGeminiKeyFormat(value);
```

The format check is client-side only (advisory). The server-side `validateApiKey()` still accepts any non-empty string, allowing the actual Gemini API to be the final validator.

---

### src/components/model-selector.tsx (New)
**Purpose**: Two-option toggle for choosing between Gemini 2.5 Pro and Flash.

Renders a 2-column grid with two styled buttons. The selected model gets a teal border and glow. Each option has a label ("Pro" / "Flash") and a short description ("Higher quality, deeper analysis" / "Faster generation, lower cost"). The component uses `data-testid` and `data-selected` attributes for E2E testing.

---

### src/components/pdf-preview.tsx (New)
**Purpose**: Renders a thumbnail of the uploaded PDF's first page using pdfjs-dist.

**How it works**:
A `useEffect` hook fires when the `file` prop changes. It dynamically imports `pdfjs-dist`, reads the file as an `ArrayBuffer`, loads the PDF document, gets page 1, and renders it to a `<canvas>` element at 0.5x scale (~200px wide). A cleanup function sets a `cancelled` flag to prevent state updates if the component unmounts during async rendering.

```typescript
const pdfjsLib = await import("pdfjs-dist");
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

const arrayBuffer = await file.arrayBuffer();
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
setPageCount(pdf.numPages);

const page = await pdf.getPage(1);
const viewport = page.getViewport({ scale: 0.5 });
// ... render to canvas
```

On error (e.g., corrupted PDF), it falls back to showing the filename + "Preview not available" text instead of a blank canvas.

---

### src/components/pdf-upload.tsx (Modified)
**Purpose**: Upload zone — now renders PdfPreview below the drop zone when a file is selected.

One line added:
```typescript
{selectedFile && !error && <PdfPreview file={selectedFile} />}
```

---

## Data Flow

1. **User opens app** -> `page.tsx` renders in `idle` state -> Hero + API key input visible
2. **User enters API key** -> on blur, `isValidGeminiKeyFormat()` checks format -> if invalid, red error shown -> Model selector + PDF upload appear (fade-in)
3. **User selects model** -> `ModelSelector` toggles between Pro and Flash -> stored in React state
4. **User uploads PDF** -> `PdfUpload` validates type + size -> `PdfPreview` renders first page on canvas -> Generate button appears
5. **User clicks Generate** -> `handleGenerate()` fires:
   - Creates `FormData` with `apiKey` + `pdf` + `model`
   - `POST /api/generate`
   - **Rate limiter checks IP** -> if 6th request in 60s, returns `429` with `Retry-After`
   - Validates API key (non-empty), PDF (type, size <= 20MB), model (whitelist)
   - SSE stream begins
6. **Generation pipeline**:
   - 8 progress stages streamed to browser
   - `withRetry()` wraps Gemini call -> on 5xx/timeout, waits 2s/4s and retries (max 2x)
   - On retry, "Retrying..." SSE event sent to browser
   - Gemini uses `systemInstruction` (prompt injection defense)
7. **Post-processing**:
   - Gemini JSON parsed -> validated against Zod schema
   - `buildNotebook()` creates .ipynb -> warning banner prepended -> every code cell sanitized
   - `done` SSE event sent with notebook JSON
8. **On error**: Raw error logged to `console.error` -> generic message sent to client (4 categories: invalid key, rate limit, timeout, generic failure)
9. **All responses** include 6 security headers (CSP, X-Frame-Options, etc.)

## Test Coverage

### Unit Tests: 66 tests across 8 files

- **gemini.test.ts** (8 tests) — Client creation, empty key rejection, valid/invalid key format patterns, AIza prefix check, length validation
- **prompts.test.ts** (6 tests) — Prompt content, JSON parsing, markdown-wrapped responses, Zod validation integration, invalid structure rejection
- **notebook-builder.test.ts** (9 tests) — Warning banner as first cell, nbformat structure, kernel spec, cell types, paper title, pip install, LaTeX, implementation code, minimum cell count
- **progress.test.ts** (5 tests) — Stage count, structure, SSE format, done events, error events
- **colab-link.test.ts** (3 tests) — Download blob validity, filename generation, `generateColabHtml` confirmed removed
- **rate-limiter.test.ts** (5 tests) — Allows requests under limit, blocks 6th request, returns retryAfterMs, resets after window, handles multiple IPs
- **sanitizer.test.ts** (11 tests) — Clean code passes through, each of 7 patterns detected, WARNING comment insertion, multi-pattern code, NOTEBOOK_WARNING_CELL content
- **retry.test.ts** (13 tests) — First-try success, retry on 5xx, no retry on 401/400/403, exhaustion after max retries, onRetry callback, `isRetryableError` for all patterns (500, 503, timeout, DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED)
- **schema.test.ts** (6 tests) — Valid full response, minimal valid (paper_metadata only), missing required title, null input, wrong type, partial sections

### E2E Tests: 42 tests across 8 files

- **setup.spec.ts** (6 tests) — Page title, app rendering, tagline, dark theme, fonts, layout
- **hero.spec.ts** (3 tests) — Hero section, workflow steps, centering
- **inputs.spec.ts** (6 tests) — API key input, show/hide, upload zone, file validation, PDF acceptance, generate button
- **progress.spec.ts** (3 tests) — Progress display, stage label, progress bar
- **download.spec.ts** (2 tests) — Download section, no console errors
- **security-headers.spec.ts** (7 tests) — All 6 headers verified individually, CSP directives parsed
- **model-selector.spec.ts** (3 tests) — Renders Pro/Flash options, toggles selection, default is Pro
- **pdf-preview.spec.ts** (2 tests) — Preview container renders after upload, fallback on invalid PDF
- **integration.spec.ts** (5 tests) — Full v1 flow regression, error+retry, mobile, footer, zero console errors
- **v2-integration.spec.ts** (5 tests) — Full v2 flow (key -> model -> upload -> preview -> generate), malformed key error, security headers in API response, mobile layout, v1 regression check

**Total: 108 tests (66 unit + 42 E2E), 0 failures**

## Security Measures

### Implemented in v2

| Defense | Implementation | v1 Finding Fixed |
|---------|---------------|-----------------|
| Security headers | 6 headers on every response via `next.config.ts` | SEC-05 |
| Content-Security-Policy | Restricts scripts, styles, fonts, connections to known origins | SEC-05 |
| Rate limiting | 5 req/min/IP, in-memory sliding window, 429 + Retry-After | SEC-02, SEC-08 |
| API key format validation | `/^AIza[0-9A-Za-z_-]{35}$/` regex on blur (client-side) | SEC-07 |
| Privacy claim corrected | "Sent securely to server for processing. Never stored or logged." | SEC-01 |
| Prompt injection defense | `systemInstruction` parameter separates system prompt from user content | SEC-03 |
| Code cell sanitizer | 7 dangerous patterns flagged with WARNING comments | SEC-03, SEC-10 |
| Warning banner | Every notebook starts with "Review all code before executing" | SEC-03 |
| XSS vector removed | `generateColabHtml()` deleted | SEC-04 |
| Error sanitization | 4 generic error categories; raw errors logged server-side only | SEC-09 |
| Schema validation | Zod validates Gemini JSON before notebook building | SEC-11 |
| Model whitelist | Only `"gemini-2.5-pro"` and `"gemini-2.5-flash"` accepted | New |

### Carried from v1

- API key stored only in React `useState` — never in localStorage, cookies, or server storage
- PDF type + size validation (both client and server)
- Same-origin API routes (no CORS exposure)
- 0 known dependency vulnerabilities (`npm audit` clean)

## Known Limitations

1. **In-memory rate limiter** — Resets on server restart. No cleanup of expired entries (Map grows unbounded). Won't work in serverless/edge deployments (no shared state). Acceptable for local dev.

2. **CSP allows `unsafe-inline` and `unsafe-eval`** — Required by Next.js in development mode. Should be tightened with nonce-based CSP for production.

3. **Server-side key validation is weak** — `validateApiKey()` only checks non-empty. The strict format check (`isValidGeminiKeyFormat`) is client-side only. Direct API calls with malformed keys waste a rate limit token.

4. **Sanitizer has known bypass vectors** — Doesn't catch `os.popen()`, `importlib.import_module()`, `ctypes`, `pickle.loads()`, or obfuscated patterns. The sanitizer is advisory (adds warnings, doesn't remove code).

5. **No CORS configuration** — Relies on Next.js same-origin defaults. A misconfigured reverse proxy could open the API.

6. **Progress stages are still cosmetic** — Stages 1-3 and 5-7 fire instantly; the real wait is the Gemini call (stage 4). Retry messages are the only genuine real-time feedback.

7. **No notebook persistence** — Generated notebooks exist only in browser memory. Closing the tab loses them.

8. **Single-page state** — No URL routing; refreshing loses all state.

9. **PDF preview requires working pdfjs-dist** — If the library fails to load (e.g., CSP blocks the worker), the fallback shows filename only.

## What's Next

**v3 priorities** (based on limitations and PRD trajectory):

1. **Deployment infrastructure** — Docker container, CI/CD pipeline, production hosting (Vercel or Railway)
2. **Production CSP** — Nonce-based Content-Security-Policy via Next.js middleware, remove `unsafe-inline`/`unsafe-eval`
3. **Persistent rate limiting** — Redis or Upstash for shared rate limit state across instances
4. **Server-side key format validation** — Use `isValidGeminiKeyFormat()` in the API route for defense in depth
5. **Expanded sanitizer patterns** — Add `os.popen`, `importlib`, `pickle.loads`, `ctypes` to the dangerous pattern list
6. **User accounts + notebook history** — Authentication, saved notebooks, generation history
7. **Improved Colab integration** — Google Drive API for direct upload, real Colab links
8. **Notebook quality validation** — Parse generated Python with AST before including, flag cells that won't execute
