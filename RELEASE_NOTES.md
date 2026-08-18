# v1.16.0 — 2026-08-19

Three overlapping analysis passes become two that know what they're for: Fit Check decides, Deep Analysis edits.

- **Fit Check tells you whether to bother applying.** Knockout risks, missing experience, seniority and domain gaps — the things no keyword scan catches. It has no "apply" button on purpose: none of those are closed by editing a line of your resume. It's now the first button in the action bar, ahead of Deep Analysis.
- **Deep Analysis replaces both proofreading and the old document scan.** Every finding points at an exact line of your resume with the exact text it wants to change, so you review and apply them one by one instead of reading a wall of generic advice.
- **New: lite/full analysis depth, per model.** Smaller local models get a shorter, more focused prompt; larger ones get the full document-wide pass. Same results format either way, so switching models never invalidates an analysis you already ran.
- **Better proofreading checks:** brand-name casing (it's "GitHub", not "Github"), internal inconsistencies, duplicated skill entries, and US/UK spelling drift.
- **Settings rebuilt:** add and remove AI providers directly from the settings page, export the MCP connector bundle in one click, and a new open-source licenses page.
- **Fixed: a stale analysis could break the entire job editor.** An analysis saved before this release would crash the page on load instead of just showing "re-run this".
- **Fixed: the one-click "align resume terms" action could delete text.** When a suggestion applied to part of a bullet, it replaced the whole bullet. It now edits only the words it meant to.
- **Fixed: the app no longer flashes the wrong theme on launch**, and switching your system between light and dark now takes effect immediately.
- **Fixed: several status colors failed accessible contrast in dark mode** — red, green, and rose text on the dark surface are now readable.
- **Fixed: desktop restart** now waits for the previous background process to exit before starting the new one.

**Note for MCP users:** the tool surface changed with no backward-compatible aliases. `analyze_ats`, `analyze_resume_gaps`, `proofread_resume`, and `fix_ats_issues` are replaced by `analyze_fit`, `analyze_document`, and the new `align_resume_terms`. Re-export the connector bundle from Settings to pick up the new tools.

# v1.15.0 — 2026-08-17

ATS analysis is now Recruiter Skim, and it stops pretending to score you — plus a new Fit Check.

- **Recruiter Skim replaces the ATS analysis panel.** No more invented "match score" — no applicant tracking system shows one to anyone on the hiring team, so Udaan doesn't either. It now leads with what actually ends an application (work authorization, a license, a location), then keyword coverage and title alignment, each with a suggested rewrite.
- **New: Fit Check.** A blunt, honest read on whether you're actually a fit for the role — missing experience, seniority, and domain gaps a keyword scan can't catch — separate from Recruiter Skim's document-level checks, and closing with your real strengths.
- **Fixed:** the Documents page's score badge said "No analysis" under a column already relabeled "Skim"; it now says "Not run" consistently, and drops the "/ 100" framing since that column ranks jobs against each other, not grades them.
- **Fixed:** a Recruiter Skim row in the chat view could be announced by a screen reader as a disabled button when it wasn't disabled at all, just non-clickable in that context.

# v1.14.0 — 2026-08-16

Three new European templates, and cover letters get their own look.

- **New templates: European Modern, Europass Classic, and French Elegant.** More options tuned for European-format resumes and CVs.
- **Cover letters no longer have to match your resume's template.** Pick a cover-letter design independently — mix and match however you like.
- **Redesigned template picker.** Browse templates in a grid with background pattern previews and each template's accent color, instead of a plain list.

# v1.13.2 — 2026-08-16

Mostly documentation and website accuracy, plus a debug-logging fix.

- **Landing page corrected and expanded.** The ATS section no longer implies a "score" — there isn't one, an ATS is a database, not a judge — and there's a new section on how Udaan follows German/EU CV conventions for jobs based there.
- **README and docs brought up to date.** The provider list, template count, and platform/download details now match what's actually shipped.
- **Fixed: error logs in the installed app pointed at the wrong place.** `client.log` now shows the real call site instead of logger internals, making bug reports easier to diagnose.

# v1.13.1 — 2026-08-15

Windows and Linux desktop builds are now available.

- **New: Windows and Linux installers.** Udaan now ships `.exe` (Windows) and `.AppImage`/`.deb` (Linux) builds alongside macOS, both for the manual test build and every tagged release.
- **Fixed: release publishing now reliably updates the download page**, so the website picks up new releases right away instead of needing a manual trigger.
- **Landing page polish:** corrected screenshot proportions, the official Apple logo on the download page, and updated footer copy now that all three platforms are supported.

# v1.13.0 — 2026-08-14

Smarter macOS downloads, and an MCP fix.

- **macOS downloads are now arch-specific.** Instead of one universal dmg, you'll pick the Apple Silicon or Intel build on the download page — smaller to download and install.
- **Fixed: MCP job URLs.** A job's URL could get dropped partway through `add_job` if your MCP host didn't re-send it on the final call; it's now carried through automatically.

# v1.12.2 — 2026-08-14

A small tuning pass on AI resume tailoring.

- **Tighter skill grouping in tailored resumes.** The AI now keeps skill categories to a maximum of 5, each with at least 4 skills — smaller, fragmented categories get merged into the closest matching one instead of cluttering the resume.

# v1.12.1 — 2026-08-14

Cover letter polish: smarter dates and styles, more reliable PDF export.

- **Cover letter dates and styles now adapt to the job's region.** German/EU applications get German-format dates and can auto-default to the formal "Anschreiben" style when the job ad itself is in German — no manual toggling needed, still fully overridable.
- **Generate and Humanize are now one shared toolbar** for both resumes and cover letters — Humanize was previously resume-only.
- **Fixed: PDF export reliability.** Full-bleed backgrounds and solid sidebar fills (Tech Sidebar, Euro Sidebar templates) now render correctly to the page edges, the Euro Sidebar template exports a matching cover letter instead of the wrong one, and a CSP issue that could block PDF export entirely on some setups is resolved.
- **Fixed: switching between resume and cover letter** in the customization panel now shows the right saved settings for each, and resume-only controls no longer show up while editing a cover letter.

# v1.12.0 — 2026-08-12

More European CV fields, a friendlier font picker, and PDF/editor fixes.

- **New: Nationality and Date of Birth fields.** Two more optional fields for German/EU-style CVs, alongside the existing Work Authorization and photo — fill them in once on your profile and they show up on the resume header and in exports.
- **A better font picker.** Fonts now preview with a real specimen of themselves right in the dropdown, so you can see exactly what you're picking.
- **Simpler theme customization.** Per-section color/heading overrides are gone in favor of one global "Heading Style" control that applies everywhere at once.
- **Fixed: PDF export now matches the on-screen editor more closely** — skill category labels, section descriptions, and sidebar heading borders that were missing or misaligned in exported PDFs are fixed.
- **Fixed: a brief layout glitch and white flash on desktop app launch/navigation.**
- **Fixed: local Ollama connections were being blocked** by the app's security policy.

# v1.11.2 — 2026-08-11

A bug fix for MCP profile edits.

- **Fixed: MCP profile edits no longer get rejected outright.** Every edit made through the `preview_profile_edit`/`apply_profile_edit` MCP tools (and the same underlying editor used by chat edits, proofread, humanizer, and tailoring) was being falsely rejected as "not part of the resume schema" due to an internal key-ordering bug — valid edits now apply correctly.

# v1.11.1 — 2026-08-11

A dedicated field for work authorization status.

- **State your work authorization once, use it everywhere.** A new "Work Authorization" field on your profile (e.g. "EU Blue Card", "Requires sponsorship") shows up on your resume header and in ATS knockout-risk analysis, so a job requiring EU work authorization no longer gets flagged as a silent gap once you've filled it in.

# v1.11.0 — 2026-08-11

A macOS autoupdate fix, a new European CV template, and German conventions on by default.

- **Fixed: macOS autoupdate no longer breaks itself.** Previously, updating could leave the app "damaged" and force a manual reinstall — the app now clears the quarantine flag on its own bundle after every update, so autoupdate stays self-healing going forward. (If you're updating _from_ 1.10 or earlier, this one update still needs a manual reinstall — after that you're set.)
- **New: Euro Sidebar template.** A full-height solid sidebar with a banded name header, circular photo, and stacked skills/languages list — built for European/German-style CVs.
- **8 new color presets** for template customization: Crimson, Amber, Emerald, Cyan, Indigo, Fuchsia, Slate, and Brown.
- **German/EU conventions are now the default** for resume, cover letter, and ATS guidance — format, reading order, telegraphic bullet style, gapless chronology, and degree-equivalence notes — reflecting that Germany is this app's primary market. An explicit instruction in the job ad still wins.

# v1.10.0 — 2026-08-10

MCP-connected chat clients can now read and edit your base profile.

- **Edit your base profile from Claude Desktop (or any MCP-compatible chat client).** New `get_profile`, `preview_profile_edit`, and `apply_profile_edit` tools let a connected host update your profile — always previewing the change first and only saving once you confirm.

# v1.9.0 — 2026-08-09

Bookmarks, gap analysis, and a notification center.

- **Save a job for later.** Paste a job URL on the new Bookmarks page to save it without generating a resume yet — it parses in the background so pasting several at once doesn't block you. MCP users get the same flow via `submit`'s new bookmark mode.
- **See exactly where your resume falls short.** A new gap-analysis flow compares your resume against a job description, available in chat and as an MCP tool.
- **Never miss a background update.** A new notification bell in the sidebar keeps a running, unread-counted history alongside the existing toasts.
- **Chat double-checks before a full rewrite.** Tailoring or regenerating your whole resume now asks for confirmation first instead of applying immediately.
- **Fixed:** the job page now stays in sync after a resume or cover letter is written from outside the open page.

# v1.8.0 — 2026-08-07

Resume Builder is now **Udaan** — plus finer control over AI output and template layout.

- **New name, new logo.** Resume Builder is now Udaan (उड़ान — "flight, takeoff"), with a refreshed sidebar logo.
- **Dial in your AI model's behavior.** The model picker now has per-model temperature and top-p controls, alongside reasoning effort.
- **Two new skills layouts.** A two-column grid and a borderless label/value columns style join the existing inline, chips, list, and table options.
- **Resumes and cover letters now fit the page automatically** instead of overflowing.
- **Retry a rejected AI edit** right from chat or the humanizer, instead of it failing silently.
- **MCP users:** a new `fetch_url` tool lets your connected chat client pull a job posting's text when the host's own fetch is blocked (e.g. LinkedIn).
- **Fixed:** multi-column template layouts, PDF section borders and pagination, ATS panel contrast, and a couple of rendering/hydration edge cases.

# v1.7.0 — 2026-07-31

Connect your own AI chat client to your resumes, and steadier AI editing under the hood.

- **Drive your resumes from Claude Desktop (or any MCP-compatible chat client).** A new optional MCP server exposes job parsing, tailoring, ATS analysis, cover letter generation, editing, proofreading, and humanizing as tools — using your own chat subscription instead of a configured API key. Off by default; turn it on in Settings.
- **More reliable AI edits.** Every AI-driven edit — tailoring, proofreading, chat edits, humanizing — now goes through the same underlying editor, so a single bad edit no longer risks the rest of the batch.
- **Fixed:** chat-rewritten resume bullets are now checked against the right original bullet before being applied.

# v1.6.0 — 2026-07-28

More accurate, more trustworthy AI output: proofreading, stricter fidelity to your real experience, and a rendering bug fix.

- **Proofread your resume before you export it.** A new proofread pass checks for errors, inconsistencies, and unquantified claims, auto-fixing the mechanical issues and surfacing the rest in a review drawer so you decide what to apply.
- **AI tailoring sticks closer to your real experience.** Dates, names, and metrics are never altered, your original job order is preserved, and stale or irrelevant experience, projects, certifications, and education get pruned automatically.
- **Broader fact-checking.** The hallucination check now also verifies projects, certifications, and education against your base profile, not just your summary and experience — and it runs by default.
- **Fixed:** a tailored or parsed resume could silently hide entire sections; section layout is now preserved correctly.

# v1.5.0 — 2026-07-27

A chat upgrade and an update-notice fix.

- **Fix every ATS issue in one click.** Chat now offers a "Fix all ATS issues" action that resolves every open recommendation in a single turn.
- **Fixed:** the keychain access notice now reappears after each app update, instead of only showing once on first install.

# v1.4.1 — 2026-07-27

A small polish release, mostly editor and chat fixes.

- **Fixed:** chat now stays anchored to the latest message instead of drifting while it scrolls.
- **Fixed:** dates display consistently no matter your system's language/locale settings.
- **Fixed:** a scrollbar-related layout jitter in the inline editor canvas.
- **Fixed:** a data-integrity check on saved ATS scores, and a dev-mode connection bug on desktop.

# v1.4.0 — 2026-07-27

A smarter chat assistant, and a fix that keeps existing installs from breaking on update.

- **Ask chat to regenerate your cover letter, humanize text, or undo a change** — no more hopping to a separate button for those.
- **See what chat is doing in real time.** A status line now shows whether it's classifying your request, editing, regenerating, or checking ATS — plus token usage for every turn.
- **Copy or retry any chat message**, and a failed message can now be retried without retyping it.
- **Fixed:** installed apps now automatically bring their local database up to date on launch, so people who update no longer risk hitting broken screens from a previous release's data-model changes.

# v1.3.1 — 2026-07-26

A small fix release for auto-updates.

- **Fixed:** in-app auto-update downloads were failing outright due to a URL mismatch in the update manifest — updates now install correctly.
- **Fixed:** the "Check for Updates" button in Settings now actually works.

# v1.3.0 — 2026-07-26

A release focused on EU/German-style resumes and sharper ATS feedback.

- **Build EU/German-style resumes.** Add a profile photo and a hobbies/interests section, styled to match your template, plus new Anschreiben cover-letter style and DE/EU-specific writing guidance.
- **See knockout risks before you apply.** ATS analysis now flags knockout-risk issues and title misalignment against the job posting, with coaching on how to rewrite around them.
- **Fixed:** background patterns in the customization drawer and PDF export now render correctly (true page proportions in the picker, no more clipping on two-column templates).
- **Fixed:** "Fit" zoom now accounts for page height, and publications, volunteer, and awards sections are fully editable, including publication links.

# v1.2.0 — 2026-07-21

A security-hardening and workflow release: locked-down content security policy, safer API-key storage, and a more flexible tailoring flow.

- **Skip AI tailoring when you just want your base profile.** A new option copies your base profile straight into a resume, with ATS scoring still available on that path.
- **Cover letters can now match a tone and style.** Pick from cover-letter style presets, and the resume tailoring pipeline now verifies its own output.
- **Skills can be grouped and prioritized.** Organize skills into categories (e.g. Languages, Frameworks) and mark the ones you want emphasized.
- **Back up and restore your data.** A new Settings section exports and re-imports your full app data as a portable file.
- **Humanizer moved into a sidebar drawer** for a cleaner editing flow, and AI chat edits now save immediately with clearer error messages when a provider call fails.
- **Security:** content security policy is now enforced at the server and per-request, rendered HTML is sanitized, link schemes are restricted, and API-key encryption now derives from your OS keychain rather than a weaker in-app scheme.
- **Fixed:** the bundled desktop app now runs its own server on a separate port from `npm run dev`, so the two no longer collide.

# v1.1.0 — 2026-07-16

A polish release: more template flexibility, a smoother generation experience, and a couple of settings/chat fixes.

- **More control over resume layout.** New header and entry-style variants, plus configurable date formatting, give templates more flexibility.
- **Clearer generation progress.** AI-generation buttons now show an animated progress fill while a resume or cover letter is being drafted.
- **Fixed:** the Ollama model picker in Settings now actually saves your selection.
- **Fixed:** chat messages render correctly instead of producing invalid markup.

# v1.0.0 — 2026-07-13

The first release of Udaan: a local-first desktop app that turns a job description into a tailored resume and cover letter, then lets you polish the result right on the page.

- **Paste a job description, get a tailored resume and cover letter.** AI drafts both from your base profile and the job posting — bring your own API key, or use the managed, prepaid-credit option if you don't have one.
- **Edit right on the document.** Bullets, links, and language proficiency fields can all be edited inline, directly on the rendered resume or cover letter — no separate form to hop between.
- **See exactly where your experience falls short.** The ATS panel scores your resume against the job and shows skill-by-skill gaps between what's asked for and what you have.
- **Humanize AI-written sections.** A humanizer smooths out AI-sounding phrasing, with a preview before anything is applied.
- **Never lose an old draft.** The Documents page keeps full version history for every resume and cover letter you generate.
- **Faster job description capture.** Pasting in a job URL pulls the description straight from the in-app browser, with a step-by-step progress indicator while your materials are generated.
- **Nine resume templates** — including Compact, Two-Tone, and Academic — plus customizable page backgrounds (dots, waves, mesh, and more) and multi-profile support.
- Small polish: step progress no longer sticks between editor steps, and custom section IDs no longer risk colliding.
