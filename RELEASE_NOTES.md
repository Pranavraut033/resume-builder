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
