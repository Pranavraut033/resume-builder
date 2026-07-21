# Changelog

All notable changes to this project are documented in this file.

## [1.2.0] - 2026-07-21

### Added

- Backup and restore for app data from Settings ([6c52932])
- Cover-letter styles and verified resume tailoring in the inline editor ([61f370e])
- Option to skip AI tailoring and copy the base profile directly ([7d9216b])
- Skill category grouping and primary/secondary tiering on profile and resume skills ([1c56da4])
- Humanizer moved into a sidebar drawer with cleaner resume text ([0c9b146])
- ATS scoring now runs on the skip-AI-tailoring path, and client errors are logged to file ([f61d6c8])
- Cover letter hook now prioritizes high-impact, trendy-tech achievements ([19d0921])
- Profile list sections consolidated, with TXT export and delete ([9243b35])
- Chat-based AI edits now persist immediately and surface provider errors ([a69573d])

### Fixed

- Bundled production Tauri app now runs its own server on port 3009 instead of colliding with dev on 3008 ([603846f])
- WebKit flex-collapse bug in the canvas/chat layout ([bdaa9ce])
- API-key encryption now derives from an OS-keychain-backed master key instead of a weaker scheme ([a60b114])
- `libsodium-sys-stable` link failure on newer macOS SDKs ([30a010a])
- CSP is now enforced at the Next.js server and via a per-request proxy nonce, closing gaps in the earlier window-level policy ([8b0efd6], [80b0ce2], [d5d6169])
- Rendered HTML is sanitized and openable link schemes are restricted ([14d72ee])
- Untrusted data fences hardened against prompt-delimiter injection ([fcbe03f])
- SSRF blocked via private/loopback network access in the URL fetcher ([a38bf51])
- Bundled SQLite db is now seeded and server logs captured on first launch ([a808331])
- Duplicate Tiptap extensions removed, silencing an SSR warning ([92c920c])
- Date input on Safari/Tauri no longer relies on the native month input ([dc4808b])
- Token usage no longer persists a redundant raw `costUSD` field ([88c533b])

### Internal

- Bumped `llm-core` submodule to v0.3.0 and adapted to its async client API ([baeb8c3])
- Removed unused `tauri-plugin-stronghold` and `react-quill-new` dependencies ([3352cae], [a70cc70])
- Bundle the exact Node runtime instead of searching the host system ([0310a78])
- Added type-check and lint CI gate on push and pull request ([58ae4ed])

## [1.1.0] - 2026-07-16

### Added

- Animated progress fill on AI-generation buttons ([65109be])
- Header/entry-style layout variants and configurable date formatting for resume templates ([175f6a7])

### Changed

- Product renamed to Udaan ([1faeccf])

### Fixed

- Chat messages now render markdown in a `div` instead of a `p`, fixing invalid nested-block markup ([aa675c8])
- Ollama model multi-select in Settings is now wired up ([9c0eef9])
- The tailoring pipeline now refuses to act on a gutted/empty resume and no longer logs expected missing-API-key errors as failures ([02a4a73])

### Internal

- Seeded LLM API keys from env vars for local web development ([06ac6a1])
- Bumped Next.js, `ats-checker`, and `llm-core`; pinned the Node engine version ([abc9891])
- Landing page now deploys to GitHub Pages on push ([e3e70bb])
- Added `haiku-builder` and `sonnet-builder` subagent definitions ([be85588])

## [1.0.0] - 2026-07-13

Initial release.

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
- Segment progress no longer carries over stale state when switching editor steps ([251480c])
- Custom section IDs now use `crypto.randomUUID` instead of a collision-prone generator ([fffda50])

### Internal

- The inline WYSIWYG editor replaced the legacy drag-and-drop job page, which has been removed along with its standalone `/inline` route ([d15c0af])
- Provider base classes, the prompt resolver, and the provider registry extracted into the `@pranavraut033/llm-core` submodule package ([c42b70f])
- Reorganized the PDF template engine, template renderer imports, and inline editor components ([1f6bfd5], [7dbd590], [ff4b664])
- Updated CLAUDE.md, README, and distribution guide ([4d71beb])
