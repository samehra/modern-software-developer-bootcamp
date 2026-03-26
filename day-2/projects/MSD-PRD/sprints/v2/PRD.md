# Sprint v2 — PRD: PaperToCode (Security Hardening + Features)

## Overview

Sprint v2 hardens PaperToCode against the 12 security findings from the v1 audit and adds two high-value features: model selection (Gemini 2.5 Pro vs Flash) and PDF preview. The goal is to make the app production-safe while keeping the BYOK (Bring Your Own Key) architecture. No deployment infrastructure yet — that's v3.

## Goals

- Fix all CRITICAL and HIGH severity security findings (SEC-01 through SEC-05)
- Fix MEDIUM severity findings (SEC-07, SEC-09)
- Add rate limiting to prevent abuse and memory exhaustion
- Defend against prompt injection in user-uploaded PDFs
- Let users choose between Gemini 2.5 Pro (quality) and Gemini 2.5 Flash (speed)
- Show a PDF preview so users can confirm they uploaded the right paper
- Validate Gemini's JSON output with a schema before building the notebook

## User Stories

- As a user, I want accurate privacy messaging about how my API key is handled, so I can trust the application
- As a user, I want to choose between a high-quality model and a fast model, so I can trade off speed vs depth
- As a user, I want to see a preview of my PDF after uploading, so I can confirm it's the right paper before generating
- As a security engineer, I want proper security headers, rate limiting, and input validation, so the app is safe for public deployment
- As a user, I want the app to retry automatically if Gemini times out, so I don't have to manually retry

## Technical Architecture

### Changes from v1

```
v1 Architecture (unchanged pieces):
  Browser → POST /api/generate → Gemini 2.5 Pro → .ipynb download

v2 Additions:
  ┌─────────────────────────────────────────────────────────┐
  │                    NEW: Security Layer                    │
  │                                                          │
  │  next.config.ts ──── Security headers (CSP, X-Frame,    │
  │                      X-Content-Type, Referrer-Policy)    │
  │                                                          │
  │  rate-limiter.ts ─── In-memory token bucket              │
  │                      (5 req/min per IP)                  │
  │                                                          │
  │  route.ts ────────── Gemini key format validation        │
  │                      Generic error messages              │
  │                      systemInstruction separation        │
  │                                                          │
  │  sanitizer.ts ────── Post-generation code cell scanning  │
  │                      (os.system, subprocess, eval, exec) │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │                    NEW: Features                          │
  │                                                          │
  │  model-selector.tsx ── Toggle: Pro (quality) / Flash     │
  │                        (speed). Sends model choice to    │
  │                        API route.                        │
  │                                                          │
  │  pdf-preview.tsx ───── Renders first page of PDF using   │
  │                        <canvas> + PDF.js or <iframe>.    │
  │                        Shows after upload, before gen.   │
  │                                                          │
  │  gemini.ts ─────────── Retry with exponential backoff    │
  │                        (max 2 retries, 2s/4s delays)    │
  │                                                          │
  │  schema.ts ─────────── Zod schema for Gemini JSON       │
  │                        output. Validates before build.   │
  └─────────────────────────────────────────────────────────┘
```

### Updated Data Flow

1. User opens app → enters Gemini API key (validated against `AIza...` format)
2. User uploads PDF → preview thumbnail rendered in-browser
3. User selects model: "Pro (Quality)" or "Flash (Speed)"
4. User clicks Generate → rate limiter checks IP (5 req/min)
5. API route uses `systemInstruction` (not inline text) for prompt separation
6. Gemini call with retry (max 2 retries on timeout/5xx)
7. Response validated against Zod schema → code cells scanned for dangerous patterns
8. Notebook built and streamed back → generic error messages on failure
9. All responses include security headers

### Security Headers Added

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `X-DNS-Prefetch-Control` | `off` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; connect-src 'self' generativelanguage.googleapis.com` |

### Prompt Injection Defense (SEC-03)

Three-layer defense:
1. **Separation**: Use Gemini's `systemInstruction` parameter instead of mixing system prompt with user content
2. **Post-generation scan**: Scan all code cells for dangerous patterns (`os.system`, `subprocess`, `eval`, `exec`, `__import__`, `shutil.rmtree`, `open('/etc/`)
3. **Warning banner**: Add a markdown cell at the top of every generated notebook: "This notebook was auto-generated. Review all code cells before executing."

## Out of Scope (v3+)

- User authentication and accounts
- Server-side notebook persistence / history
- Deployment infrastructure (Docker, Vercel, CI/CD)
- CSRF tokens (no auth = no session to protect)
- Subresource Integrity on Google Fonts (low severity)
- Google Drive integration for direct Colab upload
- Payment / subscription system

## Dependencies

- Sprint v1 complete (all 10 tasks, 48 tests passing)
- `pdfjs-dist` npm package for client-side PDF rendering (new dependency)
- `zod` npm package for schema validation (new dependency)
