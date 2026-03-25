# Sprint v1 — Tasks: PaperToCode

## Status: In Progress

- [x] Task 1: Initialize Next.js 15 project with Tailwind CSS v4, Google Fonts (Space Grotesk + DM Mono), and base dark theme (P0)
  - Acceptance: `npm run dev` starts without errors; page renders with black background, correct fonts loaded, Tailwind utility classes working
  - Files: package.json, tsconfig.json, next.config.ts, postcss.config.mjs, src/app/layout.tsx, src/app/globals.css, src/app/page.tsx
  - Completed: 2026-03-24 — Next.js 16 + Tailwind v4 project initialized with Space Grotesk + DM Mono fonts, ARC Prize-inspired dark theme with grid background, teal accent color. 6 Playwright E2E tests passing.

- [x] Task 2: Build the main page layout — hero section with app title, tagline, and centered single-column container (P0)
  - Acceptance: Landing page shows "PaperToCode" branding, tagline ("Turn research papers into executable notebooks"), ARC Prize-inspired dark aesthetic with teal accents, subtle grid background pattern
  - Files: src/app/page.tsx, src/components/hero.tsx
  - Completed: 2026-03-24 — Hero section with "Powered by Gemini 2.5 Pro" badge, title, tagline, description, and 3-step workflow indicators. 9 Playwright tests passing.

- [x] Task 3: Build the API key input component with validation and the PDF upload component with drag-and-drop (P0)
  - Acceptance: User can enter API key (masked input, stored in React state only), drag-and-drop or click-to-upload PDF (validates file type + max 20MB), both components styled with dark theme
  - Files: src/components/api-key-input.tsx, src/components/pdf-upload.tsx, src/app/page.tsx
  - Completed: 2026-03-24 — API key input with show/hide toggle, PDF upload with drag-and-drop + file type/size validation, Generate button appears when both inputs provided. 15 Playwright tests passing.

- [x] Task 4: Create the `/api/generate` route handler — accept PDF + API key, initialize Gemini 2.5 Pro client, send PDF as multimodal input (P0)
  - Acceptance: API route receives FormData (PDF file + API key), initializes `@google/generative-ai` client, sends PDF to Gemini 2.5 Pro with a basic prompt, returns Gemini's response as JSON
  - Files: src/app/api/generate/route.ts, src/lib/gemini.ts
  - Completed: 2026-03-24 — API route with FormData parsing, validation, Gemini 2.5 Pro multimodal call, error handling. 3 unit tests + 15 E2E tests passing.

- [ ] Task 5: Engineer the notebook generation prompt — detailed system prompt that instructs Gemini to output structured notebook content with all 12 sections (P0)
  - Acceptance: Prompt produces structured JSON output from Gemini with: paper metadata, math formulations (LaTeX), algorithm implementations (Python), synthetic data generation, visualizations, ablation studies. Test with a sample paper
  - Files: lib/prompts.ts

- [ ] Task 6: Build the `.ipynb` file constructor — convert Gemini's structured response into valid nbformat v4 JSON (P0)
  - Acceptance: Given structured content, produces a valid `.ipynb` file that opens correctly in Jupyter/Colab with proper cell types (markdown + code), metadata, and kernel spec
  - Files: lib/notebook-builder.ts

- [ ] Task 7: Implement Server-Sent Events (SSE) streaming in the API route to send progress milestones during generation (P1)
  - Acceptance: API route streams events like "Analyzing paper structure...", "Extracting algorithms...", "Generating implementation...", "Building notebook..." as the pipeline progresses. Frontend can connect via EventSource
  - Files: app/api/generate/route.ts (modify to SSE), lib/progress.ts

- [ ] Task 8: Build the progress display UI — animated status messages, progress indicator, and engaging waiting experience (P1)
  - Acceptance: During generation, UI shows current stage with animated transitions, a pulsing/typing effect for status text, estimated stage descriptions. Dark theme consistent with rest of app
  - Files: components/progress-display.tsx, components/stage-indicator.tsx

- [ ] Task 9: Implement download button for `.ipynb` file and "Open in Colab" link (P1)
  - Acceptance: After generation completes, user sees a download button (triggers browser download of .ipynb), and an "Open in Colab" button (uploads notebook via Colab's upload mechanism or provides instructions). Both buttons styled with teal accent
  - Files: components/download-section.tsx, lib/colab-link.ts

- [ ] Task 10: End-to-end integration, error handling, and UI polish — connect all components, handle errors gracefully, responsive design (P2)
  - Acceptance: Full flow works: enter key → upload PDF → see progress → download notebook. Error states shown for: invalid API key, PDF too large, Gemini API errors, network failures. Works on mobile. Smooth transitions between states
  - Files: app/page.tsx (wire everything), components/* (error states), app/globals.css (animations)
