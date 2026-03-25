# Sprint v1 — PRD: PaperToCode

## Overview

PaperToCode is a web application that transforms research paper PDFs into comprehensive, research-grade Google Colab notebooks. Users upload a PDF, provide their Gemini API key, and receive a detailed `.ipynb` file that implements the paper's algorithms with synthetic data, mathematical formulations, and step-by-step explanations — designed for researchers at top labs (OpenAI, DeepMind) to accelerate paper replication workflows.

## Goals

- User can enter their Gemini API key and upload a research paper PDF
- Backend sends the PDF to Gemini 2.5 Pro (multimodal) for deep analysis and notebook generation
- Generated notebook is research-grade: math formulations, algorithm implementations, synthetic data, visualizations, ablation studies
- Real-time progress updates keep users engaged during the ~30-60 second generation process
- User can download the `.ipynb` file and open it directly in Google Colab

## User Stories

- As a ML researcher, I want to upload a paper PDF and get a working notebook, so I can quickly replicate and experiment with the paper's methods
- As a research engineer, I want the notebook to include realistic synthetic data and proper mathematical notation, so I can understand and extend the implementation
- As a user, I want to see progress updates while the notebook generates, so I know the system is working and I stay engaged
- As a user, I want to provide my own Gemini API key, so I can use the tool without creating an account

## Technical Architecture

### Tech Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS v4
- **UI Theme**: ARC Prize-inspired dark theme — black background (#000000), monospace typography (DM Mono / Space Grotesk), cyan/teal accents (#00D4AA), minimal grid-based layout
- **Backend**: Next.js API routes (Route Handlers)
- **PDF Processing**: Gemini 2.5 Pro multimodal API (native PDF understanding — no server-side parsing needed)
- **Model**: `gemini-2.5-pro` via Google Generative AI SDK (`@google/generative-ai`)
- **Streaming**: Server-Sent Events (SSE) for real-time progress updates
- **Output**: Programmatically constructed `.ipynb` JSON (nbformat v4)

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐│
│  │ API Key  │→ │  PDF     │→ │  Progress Display +    ││
│  │ Input    │  │  Upload  │  │  Download / Colab Link  ││
│  └──────────┘  └──────────┘  └────────────────────────┘│
│                       │                    ▲             │
│                       │ POST /api/generate │ SSE stream  │
│                       ▼                    │             │
│  ┌─────────────────────────────────────────────────────┐│
│  │              API Route: /api/generate               ││
│  │                                                     ││
│  │  1. Receive PDF + API key                           ││
│  │  2. Send PDF to Gemini 2.5 Pro (multimodal)         ││
│  │  3. Parse structured response                       ││
│  │  4. Build .ipynb JSON (nbformat v4)                 ││
│  │  5. Stream progress updates via SSE                 ││
│  │  6. Return completed notebook                       ││
│  └─────────────────────────────────────────────────────┘│
│                       │                                  │
│                       ▼                                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │           Google Gemini 2.5 Pro API                 ││
│  │         (Multimodal — native PDF input)             ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. User opens app → enters Gemini API key (stored in browser state only, never persisted)
2. User uploads PDF → file sent to `/api/generate` along with API key
3. API route initializes Gemini client with user's key
4. PDF binary sent to Gemini 2.5 Pro as multimodal input with a detailed system prompt
5. Gemini analyzes paper: extracts algorithms, math, methodology
6. Response parsed and structured into notebook sections
7. `.ipynb` JSON constructed programmatically (nbformat v4 spec)
8. Progress milestones streamed to frontend via SSE
9. Completed notebook returned; frontend enables download + Colab link

### Notebook Structure (Generated Output)

The generated `.ipynb` will contain these sections:

1. **Title & Paper Metadata** — Paper title, authors, abstract summary, link
2. **Key Contributions** — Bullet-point summary of what the paper introduces
3. **Environment Setup** — `!pip install` cells for required packages
4. **Mathematical Formulation** — LaTeX-rendered equations from the paper with explanations
5. **Algorithm Pseudocode** — Markdown cells with the paper's algorithms in pseudocode
6. **Implementation** — Working Python code implementing each algorithm
7. **Synthetic Data Generation** — Realistic synthetic datasets that mirror the paper's domain (proper distributions, dimensionality, noise characteristics)
8. **Execution & Results** — Run the implementation on synthetic data with outputs
9. **Visualizations** — matplotlib/seaborn plots showing results, comparisons
10. **Ablation Studies** — Parameter sensitivity analysis, hyperparameter sweeps
11. **Reproducibility Notes** — Random seeds, hardware requirements, known limitations
12. **References** — Full citation + links to related work

### Design Language (ARC Prize-inspired)

- **Background**: Pure black (#000000) with subtle grid pattern
- **Text**: White (#FFFFFF) primary, gray (#888888) secondary
- **Accent**: Teal/cyan (#00D4AA) for interactive elements, links, highlights
- **Typography**: `Space Grotesk` for headings, `DM Mono` for body/technical text
- **Layout**: Centered single-column, generous whitespace, minimal borders
- **Components**: Subtle card outlines (#1a1a1a borders), no heavy shadows
- **Buttons**: Outlined or solid teal, rounded corners
- **Animations**: Minimal, purposeful — loading states, progress transitions

## Out of Scope (v2+)

- User authentication and accounts
- Usage tracking and rate limiting
- Storing generated notebooks (server-side persistence)
- Multiple model selection (letting user choose different Gemini models)
- Batch processing (multiple PDFs)
- Collaborative features
- Custom notebook templates
- Real dataset integration (beyond synthetic data)
- Payment / subscription system
- Deployment infrastructure (Docker, CI/CD)

## Dependencies

- None (greenfield project)
- User provides their own Gemini API key
- Requires Gemini 2.5 Pro API access (generally available)
