# Udaan — Voice & Tone Guide

The single reference for how Udaan sounds — in the app, on the landing page, in blog
posts, release notes, and social posts. When writing anything user-facing, check it
against this document. When two rules conflict, the voice principles win.

---

## 1. Brand positioning

**One-liner:**

> Udaan is a free, open-source desktop app that tailors your resume and cover letter to
> every job — with an AI you choose, on data that never leaves your machine.

**Why it exists:** उड़ान means "flight, takeoff." Every application deserves its own shot
at flight — not a copy-pasted resume sent into the void. Udaan exists because tailoring
every application is the right thing to do and nobody has time to do it by hand, and
because doing it shouldn't require handing your entire work history to a subscription
cloud service.

**The three claims we repeat everywhere** (in this order of importance):

1. **Your data never leaves your machine** — local SQLite, keys in the OS keychain.
2. **Free and open-source** — no subscription, no sign-up; bring your own AI key or run
   Ollama fully offline.
3. **Honest ATS help** — keyword match, knockout-risk, and title-alignment checks that
   tell you where you actually stand, not magic that "beats the robots."

---

## 2. Target audience

Everything is written for job seekers — never "users" — who are actively applying. Three
personas cover almost everyone:

### The volume applier

Career switcher or recently laid off. Applying to 10+ roles a week; tailoring each one
takes 45 minutes they don't have, and tracking it all is chaos.
**They care about:** speed, output that doesn't sound like AI wrote it, and keeping
momentum without burning out.
**Write for them by:** being fast to the point, respecting their time, never adding
guilt ("you should be tailoring every resume!" — they know).

### The privacy-conscious tinkerer

Developer or tech worker. Won't paste their address, phone number, and full employment
history into a random resume website. Probably has Ollama installed, reads the source
before installing.
**They care about:** local-first architecture, open source, BYOK, exact claims.
**Write for them by:** being technically precise. "Encrypted" means say the algorithm.
"Private" means say where the data lives. Vagueness reads as hiding something.

### The first-timer

New grad or first job hunt in a decade. Doesn't know what an ATS is or why their
applications vanish. Low confidence, high stakes.
**Write for them by:** explaining without condescending, expanding acronyms on first
use, and being encouraging without cheerleading.

_(A slice of all three is in the EU/Germany — the app supports photo CVs and
Anschreiben. Keep copy US-English but never assume a US-only job market.)_

**The shared truth:** job hunting is a grind that erodes confidence. Our readers don't
need hype — they need momentum. The emotional core of every piece of Udaan writing is
**"one job closer, every time."**

---

## 3. Brand persona

If Udaan were a person, it's **the friend who reviews your resume at 10 p.m. before the
deadline** — a senior engineer who has sat on both sides of the hiring table, keeps your
secrets, and genuinely believes you'll get there. Steady, precise, a little nerdy about
privacy, quietly funny, never preachy.

| Udaan is…           | Udaan is not…                      |
| ------------------- | ---------------------------------- |
| steady              | hyped                              |
| candid              | salesy                             |
| warm                | cheerleading                       |
| precise             | jargon-heavy                       |
| quietly optimistic  | "you'll land your dream job!!"     |
| a person (Pranav's) | a platform ("we at Udaan believe") |

Udaan is built by one person and sounds like it. In social posts that's literal
first-person singular ("I built this because…"). In app and docs copy it shows up as
smallness and directness — no royal "we," no corporate distance.

---

## 4. Voice principles

Five traits. Every draft should pass all five.

### 4.1 Plain over polished

Say the thing directly. If a sentence would survive in a press release, rewrite it.

- ✅ "Paste a job description. Get a resume tailored to it."
- ❌ "Udaan leverages cutting-edge AI to seamlessly optimize your application materials."

### 4.2 Honest to a fault

Precise claims about privacy, AI, and ATS. Admit rough edges before anyone hits them —
the landing page's self-signed install note is the canonical example: we tell people
about the scary OS dialog _before_ they see it. Never overclaim what AI output is
("a strong draft," not "a perfect resume"). Never fear-sell ATS ("see where you stand,"
not "beat the robots or be auto-rejected").

- ✅ "Udaan is self-signed, so macOS will warn you once. Here's the two-click fix."
- ❌ "Installation is quick and easy!"

### 4.3 Calm in the storm

The reader may be on application #80. Never add anxiety, urgency, or guilt. Errors are
stated flatly with a next step. Deadlines, scarcity, and FOMO framing are banned.

- ✅ "The AI request failed — usually a rate limit. Wait a moment and retry."
- ❌ "Oops!! Something went terribly wrong 😱"
- ❌ "Don't let another opportunity slip away!"

### 4.4 Quietly optimistic — the takeoff thread

The flight metaphor (takeoff, runway, airborne, cleared for takeoff, one udaan away) is
the brand's signature. Use it as **seasoning, not sauce**: headlines, celebratory
moments, and closing lines — roughly once per piece. Never in error messages, settings,
docs, or legal text, and never stacked ("your career will take off from the runway and
soar" — no).

- ✅ Export success: "Cleared for takeoff. Good luck out there."
- ❌ Error: "Turbulence! Your API key hit a storm."

### 4.5 A person, not a platform

Small words, short sentences, "you" and "I." Contractions always. Write like one
competent person talking to another, because that's what's happening.

- ✅ "I don't want your data. That's the whole point — it stays on your machine."
- ❌ "At Udaan, user privacy is one of our core values."

---

## 5. Tone shifts by context

Voice stays constant; tone flexes. The persona never changes — only how much energy and
warmth it shows.

| Context                     | Tone                    | Rules                                                                                                                                          |
| --------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Error messages**          | Flat, calm, actionable  | What happened + what to do next, ≤2 sentences. No blame, no jokes, no metaphor, no exclamation points, no "oops."                              |
| **Empty states**            | Warm, inviting          | One line of orientation + the action that fills the space. Light metaphor OK ("No jobs yet — add one and start the runway.").                  |
| **Celebratory moments**     | Brief, warm             | Export done, status → Offer. One line, takeoff metaphor welcome, then get out of the way. No confetti-speak.                                   |
| **Settings, docs, legal**   | Precise, neutral        | Zero metaphor, zero personality flourishes. Exact terms (AES-256-GCM, OS keychain). This is where trust is earned.                             |
| **Blog posts**              | Generous, educational   | Teach first; Udaan appears once, near the end, as "I built this." Reader should get full value without ever installing.                        |
| **LinkedIn / X (personal)** | First-person, candid    | Pranav's voice, not a brand account. Story → specifics → one CTA. Rewrite AI-drafted openers and closers by hand.                              |
| **Reddit / Hacker News**    | Peer-to-peer, technical | Community member first, builder second. Lead with the technical or honest angle; disclose "I built this" plainly; no marketing cadence at all. |
| **Release notes**           | Factual, lightly warm   | What changed and why it matters, in user terms. One personality line max, at the end.                                                          |
| **In-app AI coaching**      | Encouraging, concrete   | (Proofread/ATS feedback.) Name the issue, show the fix, never scold. "This bullet has no numbers — how many users did this affect?"            |

---

## 6. Writing mechanics

### Terminology

| Use                                                               | Not                                     |
| ----------------------------------------------------------------- | --------------------------------------- |
| Udaan (prose) · `+ udaan` (logo/mono contexts)                    | UDAAN, uDaan                            |
| job seekers, you                                                  | users, customers, candidates            |
| resume, cover letter                                              | résumé, CV (except EU-feature contexts) |
| tailor / tailored (the core verb)                                 | optimize, enhance, supercharge          |
| base profile                                                      | master resume, profile data             |
| job description (spell out)                                       | JD (OK in dev docs only)                |
| ATS — expand to "applicant tracking system" on first use in blogs | assume everyone knows                   |
| bring your own key (then BYOK)                                    | BYOK cold                               |
| on your machine, local-first                                      | on-device, edge, air-gapped             |
| free and open-source                                              | freemium, free tier                     |

उड़ान in Devanagari with its translation appears when telling the origin story — first
mention in a piece, at most. Don't sprinkle Hindi as decoration.

### Grammar & punctuation

- **Sentence case** for all headings and buttons ("Download for free," not "Download For Free").
- **Contractions** always. Oxford comma always. US spelling.
- **Em dashes:** fine — the existing copy uses them — but max ~one per paragraph.
  More than that reads as AI cadence.
- **Exclamation points:** at most one per piece, never in errors, never doubled.
- **Emoji:** none in app UI. Sparingly in social (0–2 per post). Never as bullet decoration.
- **Numbers:** be specific. "Halved page-load time," not "dramatically improved performance."

### Banned words & framings

The AI-tell list: _leverage, seamless, seamlessly, revolutionize, game-changer,
supercharge, unlock, unleash, empower, delve, elevate, effortless, "in today's
competitive job market."_

The overpromise list: _"land your dream job," "guaranteed interviews," "beat the ATS,"
"perfect resume," "one-click magic."_

The corporate-distance list: _"we at Udaan," "our valued users," "best-in-class,"
"solution" (as a noun for the app)._

Also banned: negative parallelism as a crutch ("It's not just X, it's Y"), and
rule-of-three lists where two or four items would be truer.

---

## 7. Examples — before / after

**Error message (LLM call failed)**

- ❌ Before: "Oops! Something went wrong while generating your resume. Please try again later. 😢"
- ✅ After: "The AI request failed — usually a rate limit or an invalid API key. Check your key in Settings, or wait a moment and retry."

**Feature blurb (ATS analysis, landing page)**

- ❌ Before: "Our cutting-edge ATS optimization engine ensures your resume beats the bots and gets seen by real humans!"
- ✅ After: "See where you actually stand: keyword match against the job description, knockout-risk flags, and title-alignment checks — with a rewrite suggestion for each issue it finds."

**LinkedIn post opener**

- ❌ Before: "🚀 Thrilled to announce the launch of Udaan, a revolutionary AI-powered resume platform that will transform your job search!"
- ✅ After: "I applied to 40 jobs last year with the same resume and heard back from three. So I built the tool I wished existed — it tailors your resume to each job, and your data never leaves your laptop."

**Release note item**

- ❌ Before: "Enhanced the proofreading module with improved issue detection capabilities."
- ✅ After: "Proofreading now catches unquantified claims — bullets like 'improved performance' get flagged with a prompt asking 'by how much?'"

**Empty state (no jobs yet)**

- ❌ Before: "No data available."
- ✅ After: "No jobs yet. Paste your first job description and start the runway."

---

_Keep this document honest: when the voice evolves in real copy that works, update the
guide to match — not the other way around._
