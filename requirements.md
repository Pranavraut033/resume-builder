# Resume & Cover Letter Generator – Requirements

## 1. Overview

**Project Name (working):** Local AI Resume Builder
**Goal:** A local-first, open-source desktop application that automatically generates tailored resumes and cover letters from a base profile and a job description, similar in spirit to Enhancv, but privacy-first and offline-capable.

The application must run without mandatory cloud dependencies, support multiple LLM providers (cloud + local), and allow full manual editing via a drag-and-drop resume editor.

---

## 2. Core Principles

* Local-first (works offline)
* Privacy-focused (no forced cloud storage)
* Open-source
* Provider-agnostic AI layer
* Deterministic, ATS-friendly output
* Desktop-first UX

---

## 3. Tech Stack (Proposed)

### Frontend

* **Framework:** Next.js (App Router or Pages Router allowed)
* **Language:** TypeScript (strict mode)
* **UI:** React + Tailwind CSS
* **Drag & Drop:** dnd-kit

### Desktop Wrapper

* **Tauri** (preferred) or Electron

### Backend (Local)

* **Runtime:** Node.js (via Tauri sidecar)
* **Database:** SQLite
* **ORM:** Prisma or Drizzle

### AI / LLM

* OpenAI API
* Google Gemini API
* Groq API
* Ollama (local models)

### File & Export

* PDF generation: react-pdf or pdf-lib
* Text export: plain text / markdown

---

## 4. Pages & Navigation

### 4.1 Home Page (`/`)

**Purpose:** Job dashboard

**Features:**

* Table listing all jobs
* Columns:

  * Company
  * Role
  * Status (Draft / Applied / Interview / Offer / Rejected)
  * Last updated
* Actions:

  * Open resume
  * Open cover letter
  * Regenerate
  * Download

---

### 4.2 Job Description Modal / Page (`/job/new`, `/job/[id]`)

**Purpose:** Create and manage a job entry

**Features:**

* Single large input box for job description
* Auto-parsing of:

  * Company name
  * Role
  * Keywords
* Generate:

  * Job entry
  * Tailored resume (from base profile)
  * Tailored cover letter
* Fields:

  * Status
  * Recruiter feedback / notes

---

### 4.3 Resume Builder / Editor (`/resume/[jobId]`)

**Purpose:** Visual resume editing

**Features:**

* Drag-and-drop resume sections
* Editable text blocks
* Toggle sections on/off
* Resume stored as structured JSON
* Live preview

**Resume Block Types:**

* Header
* Summary
* Experience
* Projects
* Skills
* Education
* Certifications

---

### 4.4 Cover Letter Editor (`/cover-letter/[jobId]`)

**Purpose:** Edit AI-generated cover letter

**Features:**

* Rich text editor
* Regenerate with prompt tweaks
* Export as PDF or TXT

---

### 4.5 Base Profile Page (`/profile`)

**Purpose:** Store master resume/profile

**Features:**

* One canonical base resume
* Structured input (not free text)
* Skills, experience, education
* Used as source for all generations

---

### 4.6 Admin / Settings Page (`/settings`)

**Purpose:** App configuration

**Sections:**

#### AI Providers

* Add / remove API keys
* Provider selection
* Model selection
* Ollama detection & configuration

#### Storage & Backup

* Local DB location
* Manual export
* Google Drive backup (optional)

#### App Settings

* Default resume template
* Language
* PDF formatting options

---

## 5. AI Generation System

### 5.1 Provider Abstraction

All LLMs must implement a shared interface:

```ts
interface LLMProvider {
  generateResume(input: ResumePromptInput): Promise<ResumeJSON>
  generateCoverLetter(input: CoverLetterPromptInput): Promise<string>
}
```

---

### 5.2 Prompt Strategy

* Enforce structured JSON output for resumes
* Separate prompts for:

  * Resume tailoring
  * Cover letter generation
* Include ATS constraints

---

## 6. Data Model (Simplified)

### Profile

* id
* resume_json
* created_at
* updated_at

### Job

* id
* company
* role
* description
* status
* notes
* created_at

### Resume

* id
* job_id
* content_json
* last_edited

### CoverLetter

* id
* job_id
* content_text

---

## 7. Export Requirements

* PDF:

  * ATS-friendly
  * Single-column
  * Deterministic layout
* TXT:

  * Clean formatting
  * No markdown artifacts

---

## 8. Security Requirements

* API keys stored via OS keychain
* No plaintext secrets in DB
* No telemetry by default

---

## 9. Offline Requirements

* App must fully function without internet
* Ollama supported for generation
* Cloud APIs optional

---

## 10. Open Source & Licensing

* License: GPL-3 or AGPL-3
* No proprietary lock-in

---

## 11. Non-Goals (Explicit)

* SaaS hosting
* Multi-user auth
* Cloud-only storage

---

## 12. Milestones

### Milestone 1

* Base profile
* Job creation
* Single LLM integration

### Milestone 2

* Resume editor
* PDF export

### Milestone 3

* Multi-provider support
* Job tracking
* Backup
