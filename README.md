# Resume Builder

A local-first, AI-powered desktop application for creating tailored resumes and cover letters for job applications. Built with Next.js 16, Tauri, Prisma ORM, and client-side LLM operations.

## Architecture

This application uses a modern **client-first architecture**:

- **Server Actions** for all database operations (Prisma + SQLite)
- **Client-Side LLM** operations (OpenAI, Gemini, Grok, Ollama)
- **No REST APIs** - direct server action calls from client
- **Local-First** - all data stored locally, optional cloud backup

## Features

- ✅ **Base Profile**: Create and maintain a comprehensive professional profile (stored in SQLite)
- ✅ **Job Management**: Track multiple job applications with status updates (Draft, Applied, Interview, Offer, Rejected)
- ✅ **AI-Powered Parsing**: Parse job descriptions with structured extraction (client-side LLM)
- ✅ **AI-Powered Tailoring**: Automatically adapt resume and cover letter to job descriptions (client-side LLM)
- ✅ **Manual Editing**: Fine-tune AI-generated content with drag-and-drop resume editor
- ✅ **Export Options**: Generate PDF or TXT files for applications
- ✅ **Local-First**: All data stored locally in SQLite, no mandatory cloud dependency
- ✅ **Multiple LLM Providers**: Choose between OpenAI, Gemini, Grok, or local Ollama
- ✅ **Secure Key Storage**: API keys stored securely in Tauri's encrypted storage (client-side only)
- ✅ **Type-Safe**: Full TypeScript with Prisma generated types
- ✅ **Modern Architecture**: Server Actions for database, client-side LLM operations

## Tech Stack

- **Framework**: Next.js 16 (App Router) with Server Actions
- **Desktop**: Tauri (secure API key storage)
- **Database**: SQLite with Prisma ORM 5.22.0
- **Styling**: Tailwind CSS
- **LLM Providers**: OpenAI, Google Gemini, Grok, Ollama (client-side)
- **PDF Export**: pdf-lib
- **State Management**: React built-in (no React Query needed)

## Getting Started

### Prerequisites

- Node.js 18+
- Rust (for Tauri desktop build)

### Installation

```bash
# Install dependencies
npm install

# Set up database (Prisma)
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema to SQLite

# Development
npm run dev          # Next.js web app (http://localhost:3000)
npm run tauri dev    # Tauri desktop app

# Build for production
npm run build        # Build Next.js
npm run tauri build  # Build desktop app (.dmg, .exe, etc.)

# Database management
npx prisma studio    # Open database GUI at http://localhost:5555
npx prisma db push   # Apply schema changes
```

### Quick Start

1. **Run development server**:

   ```bash
   npm run dev
   ```

2. **Visit http://localhost:3000**

3. **Go to Settings** (`/settings`) and add your API keys:
   - OpenAI, Gemini, Grok (requires keys)
   - Ollama (local, no key needed)

4. **Create your base profile** (`/profile`)

5. **Create a new job** (`/job/new`):
   - Paste job description
   - Select LLM model and provider
   - AI generates tailored resume and cover letter

6. **Edit and export** resume/cover letter as PDF or TXT

## How It Works

### Data Flow

```
┌─────────────────────────────────────────┐
│  Client (Browser/Tauri)                 │
│  ├─ UI Components                       │
│  ├─ Client-Side LLM (clientLLM.ts)      │
│  │   ├─ parseJobDescription()           │
│  │   ├─ generateResume()                │
│  │   └─ generateCoverLetter()           │
│  └─ API Keys (Tauri Storage)            │
└────────────┬────────────────────────────┘
             │ Server Actions (Database only)
             ▼
┌─────────────────────────────────────────┐
│  Server (Next.js)                       │
│  ├─ Server Actions (actions/)           │
│  │   ├─ Profile CRUD                    │
│  │   ├─ Job CRUD                        │
│  │   └─ Resume/Cover Letter CRUD        │
│  └─ Database (Prisma + SQLite)          │
└─────────────────────────────────────────┘
```

### Job Creation Workflow

1. **User pastes job description** in `/job/new` page
2. **Client-side LLM parses** job description → extracts structured data (company, role, requirements, etc.)
3. **Server action retrieves** base profile from database
4. **Client-side LLM generates** tailored resume based on job requirements
5. **Client-side LLM generates** personalized cover letter
6. **Server action saves** job + resume + cover letter to database
7. **User can edit** generated content with drag-and-drop editor
8. **Export** as PDF or TXT for application

### Why Client-Side LLM?

- **Security**: API keys stay in Tauri encrypted storage, never sent to server
- **Compatibility**: Works correctly in Tauri desktop environment
- **Separation of Concerns**: Server = Database only, Client = LLM + UI
- **Performance**: Reduces server load, operations run where keys are accessible

## Project Structure

```
resume-builder/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── page.tsx      # Job dashboard (server component)
│   │   ├── profile/      # Base profile editor
│   │   ├── job/          # Job management
│   │   │   ├── new/      # Create job with AI generation
│   │   │   └── [id]/     # Job details and editing
│   │   ├── resume/       # Resume editor (drag & drop)
│   │   ├── cover-letter/ # Cover letter editor
│   │   └── settings/     # API key management
│   ├── actions/          # Server Actions (database only)
│   │   ├── profile.ts    # Profile CRUD
│   │   └── job.ts        # Job, Resume, Cover Letter CRUD
│   ├── components/       # React components
│   │   ├── ui/           # Reusable UI components
│   │   ├── ResumeEditor.tsx
│   │   └── CoverLetterEditor.tsx
│   ├── lib/              # Utilities and libraries
│   │   ├── clientLLM.ts  # Client-side LLM operations
│   │   ├── prisma.ts     # Prisma client singleton
│   │   ├── keyStorage.ts # Tauri API key storage
│   │   ├── pdfExport.ts  # PDF generation
│   │   └── llm/          # LLM provider implementations
│   └── types/            # TypeScript type definitions
│       ├── resume.ts     # ResumeJSON, JobDetails types
│       └── llm.ts        # LLMProvider interface
├── prisma/
│   └── schema.prisma     # Database schema
├── src-tauri/            # Tauri desktop app
│   ├── src/
│   │   ├── main.rs       # Tauri entry point
│   │   └── lib.rs        # Tauri library
│   └── tauri.conf.json   # Tauri configuration
└── docs/                 # Documentation
    ├── CLIENT_SIDE_LLM.md
    ├── SERVER_ACTIONS.md
    └── MIGRATION_GUIDE.md
```

## Documentation

- [Architecture Overview](./ARCHITECTURE.md) - Complete architecture details
- [Client-Side LLM Operations](./docs/CLIENT_SIDE_LLM.md) - How LLM operations work
- [Server Actions](./docs/SERVER_ACTIONS.md) - Database operations guide
- [Migration Guide](./docs/MIGRATION_GUIDE.md) - REST API → Server Actions migration
- [Status](./STATUS.md) - Feature checklist and progress
- [Requirements](./requirements.md) - Complete feature requirements
- [Style Guide](./STYLE_GUIDE.md) - UI/UX guidelines

## Development

### Available Scripts

- `npm run dev` - Start Next.js development server (http://localhost:3000)
- `npm run build` - Build Next.js for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - TypeScript type checking
- `npm run tauri dev` - Start Tauri desktop app in development
- `npm run tauri build` - Build Tauri app for production
- `npx prisma generate` - Generate Prisma client after schema changes
- `npx prisma db push` - Push schema changes to SQLite database
- `npx prisma studio` - Open Prisma Studio database GUI

### Code Quality

Before committing:

```bash
npm run lint:fix    # Fix linting issues
npm run format      # Format code
npm run type-check  # Verify types
```

### Database Changes

When modifying `prisma/schema.prisma`:

```bash
npx prisma generate  # Regenerate Prisma client
npx prisma db push   # Apply changes to database
```

## Architecture Principles

1. **No REST APIs**: All data operations use Next.js Server Actions
2. **Client-Side LLM**: All LLM operations happen client-side where API keys are accessible
3. **Server = Database**: Server actions only handle Prisma database operations
4. **Local-First**: SQLite database, all data stays on device
5. **Type-Safe**: End-to-end TypeScript with Prisma generated types
6. **Modern Next.js**: Follows Next.js 14+ App Router best practices

## Troubleshooting

### Common Issues

**"Cannot find module '@prisma/client'"**

```bash
npx prisma generate
```

**"API key not found"**

- Go to `/settings` and add API keys
- Keys stored in Tauri encrypted storage (desktop) or localStorage (web)

**Type errors after schema changes**

```bash
npx prisma generate
npm run type-check
```

**Database schema out of sync**

```bash
npx prisma db push
```

See [MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md) for more troubleshooting.

## Contributing

This is an open-source project. Contributions welcome!

### Guidelines

- Follow the architecture patterns in [ARCHITECTURE.md](./ARCHITECTURE.md)
- Server actions handle **database only** (no LLM calls)
- LLM operations go in `src/lib/clientLLM.ts` (client-side)
- Update [STATUS.md](./STATUS.md) when completing features
- Run `npm run type-check` before committing
- Follow [STYLE_GUIDE.md](./STYLE_GUIDE.md) for UI components

## License

MIT

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Desktop app powered by [Tauri](https://tauri.app/)
- Database by [Prisma](https://www.prisma.io/)
- LLM providers: OpenAI, Google Gemini, Grok, Ollama
- Resume templates adapted from [Resumify](https://github.com/Afif718/Resumify) by M. H. A. Afif (MIT License)

## Attribution

This project incorporates code and concepts from [Resumify](https://github.com/Afif718/Resumify), an excellent open-source resume builder by M. H. A. Afif. We have adapted their professional resume templates, template system, and color customization features to work with our local-first architecture while maintaining their beautiful designs. We are grateful for their contribution to the open-source community.

See [LICENSE-THIRD-PARTY.md](./LICENSE-THIRD-PARTY.md) for complete attribution and license information.
