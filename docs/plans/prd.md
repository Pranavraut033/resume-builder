# Resume Builder – Product Requirements Document

**Document Title:** Resume Builder PRD/Brief  
**Version:** 1.0  
**Date:** March 22, 2026  
**Author:** AI Product Management (Pranav Raut)

---

## 1. Executive Summary

**Resume Builder** is a local-first, open-source desktop application that helps job seekers quickly create AI-tailored, ATS-friendly resumes and cover letters for each job application. Unlike cloud-dependent solutions (e.g., Enhancv), Resume Builder is **privacy-focused, offline-capable, and fully under user control**—storing all data locally on the user's device.

The platform's core strength is its **intelligent job parsing and resume tailoring workflow**: a user pastes a job description, selects an AI model (OpenAI, Gemini, Grok, or Ollama), and the app automatically generates a tailored resume and cover letter from their base profile. Users can then manually edit, customize templates, and export in multiple formats (PDF, TXT, JSON).

**Success will be measured by:**

- Successful desktop app deployment (Windows, macOS, Linux)
- Users completing full end-to-end workflow without friction
- Resume output validated as ATS-friendly
- Support for 4+ LLM providers with seamless switching
- Full offline capability with local Ollama support

---

## 2. Problem Statement

### Who has the problem?

**Primary User Group:** Job seekers (career changers, early-career professionals, experienced job hunters, freelancers)  
**Pain Points Experienced:**

- Manual tailoring of resumes/cover letters for each application is time-consuming (often 30–60 minutes per application)
- Difficulty highlighting relevant skills and experience to match job requirements
- Anxiety about ATS compatibility and keyword matching
- Preference for privacy—hesitation to upload personal data to cloud services
- Subscription costs for premium resume services
- Lack of control over data; vendor lock-in

### What is the problem?

Existing resume/cover letter tools (Enhancv, Rezi, etc.) either:

1. Require expensive subscriptions
2. Store data on external cloud servers (privacy concerns)
3. Offer limited offline functionality
4. Lock users into specific templates or workflows
5. Lack transparency about how data is used

### Why is this a problem?

- **Lost time**: Hours wasted on repetitive customization
- **Missed opportunities**: Users apply to fewer jobs due to time constraints
- **Privacy concerns**: Hesitation to use service due to data security
- **Cost barriers**: Subscription fees exclude budget-conscious or freelance job seekers
- **Lack of control**: Users cannot export or manage their own data easily

### Current Solution & Its Shortcomings

**Manual approach:** Most job seekers manually edit their resume in Word/Google Docs → copy-paste → tweak manually. This is error-prone, slow, and lacks AI assistance.  
**Existing tools (Enhancv, Rezi):** Cloud-based, require subscriptions, limited offline mode, user data concerns, limited export flexibility, rigid templates, limited LLM choice.

---

## 3. Vision & Goals

### 3.1 Vision

_Empower job seekers to quickly create high-quality, AI-tailored, ATS-friendly resumes and cover letters while maintaining full privacy and control over their personal data through a local-first, open-source desktop application._

### 3.2 Goals (SMART Objectives)

1. **Workflow Completion**: 100% of users can complete the end-to-end workflow (create profile → input job → generate resume/cover letter → export) on first try without support.
   - **Timeline**: By GA (General Availability)
   - **Measurement**: Telemetry/user testing

2. **Multi-Provider LLM Support**: Support 4+ LLM providers (OpenAI, Gemini, Grok, Ollama) with seamless switching.
   - **Timeline**: By MVP
   - **Measurement**: Integration tests passing, UI survey shows users can select providers

3. **Offline Capability**: Users can generate resumes/cover letters offline using Ollama without any cloud dependency.
   - **Timeline**: By MVP
   - **Measurement**: Feature test: Ollama model generation succeeds in offline mode

4. **ATS Score**: Generated resumes score ≥80% on ATS compatibility checkers (e.g., Jobscan).
   - **Timeline**: By MVP (validate manually)
   - **Measurement**: Test resumes against ATS validators during QA

5. **Desktop Distribution**: Build and distribute desktop apps for Windows, macOS, and Linux via Tauri.
   - **Timeline**: By GA
   - **Measurement**: Successful builds, user downloads, and zero critical bugs in first month

6. **User Data Privacy**: 100% of user data stays locally; no mandatory cloud sync or telemetry (optional only).
   - **Timeline**: By MVP
   - **Measurement**: Code audit, no external HTTP calls except LLM providers (with user control)

---

## 4. Target Audience

### Primary Users

**Job Seekers (Career-Focused Professionals)**

- **Demographics:** Ages 22–45, College-educated, Tech-savvy to tech-comfortable
- **Segments:**
  - **Early-Career Job Hunters:** First 2–5 years; apply to 10–30 jobs simultaneously; value speed and ease of use
  - **Mid-Career Changers:** 5–10 years experience; switching industries/roles; need resume tailoring and ATS optimization
  - **Senior/Executive Job Seekers:** 10+ years; highly selective; prefer control and customization
  - **Freelancers/Contractors:** Regularly pitch to new clients; need flexible formatting and multiple templates
- **Common Needs:**
  - Quick resume customization per job
  - ATS optimization
  - Professional quality without hiring a resume writer
  - Privacy and data control
  - No subscription costs or minimal cost
- **Tech Comfort:** Comfortable downloading and installing desktop apps; familiar with settings/API keys (for cloud LLMs)

### Secondary Users

**Hiring Managers / Recruiters (Future Feature)**

- Could eventually use tool for candidate onboarding or template creation
- Out of scope for MVP

### External Stakeholders

- **Open-source community**: Developers, contributors, community members
- **LLM providers** (OpenAI, Google, xAI): Integration partners
- **UX designers** in resume/HR tech space: Potential contributors

---

## 5. Scope

### 5.1 In Scope (MVP + Core Features)

#### Data Management

- [x] **Base Profile**: Create and maintain a comprehensive professional profile (name, email, phone, location, LinkedIn, GitHub, website, summary, work experience, education, certifications, projects, skills, languages, publications, volunteer work, awards)
- [x] **Job Tracking**: Track multiple job applications with status updates (Draft, Applied, Interview, Offer, Rejected)
- [x] **Job Import**: Paste job descriptions directly or fetch from URL (HTML parsing)
- [x] **Resume Storage**: Store tailored resumes as structured JSON per job

#### AI & LLM Operations

- [x] **Job Description Parsing**: Parse job descriptions with AI to extract structured data (company, role, skills, tech stack, benefits, responsibilities, seniority, location, etc.)
- [x] **Resume Generation**: AI-powered resume tailoring from base profile + job description
- [x] **Cover Letter Generation**: AI-powered cover letter creation with professional templates
- [x] **Resume Parsing**: Import existing resume text and extract structured data into base profile
- [x] **Multi-Provider Support**: OpenAI, Google Gemini, Grok, Ollama (local), Perplexity
- [x] **Dynamic Model Selection**: Fetch available models from each provider API and let user choose
- [x] **Structured Output**: Use provider-specific structured output (e.g., OpenAI's structured output API) for guaranteed valid JSON

#### UI & Editing

- [x] **Resume Editor**: Drag-and-drop sections (header, summary, experience, projects, skills, education, certifications), inline editing with modal forms, toggle sections on/off
- [x] **Cover Letter Editor**: Professional templates, textarea editing, live preview
- [x] **Profile Management**: Comprehensive form for entering and editing all resume fields
- [x] **Job Dashboard**: Table and card views of all jobs, inline status updates, search/filter, company logos via Clearbit, peek modal with job details
- [x] **Settings Page**: API key management (secure encrypted storage), model selection, preferences

#### Export & Customization

- [x] **PDF Export**: Generate professional PDFs for download
- [x] **TXT Export**: Generate plain text format
- [x] **JSON Export/Import**: Export and import base profile as JSON for backup/portability
- [x] **Resume Customization**: Font selection, font sizes, color schemes, page format
- [x] **Cover Letter Templates**: Multiple professional templates with theming

#### Technical Foundation

- [x] **Secure Key Storage**: API keys stored securely using Tauri's Stronghold encrypted vault (no cloud storage)
- [x] **Local Database**: SQLite with Prisma ORM for all data persistence
- [x] **Server Actions**: All database operations via Next.js Server Actions (client-free architecture)
- [x] **Type Safety**: Full TypeScript with Prisma-generated types
- [x] **Desktop App**: Tauri wrapper for Windows, macOS, Linux distribution

### 5.2 Out of Scope (Post-MVP / Future Versions)

#### Cloud & Collaboration

- [ ] **Google Drive Backup**: Optional cloud sync (placeholder exists, full implementation deferred)
- [ ] **Team Collaboration**: Sharing resumes/profiles with recruiters or partners
- [ ] **Multi-Device Sync**: Syncing data across devices (breaks local-first principle)

#### Advanced Features

- [ ] **Analytics Dashboard**: Job application pipeline analytics, response rates, templates performance
- [ ] **Email Integration**: Auto-send cover letters or track email opens
- [ ] **Scheduling**: Track application deadlines and follow-up reminders
- [ ] **Browser Extension**: Fetch job descriptions directly from job boards (LinkedIn, Indeed, etc.)
- [ ] **Advanced Formatting**: More resume templates, custom CSS editing
- [ ] **Peer Feedback**: Built-in review/feedback system for cover letters

#### Accessibility & Localization

- [ ] **Multi-Language Support**: Language translations (initial focus is English)
- [ ] **Accessibility Enhancements**: WCAG 2.1 AAA (current: AA compliance)
- [ ] **Mobile App**: iOS/Android versions (desktop-first for MVP)

#### Integrations

- [ ] **Slack/Discord Integration**: Notifications for job responses
- [ ] **LinkedIn Direct Import**: Pull profile data from LinkedIn API
- [ ] **Third-Party ATS Integration**: Send resumes directly to applicant tracking systems

---

## 6. Key Features & Functionality

### Feature Category 1: Base Profile Management

- **Create/Edit Profile**: Users build a comprehensive resume profile with all professional history, education, skills, and certifications
- **Import from Resume**: Parse existing resume text and auto-populate fields via AI
- **Export Profile**: Download profile as JSON for backup or import into another instance
- **Multiple Formats**: Support for various dates, location formats, optional fields (publications, volunteer work, awards)

### Feature Category 2: Job Management & Parsing

- **Create Job Entry**: Paste job description text or provide URL for the application to fetch
- **Structured Job Parsing**: AI extracts company name, role, required skills, tech stack, benefits, location, seniority level, job type
- **Track Status**: Update job status (Draft → Applied → Interview → Offer/Rejected) from dashboard
- **View Job details**: Peek modal shows parsed job structure, raw description, and notes
- **Search & Filter**: Find jobs by company name, role, status, date range

### Feature Category 3: Resume Generation & Edition

- **AI-Tailored Resume**: Select LLM provider/model, auto-generate resume tailored to specific job
- **Structured Resume**: Resume stored as JSON with clear sections (header, summary, experience, projects, skills, education, certifications)
- **Drag-and-Drop Editing**: Reorder sections, toggle sections on/off, inline edit text
- **Section Management**: Add/remove/edit work experience, education, projects, certifications, skills inline
- **Resume Customization**: Choose font, font sizes, color scheme, page layout before export
- **Live Preview**: See PDF preview before download

### Feature Category 4: Cover Letter Generation & Editing

- **AI-Generated Cover Letter**: Generate personalized cover letter tailored to job description
- **Professional Templates**: Multiple modern templates (Minimal, Professional, etc.)
- **Template Customization**: Font, colors, spacing match resume styling
- **Edit & Regenerate**: Manually edit content, regenerate with custom prompts, preserve edits
- **Live Preview**: See formatted cover letter as you edit

### Feature Category 5: Export & Distribution

- **PDF Export**: High-quality PDF from resume editor with selected template/colors
- **TXT Export**: Plain text format for pasting into online forms
- **Cover Letter PDF**: Export cover letter as PDF with template formatting
- **JSON Backup**: Save profile as JSON for portability

### Feature Category 6: Settings & Customization

- **API Key Management**: Securely store API keys for OpenAI, Gemini, Grok, Perplexity
- **Model Selection**: Choose preferred LLM provider and model for all generation tasks
- **Provider Setup**: Add/remove LLM providers, validate keys
- **Preferences**: Optional telemetry consent, theme (light/dark mode)

### Feature Category 7: AI/LLM Operations

- **Multi-Provider Support**: OpenAI, Google Gemini, Grok, Ollama (local), Perplexity
- **Dynamic Model Fetching**: Fetch available models from provider when key is added
- **Model Caching**: Cache models for 6 hours with automatic refresh
- **Offline Support**: Fully functional with Ollama; no external API calls required
- **Structured Outputs**: Use provider-specific structured output APIs for guaranteed valid JSON

---

## 7. User Stories

1. **As a** _job seeker_, **I want to** _create a comprehensive base profile once_, **so that** _I can reuse it for multiple job applications without re-entering information each time._

2. **As a** _job seeker_, **I want to** _paste a job description or URL_, **so that** _the app can automatically extract key information (company, role, skills) without manual data entry._

3. **As a** _job seeker_, **I want to** _generate a resume tailored to a specific job using AI_, **so that** _it highlights the most relevant experience and uses job-specific keywords for ATS matching._

4. **As a** _job seeker_, **I want to** _manually edit the AI-generated resume and cover letter_, **so that** _I can personalize and ensure accuracy before submitting._

5. **As a** _job seeker_, **I want to** _choose between multiple AI providers (OpenAI, Gemini, Ollama)_, **so that** _I can use the provider I prefer or trust most, without vendor lock-in._

6. **As a** _job seeker_, **I want to** _generate cover letters with professional templates_, **so that** _my applications look polished and follow standard business letter formats._

7. **As a** _privacy-conscious user_, **I want to** _ensure all my data stays on my device_, **so that** _my personal and professional information is never uploaded to servers without my explicit choice._

8. **As a** _offline user_, **I want to** _use the app with a local LLM (Ollama)_, **so that** _I can generate resumes and cover letters without an internet connection or API keys._

9. **As a** _job tracker_, **I want to** _maintain a dashboard of all my job applications and their status_, **so that** _I can track my job search progress and stay organized._

10. **As a** _user_, **I want to** _export my resume in multiple formats (PDF, TXT, JSON)_, **so that** _I can use it in different contexts (online applications, email, backup)._

---

## 8. Technical Requirements & Considerations

### Architecture (High-Level)

- **Frontend**: Next.js 16 (App Router) + React + TypeScript + Tailwind CSS
- **Desktop Wrapper**: Tauri (lightweight, Rust-based, secure)
- **Backend**: Next.js Server Actions (no traditional REST API)
- **Database**: SQLite with Prisma ORM v7.2.0 (using better-sqlite3 adapter)
- **API Keys**: Tauri Stronghold encrypted vault (client-side only, no cloud)
- **LLM**: Client-side operations via provider SDKs or HTTP APIs

### Integrations

- **OpenAI**: Via @openai/sdk with structured outputs
- **Google Gemini**: Via @google/generative-ai SDK
- **Grok**: Via xAI API (OpenAI-compatible SDK)
- **Ollama**: Via HTTP API (localhost:11434)
- **Perplexity**: Via OpenAI-compatible SDK
- **Job Parsing**: HTML content extraction, Cheerio for DOM parsing
- **Company Avatars**: Clearbit API for company logos

### Performance

- Resume generation: <10 seconds per job (model-dependent)
- Job parsing: <5 seconds
- UI responsiveness: <500ms for all user interactions
- Database queries: <100ms (SQLite on local device)
- Model caching: 6-hour TTL, localStorage persistence
- Support 1000+ jobs in database without noticeable lag

### Security

- **API Keys**: Encrypted via Tauri Stronghold; never logged or transmitted unencrypted
- **User Data**: Stored locally in SQLite; no telemetry without consent
- **HTTPS for LLM calls**: All external API calls use HTTPS
- **No User Tracking**: No analytics, no external tracking pixels
- **Data Export**: Users can export all data as JSON at any time

### Scalability

- Database: SQLite suitable for single-user local app; scales to 10,000+ jobs
- Future: Migration path to PostgreSQL if cloud sync added post-MVP
- LLM concurrency: Single user, sequential requests (no multi-user queuing)

### Maintenance & Deployment

- **CI/CD**: GitHub Actions for building desktop bundles (Windows, macOS, Linux)
- **Versioning**: Semantic versioning; desktop auto-update via Tauri updater (future)
- **Monitoring**: Error tracking via Sentry (optional post-MVP)
- **Documentation**: README, inline code comments, API docs for contributors

---

## 9. Design & User Experience Requirements

### Brand Alignment

- **Design System**: Tailwind CSS with custom blocky/builder theme tokens
- **Color Palette**: Professional, neutral (grays, blues, accents); supports dark mode
- **Typography**: Clear hierarchy, readable font sizes for resume content
- **Icons**: Consistent icon set (Heroicons) for UI clarity

### Usability Principles

- **Simplicity**: 3-step workflow (Profile → Job → Export) with minimal friction
- **Clarity**: Clear labeling, helpful hints on form fields
- **Feedback**: Toast notifications for all user actions (save, delete, generate, export)
- **Consistency**: Unified component library (Button, FormField, Card, Modal, Table, Autocomplete, MultiSelect)
- **Accessibility**: WCAG 2.1 Level AA compliance, keyboard navigation, focus rings, semantic HTML

### Responsiveness

- **Desktop-First**: Optimized for laptop/desktop screens (1200px+)
- **Tablet**: Responsive design works on tablets with touch support
- **Mobile**: Basic responsiveness (not primary target)
- **Resizable**: Sections collapse on smaller screens

### Key UX Patterns

- **Drag-and-Drop**: Intuitive reordering of resume sections via dnd-kit
- **Inline Editing**: Edit fields directly in UI, modal forms for complex entries
- **Real-Time Preview**: See changes instantly (resume PDF preview, cover letter template preview)
- **Peek Modal**: View structured job data without leaving dashboard
- **Autocomplete**: Model/provider selection with search and keyboard navigation
- **Toast Notifications**: Non-intrusive feedback for all actions
- **Status Badges**: Visual indicators for job status (color-coded)
- **Optimistic Updates**: UI updates immediately; syncs to database in background

---

## 10. Success Metrics (KPIs)

### Primary Metrics

| Metric                             | Target                                                           | Timeline | Measurement Method                     |
| ---------------------------------- | ---------------------------------------------------------------- | -------- | -------------------------------------- |
| **End-to-End Workflow Completion** | 100% of testers complete profile → job → export without guidance | MVP      | User testing / telemetry               |
| **ATS Resume Score**               | ≥80% on ATS validators (Jobscan, Workable, etc.)                 | MVP      | Manual QA testing                      |
| **Desktop App Distribution**       | Successful builds for Windows, macOS, Linux                      | GA       | CI/CD pipeline, release checklist      |
| **Provider Support**               | 4+ LLM providers integrated and tested                           | MVP      | Integration tests passing              |
| **Offline Functionality**          | Full generation capability with Ollama, zero external calls      | MVP      | Feature test: offline mode             |
| **Data Privacy**                   | 100% user data stays local; no mandatory cloud sync              | MVP      | Code audit, network traffic inspection |

### Engagement Metrics

| Metric                         | Target                               | Timeline         |
| ------------------------------ | ------------------------------------ | ---------------- |
| **Day-1 Retention**            | ≥60% of users return after first use | 3 months post-GA |
| **Monthly Active Users (MAU)** | ≥500 MAU from open-source downloads  | 6 months post-GA |
| **Avg Jobs Per User**          | ≥5 jobs tracked per active user      | 6 months post-GA |
| **Avg Session Duration**       | ≥10 minutes per session              | 3 months post-GA |

### Quality Metrics

| Metric                    | Target                                     | Timeline        |
| ------------------------- | ------------------------------------------ | --------------- |
| **Critical Bugs Post-GA** | <5 critical issues reported in first month | 1 month post-GA |
| **Test Coverage**         | ≥70% code coverage (unit + integration)    | MVP             |
| **Type-Check Pass Rate**  | 100% (zero TypeScript errors)              | On every build  |
| **ESLint Pass Rate**      | 100% (zero linting violations)             | On every build  |

### Business Metrics (Community/Open-Source)

| Metric              | Target                             | Timeline         |
| ------------------- | ---------------------------------- | ---------------- |
| **GitHub Stars**    | ≥100 stars                         | 6 months post-GA |
| **Open Issues**     | Resolve ≥80% of community issues   | Ongoing          |
| **Contributor PRs** | ≥5 external contributor PRs merged | 6 months post-GA |
| **Download Count**  | ≥1,000 desktop app downloads       | 3 months post-GA |

---

## 11. Risks & Assumptions

### 11.1 Risks

| Risk                                                                        | Likelihood | Impact   | Mitigation Strategy                                                                                              |
| --------------------------------------------------------------------------- | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| **LLM API cost**: High volume of token usage by users → expensive API calls | Medium     | High     | Implement token usage tracking, warn users of costs, optimize prompts, support local Ollama alternative          |
| **ATS compatibility**: Generated resumes don't match ATS requirements       | Medium     | High     | Validate resumes against 3+ ATS tools during QA, include ATS-friendly template by default, provide user warnings |
| **Tauri desktop build issues**: Platform-specific bugs on Windows/Linux     | Medium     | High     | Test on CI/CD for all platforms, maintain active Tauri version, have fallback to web version                     |
| **User data loss**: SQLite database corruption or accidental deletion       | Low        | High     | Implement automatic JSON backups every N minutes, provide easy restore UI, warn users before deletes             |
| **LLM provider outages**: OpenAI/Gemini API downtime                        | Low        | Medium   | Gracesome error messaging, fallback to Ollama, document offline mode prominently                                 |
| **Security vulnerability**: API key exposure or data breach                 | Low        | Critical | Security audit before GA, use Tauri Stronghold (battle-tested), regular dependency updates, bug bounty program   |
| **Poor user adoption**: Low community interest or slow growth               | Medium     | Medium   | Strong open-source marketing, detailed docs, active community engagement, responsive to issues                   |
| **Privacy regression**: Accidental logging or telemetry leak                | Low        | High     | Code audit, eslint rule blocking external calls, default opt-in for telemetry (not opt-out)                      |

### 11.2 Assumptions

| Assumption                                                      | Validation                                                      |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| Job seekers will adopt a desktop app over web-based competitors | User research, beta testing with 20+ users                      |
| Users trust Tauri/SQLite enough to store personal data locally  | Transparent security documentation, no mandatory cloud features |
| Multiple LLM providers will be accessible and stable during MVP | Confirm API access, test provider stability in staging          |
| Prisma + SQLite is sufficient for 1000+ job records             | Performance testing with large dataset                          |
| Drag-and-drop UI is preferred to form-based resume editing      | Usability testing with 5+ users                                 |
| Users will provide API keys for OpenAI/Gemini (not just Ollama) | Survey early users, provide clear setup guide                   |
| ATS-friendly resume generation is achievable with LLMs          | Test output against ATS validators, iterate on prompts          |
| No regulatory/legal blockers in core markets (US, EU, UK, CA)   | Legal review of privacy practices, GDPR-compliant data handling |

---

## 12. Open Questions & Dependencies

### Open Questions

- [ ] Should we implement optional telemetry/analytics post-GA to track feature usage?
- [ ] Will we support in-app resume templates beyond the initial 2–3 (e.g., from community)?
- [ ] Should we add social sharing (e.g., LinkedIn, Twitter) for application sharing?
- [ ] What is the long-term vision? Single-user desktop app, web SaaS, freemium model?
- [ ] Should we prioritize browser-based web app (PWA) in addition to desktop?

### Dependencies

| Dependency                      | Status      | Impact                                                   | Timeline                             |
| ------------------------------- | ----------- | -------------------------------------------------------- | ------------------------------------ |
| **Prisma v7**                   | ✅ Complete | Database operations                                      | Done (2026-01-02)                    |
| **Tauri 2.x**                   | ✅ Complete | Desktop app build                                        | Done (2025-12-13)                    |
| **Next.js 16**                  | ✅ Complete | Frontend framework                                       | Done (2025-12-13)                    |
| **LLM provider SDKs**           | ✅ Complete | AI operations (OpenAI, Gemini, Grok, Ollama, Perplexity) | Done                                 |
| **Structured output APIs**      | ✅ Complete | Guaranteed valid JSON from LLMs                          | Done (OpenAI implemented 2026-01-04) |
| **dnd-kit library**             | ✅ Complete | Drag-and-drop resume editing                             | Done (2025-12-13)                    |
| **Tailwind CSS**                | ✅ Complete | Styling framework                                        | Done (2025-12-13)                    |
| **Design system documentation** | ✅ Complete | STYLE_GUIDE.md for consistent UI                         | Done (2025-12-14)                    |
| **Testflight/beta release**     | Pending     | User testing before GA                                   | Q2 2026                              |
| **Security audit**              | Pending     | Pre-GA security review                                   | Q2 2026                              |

---

## 13. Timeline & Milestones (High-Level)

### Phase 1: Foundation & Core Features (✅ Complete)

- **Duration**: Dec 13, 2025 – Jan 5, 2026
- **Completed Items**:
  - Project scaffolding (Next.js, TypeScript, Tailwind)
  - Tauri desktop wrapper
  - SQLite + Prisma ORM (v5 → v7 migration)
  - Base profile management
  - Job CRUD operations
  - Resume JSON schema
  - LLM provider abstraction (OpenAI, Gemini, Grok, Ollama, Perplexity)
  - Secure API key storage (Tauri Stronghold)
  - Job description parsing
  - Resume generation & cover letter generation
  - Resume drag-and-drop editor
  - Settings page & model selection
  - Export (PDF, TXT, JSON)
  - Home dashboard with card/table views

### Phase 2: Polish & Refinement (🔄 In Progress)

- **Duration**: Jan 2026 – Feb 2026
- **Key Milestones**:
  - [ ] Prompt template consolidation & optimization (all generation uses template system)
  - [ ] ATS compatibility testing & validation (resume output verified against ATS tools)
  - [ ] Comprehensive test suite (unit + integration, ≥70% coverage)
  - [ ] UI/UX polish (consistency, accessibility, responsive design)
  - [ ] Performance optimization (LLM token tracking, caching improvements)
  - [ ] Documentation (user guide, developer guide, setup instructions)
  - [ ] Beta testing with 20+ users (feedback collection, bug identification)

### Phase 3: Release Preparation (📋 Planned)

- **Duration**: Feb 2026 – Mar 2026
- **Key Milestones**:
  - [ ] Desktop builds for Windows, macOS, Linux via Tauri CI/CD
  - [ ] Security audit & penetration testing
  - [ ] Final QA round (smoke tests, regression tests)
  - [ ] Public GitHub repo setup (if not already public)
  - [ ] Release notes & marketing materials
  - [ ] Setup error reporting (Sentry or similar)
  - [ ] Launch announcement (Medium post, Twitter, Hacker News, Reddit)

### Phase 4: General Availability (GA) & Post-Launch (📅 Planned)

- **Target GA Date**: Late Mar 2026
- **Post-Launch Activities**:
  - Monitor user feedback & bug reports
  - Fix critical issues within 48 hours
  - Community engagement (respond to issues, review PRs)
  - Monthly feature releases based on feedback
  - Long-term roadmap planning (cloud sync, analytics, templates library, etc.)

---

## 14. Stakeholders

### Product Team

- **Product Manager/Owner**: Pranav Raut (Vision, roadmap, requirements)
- **AI/ML Lead**: Responsible for LLM integration & prompt optimization
- **Designer**: UI/UX, design system, user research

### Engineering Team

- **Backend Lead**: Prisma/SQLite, Server Actions architecture
- **Frontend Lead**: Next.js/React, component library, state management
- **Desktop/DevOps Lead**: Tauri build, CI/CD, release automation
- **QA Lead**: Testing strategy, ATS validation, bug triage

### Community & Stakeholders

- **Open-Source Community**: Contributors, library maintainers, testers
- **LLM Partners**: OpenAI, Google, xAI, Ollama developers (for integration support)
- **Users**: Job seekers providing feedback during beta & post-GA

### Executive Sponsor

- Likely author/creator (Pranav Raut) with clear long-term vision for privacy-first tools

---

## 15. Future Considerations (Post-MVP / Long-Term Roadmap)

### Phase 5: Enhanced Features (Post-GA)

- [ ] **Google Drive Backup** (optional): Cloud sync for users who opt in
- [ ] **Advanced Analytics Dashboard**: Job pipeline metrics, response rates, template performance
- [ ] **Email Integration**: Auto-send cover letters, track opens/responses
- [ ] **Browser Extension**: Fetch job descriptions directly from job boards
- [ ] **Scheduling & Reminders**: Track application deadlines, follow-up reminders
- [ ] **Peer Feedback**: Built-in review system for cover letters
- [ ] **Resume Templates Library**: Community-contributed templates

### Phase 6: Scaling & New Platforms

- [ ] **Web App (PWA)**: Browser-based version without Tauri
- [ ] **Mobile App (iOS/Android)**: On-the-go job tracking and editing
- [ ] **Multi-Device Sync**: Cloud-enabled sync for power users (with privacy option)
- [ ] **Team/Enterprise Version**: Collaboration features, admin dashboard, bulk imports
- [ ] **API & Integrations**: Public API for third-party integrations (ATS tools, job boards)

### Phase 7: Monetization (If Desired)

- [ ] **Freemium Model**: Free tier (offline, Ollama) + premium tier (cloud LLMs, advanced templates, priority support)
- [ ] **Sponsorships**: Accept open-source sponsors for feature development
- [ ] **Consulting/Training**: Custom implementations for enterprise users
- [ ] **Resume Review Service**: Partner with career coaches for professional feedback
- [ ] **Job Board Partnerships**: Affiliate links or embedded job search

### Phase 8: Market & Community Growth

- [ ] **Content Marketing**: Blog posts, YouTube tutorials, case studies
- [ ] **Community Building**: Discord/Slack community, monthly AMAs, contributor recognition
- [ ] **Localization**: Multi-language support (Spanish, Mandarin, German, French, etc.)
- [ ] **Industry Partnerships**: Integrations with job boards, universities, bootcamps
- [ ] **Events**: Host webinars, speak at conferences, sponsor job search communities

---

## 16. Appendix: Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              Resume Builder Workflow (MVP)                   │
└─────────────────────────────────────────────────────────────┘

    1. Setup
       ├─ Download desktop app (Windows/macOS/Linux)
       └─ Add API keys (OpenAI, Gemini, Grok, Perplexity) [optional]

    2. Create Base Profile
       ├─ Enter name, email, phone, location
       ├─ Add work experience, education, skills, projects
       ├─ (Optional) Import from existing resume
       └─ Save profile

    3. Create Job Entry
       ├─ Paste job description OR fetch from URL
       ├─ Select LLM provider & model
       ├─ AI parses job (company, role, skills, etc.)
       └─ Save job with status (Draft)

    4. Generate Resume & Cover Letter
       ├─ Select job from dashboard
       ├─ Click "Generate Resume"
       │  └─ AI tailors resume to job, saves as JSON
       ├─ Click "Generate Cover Letter"
       │  └─ AI generates cover letter, selects template
       └─ Both saved to database (linked to job)

    5. Edit & Customize
       ├─ Resume Editor
       │  ├─ Drag-and-drop sections to reorder
       │  ├─ Inline edit text, add/remove items
       │  ├─ Choose font, colors, template
       │  └─ Live PDF preview
       ├─ Cover Letter Editor
       │  ├─ Edit text in textarea
       │  ├─ Choose template
       │  └─ Live preview with formatting
       └─ Save changes

    6. Export & Apply
       ├─ Export resume as PDF / TXT / JSON
       ├─ Export cover letter as PDF
       ├─ Copy text for online applications
       ├─ Update job status to "Applied"
       └─ Track responses (Interview, Offer, Rejected)

    7. Iterate
       ├─ Regenerate resume/cover letter with different model
       ├─ Create new job entry for next application
       └─ Repeat Steps 3–6

    [All data stored locally in SQLite]
    [Optional: Export profile JSON for backup]
```

---

## 17. Document History

| Version | Date           | Changes                                                              |
| ------- | -------------- | -------------------------------------------------------------------- |
| 1.0     | March 22, 2026 | Initial PRD based on project requirements and completed architecture |

---

**End of Document**

For questions or clarifications, contact: Pranav Raut (Project Owner)
