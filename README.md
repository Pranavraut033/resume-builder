# Resume Builder

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2-orange.svg)

A local-first, AI-powered desktop app that turns a job description and your base profile into a tailored, ATS-friendly resume and cover letter — for job seekers who want full control of their data and a choice of AI provider, instead of a subscription-locked cloud service.

## Demo

> _Add a screenshot or screen recording of the job dashboard, resume generation flow, and inline editor here (e.g. `docs/media/demo.gif`)._

## Features

- **Base profile**: maintain a single reusable professional profile (experience, skills, projects, education) stored locally in SQLite
- **Job tracking**: manage multiple applications with status (Draft, Applied, Interview, Offer, Rejected)
- **AI job parsing**: paste a job description and extract structured requirements client-side via your chosen LLM
- **AI resume & cover letter tailoring**: generate content tailored to each job from your base profile
- **Inline WYSIWYG editor**: edit the generated resume directly on the rendered document (`/job/[jobId]/inline`)
- **Multiple templates**: several resume templates with per-job color/font/layout customization
- **PDF & TXT export**: generate application-ready documents
- **Multiple LLM providers**: OpenAI, Google Gemini, Anthropic (Claude), xAI Grok, Perplexity, or local Ollama — switch per job
- **Secure key storage**: API keys live in Tauri's encrypted store (desktop) or `localStorage` (web), never on the server
- **Local-first**: all data in a local SQLite database; no mandatory cloud dependency

## Download & Install

Prebuilt desktop apps for macOS, Windows, and Linux are published on the [Releases](https://github.com/Pranavraut033/resume-builder/releases) page for every `v*.*.*` tag.

| Platform | File | Notes |
| --- | --- | --- |
| macOS | `Resume.Builder_<version>_universal.dmg` | Universal binary (Apple Silicon + Intel) |
| Windows | `Resume.Builder_<version>_x64-setup.exe` | NSIS installer |
| Linux | `Resume.Builder_<version>_amd64.AppImage` or `.deb` | AppImage is portable; `.deb` for Debian/Ubuntu |

The app is **self-signed** (not signed by a CA-trusted/registered publisher), so each OS will show a one-time warning before the first launch. This is expected — follow the steps below to open it.

### macOS

1. Open the downloaded `.dmg` and drag **Resume Builder** into **Applications**
2. On first launch, Gatekeeper will say *"Resume Builder cannot be verified"* — **right-click the app → Open → Open** in the dialog
3. If you instead see *"The application is damaged and can't be opened"*, clear the quarantine flag:
   ```bash
   xattr -d com.apple.quarantine /Applications/Resume\ Builder.app
   ```

### Windows

1. Run the `*-setup.exe` installer
2. Windows SmartScreen will show *"Windows protected your PC"* — click **More info**, then **Run anyway**
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
- **LLM providers**: OpenAI, Google Gemini, Anthropic, Grok, Perplexity, Ollama (all client-side)
- **PDF export**: `@react-pdf/renderer` / `pdf-lib`
- **Drag & drop**: `@dnd-kit`
- **Testing**: Vitest + Testing Library

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
- Clean separation: the server only ever talks to SQLite

## Getting Started

### Prerequisites

- Node.js 18+
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

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `file:dev.db` | SQLite connection string used by Prisma |
| `PORT` | `3008` | Port for the Next.js dev/start server |

AI provider API keys are **not** set via environment variables — add them in-app under `/settings`, where they're stored in Tauri's encrypted store (desktop) or `localStorage` (web). Ollama requires no key, just a local Ollama install.

### Desktop build (Tauri)

```bash
npm run tauri dev    # desktop app in development
npm run tauri build  # produces .dmg / .exe / .AppImage
```

## Usage Walkthrough

1. Run `npm run dev` and open [http://localhost:3008](http://localhost:3008)
2. Go to **Settings** (`/settings`) and add an API key for at least one provider (or select Ollama for a local model)
3. Go to **Profile** (`/profile`) and fill in your base profile
4. Create a job (`/job/new`): paste a job description, pick a provider/model — the app parses the JD and generates a tailored resume and cover letter
5. Open the job and edit the result with the drag-and-drop editor or the Inline Editor (`/job/[jobId]/inline`) WYSIWYG view
6. Export as PDF or TXT from the job page

## Project Structure

```
resume-builder/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── job/new/              # Create job + AI generation
│   │   ├── job/[jobId]/          # Job detail (original editor)
│   │   ├── job/[jobId]/inline/   # Inline Editor V2 (WYSIWYG)
│   │   ├── profile/              # Base profile editor
│   │   ├── find-jobs/            # Job search/browse
│   │   ├── analytics/tokens/     # LLM token usage analytics
│   │   └── settings/             # API key management
│   ├── actions/                  # Server Actions (Prisma CRUD only)
│   ├── components/
│   │   ├── job/templates/        # Resume/cover letter templates
│   │   └── job-v2/                # Inline Editor V2 components
│   ├── lib/
│   │   ├── llm/                  # Client-side LLM providers + services
│   │   ├── pdf/                   # PDF generation templates
│   │   ├── prisma.ts             # Prisma client singleton
│   │   └── keyStorage.ts         # Tauri/localStorage API key storage
│   └── types/                    # Shared TypeScript types
├── prisma/schema.prisma          # Database schema
├── src-tauri/                    # Tauri desktop app
└── docs/
    ├── plans/                     # PRDs, requirements, implementation plans
    ├── QUICK_REFERENCE.md
    ├── UI_COMPONENTS_GUIDE.md
    └── DISTRIBUTION.md
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server (port 3008) |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` / `lint:fix` | ESLint (with autofix) |
| `npm run format` / `format:check` | Prettier write/check |
| `npm run type-check` | `tsc --noEmit` |
| `npm run test` | Vitest (watch mode) |
| `npm run test:run` | Vitest single run |
| `npm run test:coverage` | Vitest with coverage |
| `npm run db:generate` | `prisma generate` |
| `npm run db:push` | `prisma db push` |
| `npm run db:studio` | Prisma Studio GUI |
| `npm run tauri dev` / `tauri build` | Tauri desktop app dev/build |

Before committing: `npm run lint:fix && npm run format && npm run type-check`.

## Contributing

1. Read [CLAUDE.md](./CLAUDE.md) for the architecture rules this codebase enforces (server = DB only, LLM = client only)
2. Check [docs/plans/requirements.md](./docs/plans/requirements.md) for feature scope
3. Run `npm run lint:fix && npm run format && npm run type-check` and `npm run test:run` before opening a PR

## License

MIT — see [LICENSE](./LICENSE).

This project adapts resume templates and a template/customization system from [Resumify](https://github.com/Afif718/Resumify) by M. H. A. Afif (MIT). See [LICENSE-THIRD-PARTY.md](./LICENSE-THIRD-PARTY.md) for attribution.
