# Resume & Cover Letter Generator – Requirements

## 1. Overview

**Project Name (working):** Local AI Resume Builder
**Goal:** A local-first, open-source desktop application that automatically generates tailored resumes and cover letters from a base profile and a job description, similar in spirit to Enhancv, but privacy-first and offline-capable.

The application uses a client-first Next.js architecture with **Server Actions for database operations** and **client-side LLM operations**. No traditional REST API or backend services exist. All database access happens through Next.js Server Actions calling Prisma directly. All LLM operations (job parsing, resume generation, cover letter generation) happen client-side where API keys are accessible via Tauri storage.

The application must run without mandatory cloud dependencies, support multiple LLM providers (cloud + local), and allow full manual editing via a drag-and-drop resume editor.

---

## 2. Core Principles

- Local-first (works offline)
- Privacy-focused (no forced cloud storage)
- Open-source
- Provider-agnostic AI layer
- Deterministic, ATS-friendly output
- Desktop-first UX

---

## 3. Tech Stack (Proposed)

### Frontend

- **Framework:** Next.js (App Router or Pages Router allowed)
- **Language:** TypeScript (strict mode)
- **UI:** React + Tailwind CSS
- **Drag & Drop:** dnd-kit

### Desktop Wrapper

- **Tauri** (preferred) or Electron

### Backend (Local)

- **Runtime:** Next.js Server Actions
- **Database:** SQLite
- **ORM:** Prisma

### AI / LLM

- OpenAI API
- Google Gemini API
- Grok API
- Ollama (local models)

### File & Export

- PDF generation: react-pdf or pdf-lib
- Text export: plain text / markdown

---

## 4. Pages & Navigation

### 4.1 Home Page (`/`)

**Purpose:** Job dashboard

**Features:**

- Table listing all jobs
- Columns:
  - Company
  - Role
  - Status (Draft / Applied / Interview / Offer / Rejected)
  - Last updated

- Actions:
  - Open resume
  - Open cover letter
  - Regenerate
  - Download

---

### 4.2 Job Description Modal / Page (`/job/new`, `/job/[id]`)

**Purpose:** Create and manage a job entry

**Features:**

- Single large input box for job description
- Auto-parsing of:
  - Company name
  - Role
  - Keywords

- Generate:
  - Job entry
  - Tailored resume (from base profile)
  - Tailored cover letter

- Fields:
  - Status
  - Recruiter feedback / notes

---

### 4.3 Resume Builder / Editor (`/resume/[jobId]`)

**Purpose:** Visual resume editing

**Features:**

- Drag-and-drop resume sections
- Editable text blocks
- Toggle sections on/off
- Resume stored as structured JSON
- Live preview

**Resume Block Types:**

- Header
- Summary
- Experience
- Projects
- Skills
- Education
- Certifications

---

### 4.4 Cover Letter Editor (`/cover-letter/[jobId]`)

**Purpose:** AI-powered cover letter creation and editing with professional templates

**Features:**

- **Unified Editor Experience:**
  - Identical layout structure to Resume Editor for consistency
  - Left panel: Editable textarea for cover letter content
  - Right panel: Live preview with template rendering
  - Edit/Preview toggle for mobile responsiveness
- **AI Generation:**
  - Generate cover letter from job description and resume
  - Uses selected LLM model from settings
  - Customizable generation with job context awareness
  - Regenerate with preserved customization
- **Professional Templates:**
  - Modern Minimal: Clean design with header and border
  - Professional: Colored header bar matching resume styles
  - All templates use shared theming system
  - Auto-formatted date and signature
- **Customization Panel:**
  - Template selection (matches resume templates)
  - Theme picker (8 presets: Blue, Gray, Green, Purple, Navy, Rose, Teal, Orange)
  - Custom color editor (primary, secondary, accent, text)
  - Font selection (20+ Google Fonts and system fonts)
  - Font size adjustment (small, medium, large)
- **Export Options:**
  - PDF export (coming soon)
  - Plain text (.txt) download
  - Future: Word document export
- **Technical Architecture:**
  - Shared EditorContext for state management
  - Reusable EditorLayout and EditorSidePanel components
  - Server Actions for database operations (save, load, customize)
  - Client-side LLM integration via clientLLM.ts
  - Token usage tracking for all generations
  - Job context integration for context-aware generation

**DRY Implementation:**

- Shares components with Resume Editor: EditorLayout, EditorSidePanel, TemplateSelector, ColorCustomizer, FontSelector
- Uses unified EditorContext supporting both content types
- Consistent export patterns across editors
- Shared template theming system

---

### 4.5 Base Profile Page (`/profile`)

**Purpose:** Store master resume/profile

**Features:**

- One canonical base resume
- Structured input (not free text)
- Skills, experience, education
- Used as source for all generations

---

### 4.6 Admin / Settings Page (`/settings`)

**Purpose:** App configuration

**Sections:**

#### AI Providers

- Add / remove API keys
- Provider selection
- Model selection
- Ollama detection & configuration

#### Storage & Backup

- Local DB location
- Manual export
- Google Drive backup (optional)

#### App Settings

- Default resume template
- Language
- PDF formatting options

---

### 4.7 Token Analytics Page (`/analytics/tokens`)

**Purpose:** Monitor and analyze LLM token usage

**Features:**

- Summary metrics:
  - Total tokens consumed (input + output)
  - Total API requests made
  - Estimated costs based on provider pricing
- Visualizations:
  - Time-series chart showing daily token usage trends
  - Bar charts for usage breakdown by provider
  - Bar charts for usage breakdown by model
- Data table:
  - Sortable list of all token usage records
  - Columns: Date, Provider, Model, Purpose, Input Tokens, Output Tokens, Total
  - Pagination support (50 records per page)
- Filtering:
  - Date range selector
  - Provider filter
  - Model filter
  - Purpose filter (job parsing, resume generation, cover letter generation, etc.)
- Integration:
  - Automatic tracking of all LLM API calls
  - Client-side tracking with server-side storage
  - No performance impact on generation workflows

---

## 5. AI Generation System

### 5.1 Provider Abstraction

All LLMs must implement a shared interface:

```ts
interface LLMProvider {
  generateResume(input: ResumePromptInput): Promise<ResumeJSON>;
  generateCoverLetter(input: CoverLetterPromptInput): Promise<string>;
}
```

---

### 5.2 Prompt Strategy

- Enforce structured JSON output for resumes
- Separate prompts for:
  - Resume tailoring
  - Cover letter generation

- Include ATS constraints

---

## 6. Data Model (Simplified)

### Profile

- id
- resume_json
- created_at
- updated_at

### Job

- id
- company
- role
- description
- status
- notes
- created_at

### Resume

- id
- job_id
- content_json
- last_edited

### CoverLetter

- id
- job_id
- content_text

---

## 7. Export Requirements

- PDF:
  - ATS-friendly
  - Single-column
  - Deterministic layout

- TXT:
  - Clean formatting
  - No markdown artifacts

---

## 8. Security Requirements

- API keys stored via OS keychain
- No plaintext secrets in DB
- No telemetry by default

---

## 9. Offline Requirements

- App must fully function without internet
- Ollama supported for generation
- Cloud APIs optional

---

## 10. Open Source & Licensing

- License: GPL-3 or AGPL-3
- No proprietary lock-in

---

## 11. Non-Goals (Explicit)

- SaaS hosting
- Multi-user auth
- Cloud-only storage

---

## 12. Milestones

### Milestone 1

- Base profile
- Job creation
- Single LLM integration

### Milestone 2

- Resume editor
- PDF export

### Milestone 3

- Multi-provider support
- Job tracking
- Backup
