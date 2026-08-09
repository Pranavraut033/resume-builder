# Changelog

All notable changes to this project are documented in this file.

## [1.9.0] - 2026-08-09

### Added

- Gap-analysis flow comparing a resume against a job description, available in chat and as an MCP tool ([96beb2d])
- Bookmarks: paste a job URL to save it for later without generating a resume; pasted URLs parse in the background via a queue, and the MCP `submit` tool gained a matching `bookmark` mode ([f971036], [3e414e5], [919e32b])
- Notification system: a persistent bell popover with unread count alongside the existing toasts, both reading from one headless store ([6ce37cf])
- Chat now confirms before a whole-resume tailor/regenerate rewrite instead of applying it silently ([835640a])

### Fixed

- Resume/cover letter state on the job page now resyncs after an external database write instead of going stale ([b84331d])

### Internal

- Brand voice guide and drafted launch posts moved out of this public repo to the private marketing repo ([06eb2c9], [373dde3])
- Drafted three launch blog posts ([a5a3d55])

## [1.8.0] - 2026-08-07

### Added

- Model picker gained per-model temperature and top-p controls alongside the existing reasoning-effort selector ([40201b9])
- Two new skill-section layouts — a two-column accent-ruled grid and borderless label/value columns — join the existing inline/chips/list/table styles ([5b4da4a])
- Resume and cover letter pages now scale to fit the page automatically instead of overflowing ([3dc10b7])
- MCP server gained a `fetch_url` tool so a connected host can pull a job posting's text server-side when its own fetch is blocked (e.g. LinkedIn) ([4ec3eaa])
- Chat and the humanizer now surface a retry action when an AI-proposed edit is rejected, instead of failing silently ([e75dced], [bef1fbb])

### Changed

- Renamed the app from Resume Builder to **Udaan**, with a new sidebar logo ([da12634])

### Fixed

- A job page with no resume yet now auto-creates one from your base profile instead of showing a broken state ([d8ee148])
- Multi-column template layout polish; PDF section borders now render at the correct opacity ([0b1384f])
- PDF section pagination now breaks pages in the right place ([5b4da4a])
- ATS panel's struck-through original text is readable again in both themes ([07e4004])
- Resume text no longer breaks during server-side rendering ([3e64b23])
- Job page no longer re-fetches on every render, fixing a hydration mismatch ([d82019a])
- MCP server now fails loudly instead of silently on an unresolved `add_job` draft ID, and repeats the carry-forward hint ([08b283b])
- Desktop build now always rebuilds the MCP server bundle before packaging, so a built app can't ship a stale MCP server ([1ab0c0a])

### Internal

- Landing marketing site rebuilt as componentized Astro pages with a blog and FAQ, refreshed screenshots/demo clips, and analytics/SEO polish ([217b7c6])
- Synced CLAUDE.md/README/MCP/DISTRIBUTION docs with the skillStyle, MCP tool, and Udaan-branding changes ([631a747])

## [1.7.0] - 2026-07-31

### Added

- Optional MCP server exposing job parsing, tailoring, ATS analysis, cover letter generation, editing, proofreading, and humanizing as tools, so an external MCP host (e.g. Claude Desktop) can drive them on the user's own subscription; opt-in via Settings, off by default, and never touches API keys ([ccabe01])
- The MCP server's `add_job` flow now builds up a job incrementally via a submit-tool draft state machine, and prompt templates skip re-sending resume/job data already shared earlier in the conversation ([77e3611])
- Model picker gained a reasoning-effort selector ([540875d])

### Changed

- AI-driven resume edits (tailoring, proofreading, chat edits, humanizing) now go through a single path-based JSON-Patch editor instead of ad hoc text/array rewrites, so a bad edit op is rejected without blocking the rest of the batch ([588f363])

### Fixed

- Chat-rewritten resume bullets are now verified against their original bullet index and company before being applied ([2a7c161])

### Internal

- Synced CLAUDE.md and README with the JSON-Patch editor and new MCP architecture docs ([9d24346])

## [1.6.0] - 2026-07-28

### Added

- Chat gained a "proofread" intent and floating-action-bar button: a deterministic lint pass runs alongside an LLM proofread pass, auto-applying lint fixes while LLM-judged issues (errors, consistency, unquantified claims) surface in a new review drawer for manual apply ([9e4897c])
- Resume tailoring prompt now enforces stricter field-mapping rules, forbids altering dates/names/metrics, preserves original experience ordering, and prunes stale/irrelevant experience, projects, certifications, and education ([453c434])
- Hallucination checking now also fact-checks projects, certifications, and education against the base profile (previously only summary/headline/skills/experience); resume verification is now opt-out instead of opt-in ([4c04676])

### Fixed

- Tailored/parsed resumes no longer silently hide sections: the base profile's `sectionLayout` is now preserved instead of trusting incomplete model output ([6773d5a])

### Internal

- Synced CLAUDE.md and README with the ats-checker submodule split, proofread pipeline, and EU/German CV work ([5333e3a])

## [1.5.0] - 2026-07-27

### Added

- Chat gained a "Fix all ATS issues" action that applies every open ATS recommendation in one turn instead of one at a time ([997e19f])

### Fixed

- The keychain access notice now reappears after each app update instead of only on first install ([cbd1ac9])

## [1.4.1] - 2026-07-27

### Fixed

- Chat auto-scroll now anchors to the bottom of the message list instead of drifting ([b204ff6])
- Date fields now format consistently in en-US regardless of the system locale ([5a8f97f])
- Reserved the scrollbar gutter in the inline editor canvas, fixing a reflow loop ([3fd93c6])
- Stored ATS analysis is now validated against its schema before use, guarding against corrupt/stale data ([b76cced])
- Tauri dev mode now loads the dev server URL instead of a hardcoded release port ([344ef4d])

## [1.4.0] - 2026-07-27

### Added

- Chat assistant now handles cover-letter regeneration, humanizing, and undo directly as intents, alongside existing resume tailoring/editing ([46bc586])
- Chat now narrates its current stage (classifying, editing, regenerating, ATS-checking, tailoring) as an ephemeral status line, and reports token usage per turn ([e422904])
- Chat messages gained copy and retry buttons, and ATS-aware regeneration now passes through the session's existing analysis instead of discarding it ([e422904], [29b1cd7])
- Chat UI restyled onto the existing agent color tokens instead of inline styles ([29b1cd7])

### Fixed

- Installed apps now auto-migrate their local database schema on launch, so updates that add columns (like v1.3.0's profile photo/hobbies) no longer break existing installs with "no such column" errors ([ca94f10])
- Fixed a kebab-case icon lookup bug where the refresh icon silently fell back to a generic one ([29b1cd7])

## [1.3.1] - 2026-07-26

### Fixed

- Auto-update download always 404'd because the update manifest pointed at the unsuffixed build filename instead of the `_universal`-suffixed one Tauri actually uploads ([df03444])
- The "Check for Updates" button in Settings is now wired up, driving the same update modal as the background auto-check ([df03444])

## [1.3.0] - 2026-07-26

### Added

- Profile photo and a hobbies/interests section for EU/German-style resumes, with per-template photo shape and frame ([cf502ff])
- DE/EU region guidance and an Anschreiben cover-letter style ([4dd2243])
- Writing-guide rules now applied to AI field-generation prompts ([041db64])
- ATS analysis now flags knockout risks and title misalignment, with rewrite coaching ([3bd6ad4])

### Fixed

- Background swatches in the customization drawer now match the resume's true page aspect ratio and color instead of a stretched preview ([7bea55e])
- PDF export no longer clips the background pattern on two-column templates ([3922e19])
- "Fit" zoom now accounts for page height as well as width, so a full page no longer overflows the viewport ([d7966a0])
- Publications, volunteer, and awards sections are now editable, and publication links render as proper editable links ([5d0a0dc])

### Internal

- Bumped `llm-core` submodule pointer ([213ab81])

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
