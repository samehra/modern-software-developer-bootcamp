# Sprint v1 — Walkthrough

## Summary

PaperToCode is a web application that transforms research paper PDFs into comprehensive, research-grade Google Colab notebooks. Users enter their Gemini API key, upload a PDF, and receive a structured `.ipynb` file containing algorithm implementations, mathematical formulations, synthetic data generation, visualizations, and ablation studies. The app uses Server-Sent Events to stream real-time progress updates during the ~30-60 second generation process, keeping users engaged. Built with Next.js 16, Tailwind CSS v4, and an ARC Prize-inspired dark theme.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (React)                           │
│                                                                  │
│  ┌──────────┐                                                    │
│  │  Hero    │  "PaperToCode" branding + 3-step workflow          │
│  └──────────┘                                                    │
│       │                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐                 │
│  │ API Key  │→ │  PDF Upload  │→ │  Generate   │                 │
│  │ Input    │  │ (drag+drop)  │  │  Button     │                 │
│  └──────────┘  └──────────────┘  └─────┬──────┘                 │
│                                        │                         │
│                               POST /api/generate                 │
│                               (FormData: PDF + key)              │
│                                        │                         │
│  ┌─────────────────────────┐           │                         │
│  │  Progress Display       │◀──────────┤ SSE stream              │
│  │  (stage label, %, bar)  │           │                         │
│  └─────────────────────────┘           │                         │
│                                        │                         │
│  ┌─────────────────────────┐           │                         │
│  │  Download Section       │◀──────────┘ "done" event            │
│  │  [Download .ipynb]      │                                     │
│  │  [Open in Colab]        │                                     │
│  └─────────────────────────┘                                     │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Next.js API Route: /api/generate                │
│                                                                  │
│  1. Validate inputs (API key, PDF type, file size ≤ 20MB)        │
│  2. Stream SSE progress events to browser                        │
│  3. Send PDF → Gemini 2.5 Pro (multimodal, base64-encoded)       │
│  4. Parse structured JSON response                               │
│  5. Build .ipynb notebook (nbformat v4, 12 sections)             │
│  6. Stream "done" event with notebook JSON                       │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│              Google Gemini 2.5 Pro API (Multimodal)              │
│  - Accepts PDF as inline base64 data                             │
│  - Returns structured JSON with 12 notebook sections             │
│  - User's own API key (BYOK — never stored server-side)          │
└──────────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### src/app/layout.tsx
**Purpose**: Root layout that loads Google Fonts and applies the global dark theme.

This is a server component that wraps every page. It loads two Google Fonts — **Space Grotesk** (for headings) and **DM Mono** (for body/monospace text) — via preconnect + stylesheet links. The `<body>` gets the `bg-grid` class which renders a subtle 40px CSS grid pattern on the black background.

### src/app/globals.css
**Purpose**: Tailwind CSS v4 configuration with custom theme tokens, animations, and global styles.

Uses Tailwind v4's `@theme` directive to define the design system:

```css
@theme {
  --font-heading: "Space Grotesk", sans-serif;
  --font-mono: "DM Mono", monospace;
  --color-teal: #00d4aa;
  --color-teal-dark: #00a885;
  --color-teal-glow: rgba(0, 212, 170, 0.15);
}
```

This makes `font-heading`, `font-mono`, `text-teal`, `bg-teal-glow`, etc. available as Tailwind utilities throughout the app. Also defines two custom animations:
- `animate-fade-in` — 0.4s ease-out slide-up for state transitions
- `animate-pulse-glow` — 2s infinite teal box-shadow pulse for the progress card

The `bg-grid` class creates the ARC Prize-inspired subtle grid pattern using two overlapping CSS linear gradients at 3% white opacity.

### src/app/page.tsx
**Purpose**: Main page — the entire application UI and state machine.

This is the app's only page. It manages a 4-state finite state machine:

```
idle → generating → done
                  → error → idle (retry)
```

**State variables**: `apiKey`, `pdfFile`, `appState`, `currentStage`, `error`, `notebook`, `paperName`.

**The `handleGenerate` function** is the core flow:
1. Creates a `FormData` with the API key and PDF file
2. POSTs to `/api/generate`
3. If the response is JSON (validation error), shows the error
4. Otherwise, reads the SSE stream using `ReadableStream` reader
5. Parses `event: ` and `data: ` lines from the stream
6. Updates `currentStage` on `progress` events, sets `notebook` on `done`, shows error on `error`

```typescript
const events = buffer.split("\n\n");
buffer = events.pop() || "";  // Keep incomplete events in buffer

for (const event of events) {
  const lines = event.split("\n");
  // Parse "event: progress" and "data: {...}" lines
  if (eventType === "progress") setCurrentStage(JSON.parse(eventData));
  else if (eventType === "done") { /* set notebook, switch to done */ }
  else if (eventType === "error") { /* show error */ }
}
```

The UI conditionally renders based on `appState`:
- **idle/error**: Shows ApiKeyInput, PdfUpload, Generate button
- **generating**: Shows ProgressDisplay with animated pulse glow
- **error**: Shows ProgressDisplay (error variant) + "Try Again" button
- **done**: Shows DownloadSection with download + Colab buttons

### src/app/api/generate/route.ts
**Purpose**: Server-side API route that validates inputs, calls Gemini, builds the notebook, and streams progress via SSE.

Handles `POST` requests with `FormData`. First validates:
- API key is present and non-empty
- PDF file is present, is actually a PDF, and is ≤ 20MB
- Returns `400` JSON errors for validation failures

For valid requests, creates a `ReadableStream` that sends SSE events:

```typescript
const stream = new ReadableStream({
  async start(controller) {
    const send = (event: string, data: unknown) => {
      controller.enqueue(encoder.encode(formatSSEMessage(event, data)));
    };

    send("progress", PROGRESS_STAGES[0]); // Uploading
    send("progress", PROGRESS_STAGES[1]); // Analyzing
    // ... Gemini API call happens here ...
    send("progress", PROGRESS_STAGES[3]); // Generating code
    const rawContent = await generateNotebookContent(apiKey, pdfBuffer, NOTEBOOK_SYSTEM_PROMPT);
    // ... more stages ...
    const notebook = buildNotebook(rawContent);
    send("done", { notebook, paperName: pdfFile.name });
  }
});
```

Returns the stream with `Content-Type: text/event-stream` headers. Catches Gemini API errors (including invalid key detection) and sends them as `error` events.

### src/components/hero.tsx
**Purpose**: Landing section with app branding, tagline, description, and 3-step workflow indicators.

A server component (no `"use client"`) that renders:
1. A "Powered by Gemini 2.5 Pro" pill badge with a pulsing green dot
2. The "PaperToCode" title with "To" in teal accent
3. A tagline and longer description paragraph
4. Three workflow steps (01 Upload PDF → 02 AI Analyzes → 03 Get Notebook) connected by horizontal lines on desktop, stacked vertically on mobile

### src/components/api-key-input.tsx
**Purpose**: Masked API key input with show/hide toggle.

A client component that renders a password input for the Gemini API key. The key is stored only in React state (parent `page.tsx` manages it) — never persisted to localStorage, cookies, or the server. The SHOW/HIDE toggle switches the input type between `password` and `text`. Includes a privacy reassurance message below the input.

### src/components/pdf-upload.tsx
**Purpose**: Drag-and-drop PDF upload with file type and size validation.

A client component with three states:
- **Empty**: Shows upload icon + "Drop your PDF here or click to browse"
- **File selected**: Shows checkmark icon + filename + file size + "Click to replace"
- **Error**: Shows red error text below the zone

Validation logic in `validateAndSet`:
```typescript
if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
  setError("Please upload a PDF file.");
  return;
}
if (file.size > MAX_FILE_SIZE) {
  setError("File too large. Maximum size is 20MB.");
  return;
}
```

The drop zone highlights with teal border + glow when dragging over it.

### src/components/progress-display.tsx
**Purpose**: Shows real-time generation progress or error state.

Accepts `currentStage` (a `ProgressStage` object) and `error` (string). Two rendering modes:

- **Error mode**: Red-tinted card with warning icon, "Generation Failed" header, and error message
- **Progress mode**: Card with stage label, percentage, animated progress bar, descriptive text, and a `StageIndicator` component. The card has the `animate-pulse-glow` class for a subtle teal glow animation.

The progress bar width is set via inline style with a 700ms CSS transition:
```typescript
<div className="h-full bg-teal rounded-full transition-all duration-700 ease-out"
     style={{ width: `${currentStage.percent}%` }} />
```

### src/components/stage-indicator.tsx
**Purpose**: Visual step completion dots showing which stages have been reached.

Renders 8 horizontal bars (one per `PROGRESS_STAGE`). Each bar turns teal when `currentPercent >= stage.percent`, creating a left-to-right fill effect. Uses 500ms color transition for smooth animation.

### src/components/download-section.tsx
**Purpose**: Post-generation UI with download and Colab buttons.

Shown when `appState === "done"`. Contains:
1. A success checkmark icon
2. "Notebook Ready" heading with the generated filename
3. **Download .ipynb** — Creates a Blob from the notebook JSON, generates an object URL, and triggers a download via a programmatic `<a>` click
4. **Open in Colab** — Downloads the file first, then opens `colab.research.google.com/#create=true` in a new tab after 300ms delay
5. "Generate another notebook" — Resets all state back to idle

### src/lib/gemini.ts
**Purpose**: Gemini API client — key validation, client creation, and multimodal PDF → notebook generation.

Three exports:
- `validateApiKey(key)` — checks if key is non-empty after trimming
- `createGeminiClient(apiKey)` — creates a `GoogleGenerativeAI` instance
- `generateNotebookContent(apiKey, pdfBuffer, systemPrompt)` — the main function that sends the PDF to Gemini 2.5 Pro

The PDF is sent as base64-encoded inline data:
```typescript
const pdfPart = {
  inlineData: {
    data: Buffer.from(pdfBuffer).toString("base64"),
    mimeType: "application/pdf",
  },
};
const result = await model.generateContent([
  { text: systemPrompt },
  pdfPart,
]);
```

### src/lib/prompts.ts
**Purpose**: The system prompt that instructs Gemini to produce structured JSON, and a response parser.

The `NOTEBOOK_SYSTEM_PROMPT` is a ~2,500-character prompt that:
1. Sets the persona: "expert ML research engineer at a top AI lab"
2. Defines the exact JSON schema with 12 top-level keys
3. Enforces 11 critical requirements (no placeholders, realistic dimensions, publication-quality plots, etc.)
4. Instructs Gemini to return ONLY raw JSON (no markdown fences)

`parseGeminiResponse(raw)` strips optional markdown code fences (` ```json ... ``` `) and parses the JSON. This handles cases where Gemini wraps its output despite being told not to.

### src/lib/notebook-builder.ts
**Purpose**: Converts Gemini's structured JSON into a valid nbformat v4 `.ipynb` file.

The `buildNotebook(rawContent)` function:
1. Parses the raw JSON via `parseGeminiResponse`
2. Iterates through all 12 sections, creating appropriate `NotebookCell` objects
3. Uses two helper functions: `md(lines)` for markdown cells and `code(lines)` for code cells
4. `splitLines(text)` splits code strings into line arrays with proper newlines (required by nbformat spec)
5. Returns a complete notebook object with `nbformat: 4`, `nbformat_minor: 5`, kernel spec for Python 3, and Colab-specific metadata

Example of how a section gets built:
```typescript
// --- 6. Implementation ---
const impl = data.implementation as Array<Record<string, string>>;
if (impl?.length) {
  cells.push(md(["## Implementation\n"]));
  for (const section of impl) {
    cells.push(md([`### ${section.title}\n`, "\n", `${section.description}\n`]));
    cells.push(code(splitLines(section.code)));
  }
}
```

### src/lib/progress.ts
**Purpose**: Defines the 8 progress stages and SSE message formatting.

Exports `PROGRESS_STAGES` — an array of 8 stages from "Uploading PDF" (5%) to "Complete" (100%), each with an id, human-readable label, detailed description, and percentage.

`formatSSEMessage(event, data)` formats messages per the SSE spec:
```typescript
export function formatSSEMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
```

### src/lib/colab-link.ts
**Purpose**: Utilities for downloading notebooks and generating Colab links.

Three exports:
- `generateDownloadBlob(notebook)` — pretty-prints the notebook JSON
- `getDownloadFilename(paperName)` — converts "paper.pdf" → "paper_notebook.ipynb"
- `generateColabHtml(notebook, paperName)` — creates an HTML page that auto-downloads the notebook and opens Colab (used as a fallback approach)

### package.json
**Purpose**: Project manifest with dependencies and scripts.

**Key dependencies**:
- `next@16.2.1`, `react@19.2.4` — Framework
- `@google/generative-ai@0.24.1` — Gemini SDK

**Key dev dependencies**:
- `tailwindcss@4.2.2` + `@tailwindcss/postcss` — Styling
- `@playwright/test@1.58.2` — E2E testing
- `vitest@4.1.1` — Unit testing
- `typescript@6.0.2` — Type checking

## Data Flow

1. **User opens app** → `page.tsx` renders in `idle` state → Hero + API key input visible
2. **User enters API key** → stored in `useState`, never persisted → PDF upload zone appears (fade-in animation)
3. **User uploads PDF** → `PdfUpload` validates type + size → filename displayed → "Generate Notebook" button appears
4. **User clicks Generate** → `handleGenerate()` fires:
   - Creates `FormData` with `apiKey` + `pdf` fields
   - `POST /api/generate` → API route validates inputs
   - If validation fails: JSON error response → error state shown
   - If valid: SSE stream begins
5. **SSE streaming** → API route sends 8 progress events:
   - `uploading` (5%) → `analyzing` (15%) → `extracting_math` (30%) → `generating_code` (50%) → `synthetic_data` (65%) → `visualizations` (80%) → `assembling` (95%) → `complete` (100%)
   - Between stages 3-4: Gemini 2.5 Pro processes the PDF (~30-60 seconds)
   - Frontend updates `ProgressDisplay` in real-time
6. **Gemini responds** → API route parses JSON → `buildNotebook()` creates .ipynb → sends `done` event
7. **Download available** → `DownloadSection` renders with:
   - "Download .ipynb" — Creates blob URL, triggers browser download
   - "Open in Colab" — Downloads file, then opens Colab in new tab
   - "Generate another" — Resets state machine to `idle`

## Test Coverage

### Unit Tests: 23 tests across 5 files
- **gemini.test.ts** (3 tests) — Client creation, empty key rejection, key format validation
- **prompts.test.ts** (5 tests) — Prompt length, section coverage, JSON parsing from markdown-wrapped and raw responses, invalid JSON handling
- **notebook-builder.test.ts** (8 tests) — nbformat structure, kernel spec, cell types, paper title in first cell, pip install cell, LaTeX math cells, implementation code cells, minimum cell count (15+)
- **progress.test.ts** (5 tests) — Stage count, stage structure, SSE message format, done events, error events
- **colab-link.test.ts** (2 tests) — Download blob validity, Colab HTML generation

### E2E Tests: 25 tests across 6 files
- **setup.spec.ts** (6 tests) — Page title, app title rendering, tagline, dark theme, Google Fonts loading, centered layout
- **hero.spec.ts** (3 tests) — Hero section rendering, 3 workflow steps, centered container
- **inputs.spec.ts** (6 tests) — API key input, show/hide toggle, PDF upload zone, file type validation, valid PDF acceptance, generate button visibility
- **progress.spec.ts** (3 tests) — Progress display rendering, stage label, progress bar
- **download.spec.ts** (2 tests) — Download section rendering, no console errors
- **integration.spec.ts** (5 tests) — Full flow (key → upload → generate → progress), error state with retry, mobile responsive layout, footer visibility, zero console errors

**Total: 48 tests passing, 0 failures**

## Security Measures

- **API key never persisted**: Stored only in React `useState`. Not sent to localStorage, cookies, or any server-side storage. The key is sent to the Next.js API route in FormData, which immediately passes it to Gemini — the server holds it only in memory during the request.
- **File validation**: PDF type check (`application/pdf` or `.pdf` extension) and 20MB size limit enforced both client-side and server-side.
- **No CORS exposure**: API routes are same-origin (Next.js server), no cross-origin concerns.
- **Input validation**: API key and file presence validated before processing.
- **Error message sanitization**: Gemini API errors are caught and only relevant messages forwarded — no stack traces or internal details exposed.
- **0 vulnerabilities**: `yarn audit` reports 0 known vulnerabilities across 226 packages.

## Known Limitations

1. **No server-side notebook persistence** — Generated notebooks exist only in browser memory. If the user closes the tab before downloading, the notebook is lost.
2. **Progress stages are cosmetic** — Stages 1-3 and 5-7 fire immediately; the real wait is entirely during stage 4 (Gemini API call). The intermediate stages give the illusion of fine-grained progress.
3. **No retry on Gemini timeout** — If the Gemini API call takes too long or times out, the user must retry manually.
4. **Notebook quality depends on Gemini** — The system prompt is comprehensive but Gemini may still produce incomplete code, incorrect LaTeX, or toy-sized synthetic data for some papers.
5. **No PDF preview** — Users can't see the paper content before generating.
6. **Open in Colab is indirect** — Downloads the file first, then opens Colab's create page. Users must manually upload the downloaded file into Colab.
7. **No input sanitization on Gemini response** — If Gemini returns malformed JSON, the notebook build fails with a generic error.
8. **Single-page app state** — No URL routing; refreshing the page loses all state.
9. **No rate limiting** — A user could spam the generate endpoint (though they're paying with their own API key).

## What's Next

**v2 priorities** (based on PRD trajectory and limitations):

1. **Authentication + accounts** — User signup/login so generated notebooks can be saved and retrieved later
2. **Usage tracking** — Log generations per user, paper titles, generation success rates
3. **Improved Colab integration** — Use Google Drive API to directly upload notebooks and generate a real Colab link (requires OAuth)
4. **Retry + error recovery** — Auto-retry on Gemini timeouts, better error classification
5. **PDF preview** — Show the first page of the uploaded PDF so users can confirm they uploaded the right paper
6. **Model selection** — Let users choose between Gemini 2.5 Pro (quality) and Gemini 2.5 Flash (speed)
7. **Notebook quality validation** — Parse the generated Python code with AST before including it, flag cells that won't execute
8. **Deployment** — Docker container, CI/CD pipeline, production hosting
