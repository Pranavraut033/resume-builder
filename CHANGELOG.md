# Changelog

All notable changes to this project are documented in this file.

## [1.1.0] - 2026-07-12

### Breaking Changes

- The legacy drag-and-drop job page (v1) and its standalone `/inline` route have been removed. The inline WYSIWYG editor is now the only job page — update any bookmarks/links pointing at the old route ([d15c0af])
- Provider base classes, the prompt resolver, and provider registry moved out of the app into the `@pranavraut033/llm-core` submodule package. Custom providers must now extend the base classes from `llm-core` rather than the old in-app locations ([c42b70f])

### Added

- AI humanizer for resume and cover letter content, with a review modal before applying changes ([3e0aaad])
- Managed LLM provider backed by a self-hosted gateway, for users without their own API key ([93efa5a])
- Resume version history and a new Documents page listing all generated resumes/cover letters ([efa7eb2])
- Astro-based marketing landing page, with refreshed copy and template screenshots ([7018a24], [88f1eb7])
- Skill experience gaps shown in the ATS score panel, comparing required vs. resume years per skill ([ad8911f])
- Inline rich-text editing embedded directly in resume and cover letter templates ([197efab])
- Step-by-step progress shown while generating application materials ([78b5b3d])
- Job descriptions extracted from the in-app browser webview instead of a server fetch ([5806139])
- Zoom controls (fit/100%/+/-) on the document canvas ([1b8e487])
- Achievement strength and matched/missing language analysis panels ([26906a5])
- Confirmation prompt before opening external links in the OS browser ([fa8d82b])
- Bullet/link/language inline-edit fields, an ATS drawer, and a dockable chat side panel ([e96e805], [1a8ee13])
- Custom generation instructions for cover letters ([b705b94])
- Multi-agent resume tailoring pipeline for the chat assistant ([f6996fc])
- New template engine driving DOM, PDF, and TXT rendering from one config, plus 3 new templates (Compact, Two-Tone, Academic) and customizable page backgrounds ([4fd538f], [830a9ba])
- Playwright e2e suite and additional unit test coverage ([1b94e98])

### Fixed

- Untrusted job/profile data now wrapped in delimiters before prompt interpolation, closing a prompt-injection gap ([efaf642])
- Dead Clearbit logo API call and a broken lucide `Link` import ([b00fb32])
- Missing italic font registration that broke italic styling (e.g. the Academic template) ([830a9ba])
- Unstable `DndContext` ids that could cause hydration mismatches ([aa74b07])
- Webhook handler and document page fixes ([66ce49b])
- Step progress button styling ([0f4a23e])

### Internal

- Extracted provider/prompt infrastructure into the `@pranavraut033/llm-core` submodule ([c42b70f])
- Reorganized the PDF template engine, template renderer imports, and inline editor components ([1f6bfd5], [7dbd590], [ff4b664])
- Updated CLAUDE.md, README, and distribution guide ([4d71beb])
