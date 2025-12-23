# Documentation Index

This directory contains comprehensive documentation for the Resume Builder application.

## Core Documentation

### [CLIENT_SIDE_LLM.md](./CLIENT_SIDE_LLM.md)
**Purpose**: Complete guide to client-side LLM operations

**Contents**:
- Architecture overview and rationale
- Why LLM operations are client-side
- All LLM functions with usage examples:
  - `parseJobDescription()` - Parse job descriptions with structured extraction
  - `generateResume()` - Generate tailored resumes
  - `generateCoverLetter()` - Generate personalized cover letters
  - `fetchModels()` - Get available models from providers
- Provider factory pattern
- API key management with Tauri storage
- Complete workflow examples
- Error handling patterns
- Testing strategies

**Use When**: 
- Implementing new LLM features
- Understanding how AI generation works
- Debugging LLM operations
- Adding new LLM providers

---

### [SERVER_ACTIONS.md](./SERVER_ACTIONS.md)
**Purpose**: Complete guide to Next.js Server Actions for database operations

**Contents**:
- Server actions overview and patterns
- Profile actions (CRUD operations)
- Job actions (CRUD operations)
- Resume and cover letter operations
- Form actions pattern
- Error handling strategies
- Revalidation patterns
- Type safety guidelines
- Testing server actions
- Best practices and common mistakes

**Use When**:
- Creating new server actions
- Understanding database operations
- Debugging data persistence
- Learning Next.js Server Actions pattern

---

### [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
**Purpose**: Step-by-step guide for migrating from REST API to Server Actions + Client-Side LLM

**Contents**:
- Architecture changes overview
- Database migration (Drizzle → Prisma)
- API routes → Server Actions mapping
- Client component migration patterns
- LLM operations migration
- Model fetching migration
- File deletions and additions
- Dependency changes
- Testing after migration
- Troubleshooting guide
- Performance improvements
- Security improvements

**Use When**:
- Understanding the architecture evolution
- Troubleshooting migration issues
- Learning the new patterns
- Comparing old vs new implementations

---

### [CHANGELOG.md](./CHANGELOG.md)
**Purpose**: Version history and detailed changelog

**Contents**:
- Version 2.0.0 breaking changes
- New files and features
- Changed components and patterns
- Removed files and dependencies
- Fixed issues and TypeScript errors
- Security improvements
- Performance improvements
- Testing checklist
- Future roadmap

**Use When**:
- Understanding what changed between versions
- Checking migration requirements
- Planning upgrades
- Reviewing project history

---

## Root Documentation Files

### [../README.md](../README.md)
**Purpose**: Main project README with quick start guide

**Contents**:
- Project overview and features
- Tech stack
- Architecture summary
- Installation and setup
- Quick start guide
- How it works (data flow)
- Project structure
- Development scripts
- Troubleshooting
- Contributing guidelines

**Use When**:
- First-time setup
- Getting started quickly
- Understanding project overview

---

### [../ARCHITECTURE.md](../ARCHITECTURE.md)
**Purpose**: Complete architecture documentation

**Contents**:
- Migration summary (Old → New)
- Files created, modified, deleted
- API routes to server actions mapping
- Component migration details
- Usage patterns and code examples
- Key benefits of new architecture
- Architecture decision rationale (client-side LLM)
- Data flow diagrams

**Use When**:
- Understanding overall architecture
- Learning architectural decisions
- Reviewing migration details
- Planning new features

---

### [../requirements.md](../requirements.md)
**Purpose**: Complete feature requirements and specifications

**Contents**:
- Application overview
- Core features list
- User workflows
- Technical requirements
- Architecture patterns
- Database schema
- Export formats

**Use When**:
- Understanding product requirements
- Planning new features
- Checking feature completeness

---

### [../STATUS.md](../STATUS.md)
**Purpose**: Feature checklist and progress tracking

**Contents**:
- Architecture migration checklist
- Feature implementation status
- Completed items with timestamps
- Future roadmap items

**Use When**:
- Tracking development progress
- Checking what's complete
- Planning next tasks

---

### [../STYLE_GUIDE.md](../STYLE_GUIDE.md)
**Purpose**: UI/UX guidelines and component patterns

**Contents**:
- Tailwind-first styling approach
- Component patterns
- Spacing and layout rules
- Color tokens
- Typography
- Accessibility guidelines

**Use When**:
- Creating new UI components
- Ensuring consistent styling
- Following design patterns

---

### [../agents.md](../agents.md)
**Purpose**: Instructions for AI coding agents

**Contents**:
- Status tracking rules
- Incremental progress guidelines
- Architecture constraints
- Database operation rules
- LLM operation rules
- Documentation requirements

**Use When**:
- Configuring AI agents
- Understanding agent workflows
- Following development process

---

## Quick Reference

### I want to...

**...understand how LLM operations work**
→ Read [CLIENT_SIDE_LLM.md](./CLIENT_SIDE_LLM.md)

**...understand database operations**
→ Read [SERVER_ACTIONS.md](./SERVER_ACTIONS.md)

**...migrate from old architecture**
→ Read [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

**...see what changed**
→ Read [CHANGELOG.md](./CHANGELOG.md)

**...get started quickly**
→ Read [README.md](../README.md)

**...understand the architecture**
→ Read [ARCHITECTURE.md](../ARCHITECTURE.md)

**...check feature requirements**
→ Read [requirements.md](../requirements.md)

**...track progress**
→ Read [STATUS.md](../STATUS.md)

**...create UI components**
→ Read [STYLE_GUIDE.md](../STYLE_GUIDE.md)

**...configure AI agents**
→ Read [agents.md](../agents.md)

---

## Documentation Standards

All documentation follows these standards:

1. **Clear Structure**: Hierarchical headings, logical sections
2. **Code Examples**: Real, working code snippets
3. **Usage Patterns**: Practical examples showing how to use features
4. **Cross-References**: Links to related documentation
5. **Up-to-Date**: Reflects current codebase state
6. **Comprehensive**: Covers common use cases and edge cases

---

## Contributing to Documentation

When adding or modifying features:

1. Update relevant documentation files
2. Add code examples for new features
3. Update CHANGELOG.md with changes
4. Update STATUS.md with completion status
5. Cross-reference related documentation
6. Ensure examples match current code

---

## Documentation Maintenance

Documentation was last fully updated on: **2025-12-21**

Major updates included:
- Created CLIENT_SIDE_LLM.md
- Created SERVER_ACTIONS.md
- Created MIGRATION_GUIDE.md
- Created CHANGELOG.md
- Completely rewrote README.md
- Updated ARCHITECTURE.md
- Updated all agent instructions

Next update needed when:
- New features are added
- Architecture changes occur
- Breaking changes are introduced
- Migration paths change
