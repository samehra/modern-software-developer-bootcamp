# Sprint v3 — PRD: PaperToCode (Production-Ready)

## Overview

Sprint v3 makes PaperToCode production-ready with three pillars: comprehensive testing (testing pyramid with ~70% unit / ~30% integration + a real-browser quality test), CI/CD via GitHub Actions (lint, test, security scan on every push, block merge on failure), and cloud deployment via Docker + AWS ECS Fargate with Terraform. The Next.js monolith architecture is preserved.

## Goals

- Achieve robust test coverage following the testing pyramid: expand unit tests for all `src/lib/` modules, add integration tests for `/api/generate` with mocked Gemini
- Add a real-browser E2E quality test that generates an actual notebook from a real PDF using a live Gemini API key (local-only, not in CI)
- Set up GitHub Actions CI: run Vitest, Playwright, semgrep, and npm audit on every push/PR — block merge on failure
- Dockerize the Next.js app with a multi-stage build and docker-compose for local development
- Provision AWS ECS Fargate infrastructure with Terraform (ECR, ECS cluster, ALB, CloudWatch)
- Add a CD pipeline that auto-deploys to AWS when tests pass on `main`

## User Stories

- As a developer, I want comprehensive unit and integration tests, so I can refactor with confidence
- As a developer, I want CI checks on every PR, so bugs and security issues are caught before merge
- As a user, I want to run the app in Docker, so I don't need to install Node.js locally
- As a stakeholder, I want automatic deployment to AWS, so new features reach production without manual steps
- As a QA engineer, I want a real-browser quality test, so I can verify the full PDF-to-notebook pipeline end-to-end

## Technical Architecture

### Unchanged from v2

```
Browser (React) → POST /api/generate (FormData: PDF + key + model)
    ↓ SSE stream
Rate Limiter → Validation → withRetry(Gemini call) → Zod schema → Sanitizer → .ipynb
```

### New: Testing Pyramid

```
                ┌───────────────────┐
                │  Real E2E Quality │  1 test (local only)
                │  (headed browser, │  Real API key + PDF
                │   real Gemini)    │  Validates notebook output
                └───────────────────┘
            ┌───────────────────────────┐
            │   Integration Tests       │  ~8-10 tests
            │   (Vitest, mocked Gemini, │  Test /api/generate route
            │    full request/response) │  All validation + error paths
            └───────────────────────────┘
    ┌───────────────────────────────────────────┐
    │            Unit Tests                      │  ~80+ tests
    │   (Vitest, all src/lib/ modules)           │  Edge cases, error handling
    │   gemini, sanitizer, rate-limiter, retry,  │
    │   schema, prompts, notebook-builder, etc.  │
    └───────────────────────────────────────────┘
```

### New: CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Actions                         │
│                                                          │
│  ON: push / pull_request                                 │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ CI Workflow (.github/workflows/ci.yml)            │    │
│  │                                                   │    │
│  │  1. yarn install                                  │    │
│  │  2. yarn build (type check)                       │    │
│  │  3. vitest run (unit + integration)               │    │
│  │  4. playwright test (E2E, headless)               │    │
│  │  5. npx semgrep --config auto src/                │    │
│  │  6. npm audit --audit-level=high                  │    │
│  │                                                   │    │
│  │  All must pass to merge.                          │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ON: push to main (after CI passes)                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ CD Workflow (.github/workflows/cd.yml)            │    │
│  │                                                   │    │
│  │  1. Build Docker image                            │    │
│  │  2. Push to AWS ECR                               │    │
│  │  3. Update ECS Fargate service                    │    │
│  │                                                   │    │
│  │  Requires: AWS_ACCESS_KEY_ID,                     │    │
│  │            AWS_SECRET_ACCESS_KEY in GitHub Secrets │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### New: Docker + AWS Architecture

```
┌──────────────────┐        ┌──────────────────────────────┐
│  Developer Local  │        │         AWS Cloud             │
│                   │        │                               │
│  docker-compose   │        │  ┌────────────┐              │
│    ┌───────────┐  │        │  │    ALB     │  (port 80)   │
│    │  Next.js  │  │        │  │ (public)   │              │
│    │  :3000    │  │        │  └─────┬──────┘              │
│    └───────────┘  │        │        │                     │
│                   │        │  ┌─────▼──────┐              │
└──────────────────┘        │  │ ECS Fargate │              │
                             │  │  (Next.js)  │              │
                             │  │  :3000      │              │
                             │  └─────────────┘              │
                             │                               │
                             │  ┌─────────────┐              │
                             │  │    ECR      │              │
                             │  │ (Docker     │              │
                             │  │  images)    │              │
                             │  └─────────────┘              │
                             │                               │
                             │  ┌─────────────┐              │
                             │  │ CloudWatch  │              │
                             │  │ (logs)      │              │
                             │  └─────────────┘              │
                             │                               │
                             │  ┌─────────────┐              │
                             │  │  S3 Bucket  │              │
                             │  │ (Terraform  │              │
                             │  │  state)     │              │
                             │  └─────────────┘              │
                             └──────────────────────────────┘
```

### AWS Resources (Terraform)

| Resource | Purpose |
|----------|---------|
| ECR Repository | Store Docker images |
| ECS Cluster | Fargate compute cluster |
| ECS Task Definition | Container config (CPU, memory, image, env vars) |
| ECS Service | Run and maintain tasks behind ALB |
| ALB + Target Group | Public-facing load balancer on port 80 |
| VPC + Subnets | Network (use default VPC for simplicity) |
| Security Groups | Allow port 80 inbound, all outbound |
| IAM Roles | Task execution role (pull ECR, write logs) |
| CloudWatch Log Group | Container stdout/stderr logs |
| S3 Bucket | Terraform remote state |

### GitHub Secrets Required

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | IAM user for ECR push + ECS deploy |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `AWS_REGION` | e.g., `us-east-1` |

## Out of Scope (v4+)

- User authentication and accounts
- Notebook persistence / history (requires database)
- Custom domain + HTTPS (ACM certificate + Route53)
- Auto-scaling policies for ECS (fixed at 1 task for now)
- Production CSP with nonces (Next.js middleware)
- Monitoring / alerting (CloudWatch alarms, PagerDuty)
- Cost optimization (Fargate Spot, reserved capacity)
- Multi-environment setup (staging vs production)

## Dependencies

- Sprint v2 complete (all 10 tasks, 108 tests passing)
- GitHub repo: `samehra/modern-software-developer-bootcamp` (created, needs push)
- AWS IAM user `paper-to-notebook-deploy` with required policies (user has confirmed this exists)
- AWS credentials in `/Users/saurmehr/modern-software-developer-bootcamp/.env` (local, gitignored)
- Real PDF for quality test: `/Users/saurmehr/Downloads/GLIDE_Spotify.pdf`
