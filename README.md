# Udaan

![CI](https://github.com/Pranavraut033/resume-builder/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2-orange.svg)

**Udaan** (उड़ान — "flight, takeoff") is a local-first, AI-powered desktop app that turns a job description and your base profile into a tailored, ATS-friendly resume and cover letter. Every application deserves its own shot at flight, not a copy-pasted resume sent into the void — for job seekers who want full control of their data and a choice of AI provider, instead of a subscription-locked cloud service.

## Demo

> _Add a screenshot or screen recording of the job dashboard, resume generation flow, and inline editor here (e.g. `docs/media/demo.gif`)._

## Features

- **Base profile**: maintain a single reusable professional profile (experience, skills, projects, education) stored locally in SQLite
- **Job tracking**: manage multiple applications with status (Draft, Applied, Interview, Offer, Rejected)
- **AI job parsing**: paste a job description and extract structured requirements client-side via your chosen LLM
- **AI resume & cover letter tailoring**: generate content tailored to each job from your base profile
- **Inline WYSIWYG editor**: edit the generated resume directly on the rendered document, with zoom controls and version history (`/job/[jobId]`)
- **Multiple templates**: several resume templates with per-job color/font/layout customization, rendered by a shared template engine so DOM/PDF/TXT output stay in sync
- **AI humanizer**: rewrite resume/cover letter content to read less like AI output, with reviewable before/after changes
- **Documents view**: browse all generated resumes and cover letters across jobs (`/documents`)
- **PDF & TXT export**: generate application-ready documents
- **Multiple LLM providers**: OpenAI, Google Gemini, Anthropic (Claude), xAI Grok, Perplexity, local Ollama, or a managed pay-as-you-go gateway (no key required) — switch per job
- **Secure key storage**: API keys are AES-256-GCM encrypted on disk (desktop), keyed off a per-install master key held in the OS keychain, or `localStorage` (web) — never on the server
- **Backup & restore**: export the entire local database to a JSON file and restore it later, from **Settings**
- **Local-first**: all data in a local SQLite database; no mandatory cloud dependency

## Download & Install

Prebuilt desktop apps for macOS, Windows, and Linux are published on the [Releases](https://github.com/Pranavraut033/resume-builder/releases) page for every `v*.*.*` tag.

| Platform | File                                                | Notes                                          |
| -------- | --------------------------------------------------- | ---------------------------------------------- |
| macOS    | `Resume.Builder_<version>_universal.dmg`            | Universal binary (Apple Silicon + Intel)       |
| Windows  | `Resume.Builder_<version>_x64-setup.exe`            | NSIS installer                                 |
| Linux    | `Resume.Builder_<version>_amd64.AppImage` or `.deb` | AppImage is portable; `.deb` for Debian/Ubuntu |

The app is **self-signed** (not signed by a CA-trusted/registered publisher), so each OS will show a one-time warning before the first launch. This is expected — follow the steps below to open it.

### macOS

1. Open the downloaded `.dmg` and drag **Udaan** into **Applications**
2. On first launch, Gatekeeper will say _"Udaan cannot be verified"_ — **right-click the app → Open → Open** in the dialog
3. If you instead see _"The application is damaged and can't be opened"_, clear the quarantine flag:
   ```bash
   xattr -d com.apple.quarantine /Applications/Resume\ Builder.app
   ```

### Windows

1. Run the `*-setup.exe` installer
2. Windows SmartScreen will show _"Windows protected your PC"_ — click **More info**, then **Run anyway**
3. Follow the installer prompts

### Linux

- **AppImage** (portable, no install):
  ```bash
  chmod +x Resume.Builder_*_amd64.AppImage
  ./Resume.Builder_*_amd64.AppImage
  ```
- **.deb** (Debian/Ubuntu):
  ```bash
  sudo dpkg -i Resume.Builder_*_amd64.deb
  ```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Actions)
- **Desktop**: Tauri 2
- **Database**: SQLite via Prisma ORM 7
- **Styling**: Tailwind CSS v4
- **State**: Zustand (LLM provider/model selection)
- **LLM providers**: OpenAI, Google Gemini, Anthropic, Grok, Perplexity, Ollama, or the managed gateway (all client-side); provider base classes/prompt infra live in the `@pranavraut033/llm-core` package (`packages/llm-core/`)
- **PDF export**: `@react-pdf/renderer` / `pdf-lib`
- **Drag & drop**: `@dnd-kit`
- **Testing**: Vitest + Testing Library, Playwright for e2e

## Architecture

**Hard rule: Server = database only, LLM calls = client only.**

```
┌─────────────────────────────────────────┐
│  Client (Browser / Tauri)               │
│  ├─ UI Components                       │
│  ├─ Client-side LLM (src/lib/llm)       │
│  │   ├─ parseJobDescription()           │
│  │   ├─ generateResume()                │
│  │   └─ generateCoverLetter()           │
│  └─ API keys (Tauri encrypted store)    │
└────────────┬────────────────────────────┘
             │ Server Actions (DB only)
             ▼
┌─────────────────────────────────────────┐
│  Server (Next.js)                       │
│  ├─ Server Actions (src/actions/)       │
│  │   ├─ Profile CRUD                    │
│  │   └─ Job / Resume / CoverLetter CRUD │
│  └─ Prisma + SQLite                     │
└─────────────────────────────────────────┘
```

**Why client-side LLM?**

- API keys never leave the client (Tauri encrypted storage / `localStorage`), so they're never exposed to a server you don't control
- No backend to host, rate-limit, or pay for — every user supplies their own provider key (or runs Ollama locally for free)
- Clean separation: the Next.js server only ever talks to SQLite

The optional **managed provider** is an alternative to BYOK for users without their own key: `server/llm-gateway/` is a separate, self-hosted LiteLLM proxy (+ a Stripe webhook handler for prepaid credits) that the client talks to exactly like any other OpenAI-compatible endpoint — it doesn't change the Next.js server's DB-only role. See [server/llm-gateway/README.md](./server/llm-gateway/README.md) for self-hosting it.

## Getting Started

### Prerequisites

- Node.js 22 (pinned in `.nvmrc`; run `nvm use`)
- Rust + the Tauri CLI prerequisites ([tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/)) — only needed for the desktop build

### Installation

```bash
# Install dependencies
npm install

# Generate the Prisma client and create the SQLite database
npm run db:generate
npm run db:push

# Start the web app (http://localhost:3008)
npm run dev
```

### Configuration

The app reads a `.env` file for local database/server settings:

| Variable       | Default       | Description                             |
| -------------- | ------------- | --------------------------------------- |
| `DATABASE_URL` | `file:dev.db` | SQLite connection string used by Prisma |
| `PORT`         | `3008`        | Port for the Next.js dev/start server   |

AI provider API keys are **not** set via environment variables — add them in-app under `/settings`, where they're stored in Tauri's encrypted store (desktop) or `localStorage` (web). Ollama requires no key, just a local Ollama install. The managed provider talks to a LiteLLM gateway at `NEXT_PUBLIC_LLM_GATEWAY_URL` (defaults to `http://localhost:4000/v1`) — only relevant if you're self-hosting `server/llm-gateway/`.

### Desktop build (Tauri)

```bash
npm run tauri dev    # desktop app in development
npm run tauri build  # produces .dmg / .exe / .AppImage
```

## Usage Walkthrough

1. Run `npm run dev` and open [http://localhost:3008](http://localhost:3008)
2. Go to **Settings** (`/settings`) and add an API key for at least one provider (or select Ollama for a local model, or the managed provider for pay-as-you-go access)
3. Go to **Profile** (`/profile`) and fill in your base profile
4. Create a job (`/job/new`): paste a job description, pick a provider/model — the app parses the JD and generates a tailored resume and cover letter
5. Open the job (`/job/[jobId]`) and edit the result in the inline WYSIWYG editor — pick a template, tweak colors/fonts, or use the AI humanizer
6. Export as PDF or TXT from the job page; browse past versions across jobs on the **Documents** page (`/documents`)

## Project Structure

```
udaan/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── job/new/              # Create job + AI generation
│   │   ├── job/[jobId]/          # Job detail (Inline WYSIWYG editor)
│   │   ├── documents/             # All generated resumes/cover letters + version history
│   │   ├── profile/              # Base profile editor
│   │   ├── find-jobs/            # Job search/browse
│   │   ├── analytics/tokens/     # LLM token usage analytics
│   │   └── settings/             # API key management
│   ├── actions/                  # Server Actions (Prisma CRUD only)
│   ├── components/
│   │   ├── job/templates/        # TemplateRenderer (dispatches to engine, falls back to modern-minimal)
│   │   └── job-v2/
│   │       └── engine/            # Shared template engine (DOM rendering, section registry, template configs)
│   ├── lib/
│   │   ├── llm/                  # Client-side LLM providers + services (base classes from @pranavraut033/llm-core)
│   │   ├── pdf/                   # PDF generation engine (mirrors the DOM engine)
│   │   ├── prisma.ts             # Prisma client singleton
│   │   └── keyStorage.ts         # Tauri/localStorage API key storage
│   └── types/                    # Shared TypeScript types
├── packages/llm-core/             # LLM provider base classes, prompt resolver, registry (local package)
├── server/llm-gateway/            # Optional self-hosted LiteLLM proxy for the managed provider
├── landing/                       # Astro marketing landing page (separate app)
├── prisma/schema.prisma          # Database schema
├── src-tauri/                    # Tauri desktop app
├── e2e/                           # Playwright e2e specs
└── docs/
    ├── plans/                     # PRDs, requirements, implementation plans
    ├── QUICK_REFERENCE.md
    ├── UI_COMPONENTS_GUIDE.md
    └── DISTRIBUTION.md
```

## Available Scripts

| Command                             | Description                              |
| ----------------------------------- | ---------------------------------------- |
| `npm run dev`                       | Start the Next.js dev server (port 3008) |
| `npm run build`                     | Production build                         |
| `npm run start`                     | Start the production server              |
| `npm run lint` / `lint:fix`         | ESLint (with autofix)                    |
| `npm run format` / `format:check`   | Prettier write/check                     |
| `npm run type-check`                | `tsc --noEmit`                           |
| `npm run test`                      | Vitest (watch mode)                      |
| `npm run test:run`                  | Vitest single run                        |
| `npm run test:coverage`             | Vitest with coverage                     |
| `npm run test:e2e` / `test:e2e:ui`  | Playwright e2e suite (with UI mode)      |
| `npm run db:generate`               | `prisma generate`                        |
| `npm run db:push`                   | `prisma db push`                         |
| `npm run db:studio`                 | Prisma Studio GUI                        |
| `npm run tauri dev` / `tauri build` | Tauri desktop app dev/build              |

Before committing: `npm run lint:fix && npm run format && npm run type-check`.

## Contributing

1. Read [CLAUDE.md](./CLAUDE.md) for the architecture rules this codebase enforces (server = DB only, LLM = client only)
2. Check [docs/plans/requirements.md](./docs/plans/requirements.md) for feature scope
3. Run `npm run lint:fix && npm run format && npm run type-check` and `npm run test:run` before opening a PR (add `npm run test:e2e` for changes touching the job flow or navigation)

## License

MIT — see [LICENSE](./LICENSE).

This project adapts resume templates and a template/customization system from [Resumify](https://github.com/Afif718/Resumify) by M. H. A. Afif (MIT). See [LICENSE-THIRD-PARTY.md](./LICENSE-THIRD-PARTY.md) for attribution.
