---
title: "Every application deserves its own resume — why I built Udaan"
description: "Why I spent eight months building a resume tailor that never uploads your work history: the origin story, the three claims it makes, and what it isn't."
pubDate: 2026-08-10
tags: ["origin", "privacy"]
draft: true
---

I kept a spreadsheet of the jobs I applied to. One column was called "resume version."
For most of the rows, the answer was the same file.

Not because I didn't know better. Everyone knows you're supposed to tailor. I could see
that the backend posting and the platform posting wanted different things pulled to the
top, and I knew the person skimming my PDF for six seconds would notice if I hadn't
bothered. I just didn't have 45 minutes per application to prove it.

So the same document went out [CONFIRM: roughly how many times?] times, and I told myself
the cover letter would make up the difference.

[CONFIRM: what actually happened — a response rate, or the one rejection that stuck with
you? One or two sentences, in your own words. This is the emotional beat of the post and
it should be true.]

## The obvious fix, and why it wore me down

The obvious fix is a chat window. Paste the job description, paste your resume, ask for a
tailored version. It works. I did it for months.

Three things eventually stopped me.

The first was repetition. Every session started from nothing, so every session began with
me pasting my entire work history back in. Ten applications a week meant ten re-pastes of
the same thousand words.

The second was what was in those thousand words. A resume isn't a neutral document. Mine
had my home address, my phone number, my personal email, and every employer I'd had for a
decade, all in one tidy block. I was pasting that into a text box roughly forty times a
month without ever once thinking about where it landed.

The third was that I couldn't tell if it was working. The model gave me a new resume. It
never told me whether that resume matched the posting better than the one I started with,
or which requirement I'd just quietly dropped, or what the previous version had said. No
score, no history, no way back.

There are real products that fix all three. They're subscriptions, and the arrangement is
roughly the same across them: your complete employment history lives on their servers, you
pay every month, and the day you stop paying you stop having what you built. For a
document I need most during a layoff — the exact moment a monthly bill is least welcome —
that trade never sat right with me.

## So I built the other version

Udaan (उड़ान — "flight, takeoff") is a desktop app. You keep one base profile: your
experience, projects, skills, education, written once. You paste a job description. It
gives you a resume and cover letter tailored to that posting, an honest read on how well
they match, and an editor to fix whatever it got wrong.

It makes three claims, and they're worth stating precisely, because vague versions of all
three are printed on every resume site on the internet.

### Your data stays on your machine

Not "we take privacy seriously." Specifically: your profile, your jobs, and every
generated document live in a SQLite file on your own disk. There is no account, no sign-up
and no server of mine holding any of it. There's no telemetry either, which means I
genuinely cannot see how many people use this or what they do with it.

Your AI provider key gets the same treatment. It's encrypted on disk with AES-256-GCM,
under a master key that lives in your operating system's keychain — macOS Keychain,
Windows Credential Manager, or Linux Secret Service, whichever you're on. The key is
never sent to a server I control, because there is no server I control.

The one thing that does leave your machine is the AI request itself, which goes straight
from the app to whichever provider you picked. That's an honest limit rather than a
footnote, and there's a way around it below.

### Free and open-source

MIT licensed, and the whole repository is public. That's partly principle and mostly
practical: an app that claims your data never leaves your laptop is asking you to take its
word for something you can't observe. You shouldn't have to. Read the code.

You bring your own AI key — OpenAI, Gemini, Claude, Grok, or Perplexity. Or point it at
Ollama and run a model on your own hardware, in which case nothing leaves your machine at
all and the honest limit above disappears. There's a pay-as-you-go gateway too, for people
who want to skip the key entirely, but it's an option and not the default.

### Honest ATS help

An applicant tracking system is the software most companies use to store and search
applications. There's a lot of folklore about beating it, and most of it is wrong.

Udaan doesn't promise to beat anything. It tells you where you stand: which requirements
from the posting your resume actually covers, which knockout criteria you might miss
outright, and whether your current title reads as a match for the one they're hiring for.
When it flags something, it suggests a rewrite. You decide whether it's right. Sometimes
it isn't.

## What it isn't

**It's macOS-only today.** The code is cross-platform and the build pipeline for Windows
and Linux exists, but I haven't published those builds yet. If you're on either, the repo
is the place to watch.

It's also self-signed, so the first launch shows a scary Gatekeeper dialog. The
[README](https://github.com/Pranavraut033/resume-builder#download--install) has the
two-click fix, and I'd rather warn you now than have you meet it cold.

The AI writes a strong first draft, not a finished resume. It doesn't know which of your
projects you're proudest of or which manager would vouch for you. Everything it generates
is editable directly on the rendered page, because you're going to want to change things,
and that's the point rather than a failure.

And it can't tell you whether you got the job. That part is still yours.

## One more thing

I built this over [CONFIRM: how long did it feel like? The repo says 8 months and 442
commits, but say it however it actually felt] because I wanted it to exist and nobody was
going to build the version that didn't want my data. It's free, it's yours, and every
application you send from it is one more shot at takeoff.

[Download it for macOS](https://github.com/Pranavraut033/resume-builder/releases).
