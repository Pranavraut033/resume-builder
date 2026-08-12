---
title: "Building a local-first desktop app with Tauri and Next.js"
description: "The architecture behind Udaan: why every LLM call runs client-side, how a Tauri app ships its own Node runtime, and what local-first actually costs to build."
pubDate: 2026-08-18
tags: ["tauri", "nextjs", "architecture"]
draft: true
---

I spent the last eight months building [Udaan](https://github.com/Pranavraut033/resume-builder),
a desktop app that tailors your resume to a job description using an AI provider you
choose. The interesting parts weren't the AI. They were the consequences of one decision
made early and then refused for 442 commits.

The decision: **your data never leaves your machine.** Not as a marketing line — as a
constraint that gets to veto architecture.

This post is what that constraint actually cost, and what it bought.

## The rule that shaped everything

Written at the top of the project's `CLAUDE.md`, where I'd see it every time I asked a
model to write code:

> Server = database only. LLM calls = client only.

Two halves. The first says the Next.js server is allowed to talk to SQLite and nothing
else. The second says every call to OpenAI, Anthropic, Gemini, or a local Ollama instance
originates in the client — the browser context or the Tauri webview — and never from a
server process.

That second half is the load-bearing one, and it exists for a specific reason. If the
server made the AI calls, the server would need the API key. A key on a server is a key I
could read, log, or leak. Keeping the call client-side means the key can live somewhere I
have no access to, and the claim "I can't see your data" becomes structurally true rather
than a promise.

The cost is that a whole category of normal patterns become unavailable. No server-side
prompt assembly. No API route that proxies the model. No rate limiting, no caching layer,
no retry queue on the backend. Everything the model touches is assembled, sent, and parsed
in the client, which means it also has to survive someone closing the window mid-stream.

I don't regret it, but it's worth being clear that it's a real trade and not a free win.

## Why there's a Next.js server at all

Reasonable question for a desktop app. Tauri will happily serve a static bundle into a
webview, and that's the common setup.

I kept the server because Next.js Server Actions are a genuinely good way to talk to a
local database, and I wanted Prisma running in Node rather than reimplementing data access
against something that works in a webview. So the built app ships a real Node process.

At startup, the Rust side spawns it:

```rust
Command::new(&node_bin)
    .arg("server.js")
    .current_dir(&server_dir)
    .env("HOSTNAME", "127.0.0.1")
    .env("PORT", "3009")
    .env("NODE_ENV", "production")
    .env("DATABASE_URL", &database_url)
```

Bound to loopback, on a port that deliberately differs from the dev server's 3008 so a
running dev instance and an installed app can coexist without fighting. The webview then
points at `http://127.0.0.1:3009`.

This is the part where the architecture stops being elegant and starts being a series of
problems I had to solve one at a time.

### Problem: end users don't have Node

The server needs a Node runtime. Users have no reason to have one.

The first instinct is to search the system for an installed `node` and use it. That works
until it doesn't, and the way it fails is nasty: `better-sqlite3` is a native module
compiled against a specific Node ABI. Build on one version, run on another, and you get a
module-load error deep in Prisma's stack that says nothing useful about the actual cause.

The fix is to stop searching. The build script bundles the exact Node binary its own build
ran under, and the Rust side refuses to start if that binary isn't where it expects:

```rust
let node_bin = server_dir.join("node-bin").join("node");
if !node_bin.exists() {
    return Err(format!(
        "Bundled Node runtime not found at {}. Run `npm run tauri build` ...",
        node_bin.display()
    ));
}
```

ABI compatibility by construction rather than by hope. It costs about 50 MB in the
installer, and it's the single change that made desktop builds stop being flaky.

### Problem: the database has to outlive the app

An app update replaces the bundle wholesale. Anything inside it — including a SQLite file
sitting at a relative path — goes with it. Shipping an update that silently deletes
everyone's work history is the kind of bug you only get to ship once.

So `DATABASE_URL` is an absolute path into the OS app-data directory, outside the bundle
entirely. On macOS that's `~/Library/Application Support/com.resumebuilder.dev/app.db`.

Which creates the next problem. On a fresh install that file doesn't exist, and
`better-sqlite3` opens-or-creates by default. It cheerfully creates an empty database with
zero tables, the app starts fine, and then every single Server Action fails with "table
does not exist." Nothing crashes. It just doesn't work.

The app now seeds from a pre-migrated template database bundled alongside the server, and
never lets the driver create the file itself.

### Problem: schema changes for people who already installed

Related, and worse. If the database lives outside the bundle so updates can't touch it,
then updates _can't touch it_ — including when the schema changed and the new code expects
a column the user's file doesn't have.

Every launch runs a migration script against the existing `app.db`, ALTERing it onto the
current schema. It's a no-op once the database is current, which is the overwhelmingly
common case. It exists entirely for the launch right after an update.

This is the unglamorous tax of local-first. There's no migration you run once against one
database you control. There are N databases on N machines, each on some arbitrary older
version, and the app has to walk each one forward on its own.

## Where the API key actually lives

The chain, precisely, because vagueness here is the thing I was trying to avoid:

1. On first run, Rust generates 32 random bytes and stores them base64-encoded in the OS
   keychain — macOS Keychain, Windows Credential Manager, or Linux Secret Service, via the
   `keyring` crate.
2. That master key derives an AES-256-GCM key.
3. Your provider API key is encrypted with it and written to a file on disk.

The keychain holds one secret per install, not one per provider, so adding a fifth
provider doesn't mean five keychain prompts. And keychain access can fail legitimately —
the user denies the prompt, or there's no Secret Service running on a headless Linux box —
so that path returns a real error instead of panicking.

On web, where there's no keychain, keys go in `localStorage` and the app says so plainly
rather than implying parity it doesn't have.

## The bit I'd do again: JSON Pointer instead of round-tripping

A problem specific to AI-driven editing, and the one non-obvious design win in the project.

The naive way to have a model edit a resume is to send it the resume, ask for an edited
resume, and replace the old one with what comes back. This mostly works, and the ways it
fails are expensive: the model silently drops a bullet, reformats a date, or truncates the
last section because it ran out of output tokens. You now have a corrupted document
and no clear diff explaining what happened.

Instead, every AI mutation — proofreading, the humanizer, chat edits, the tailoring
pipeline — goes through one function that takes RFC-6902 JSON Patch operations. The model
doesn't echo the resume back. It names a JSON Pointer path and the new value for that
path:

```json
{
  "op": "replace",
  "path": "/experience/1/bullets/0",
  "value": "Cut deploy time from 40 minutes to 6"
}
```

Every op is re-validated against the resume schema before it applies, and a bad op is
rejected individually without blocking the rest of the batch. Output tokens scale with the
size of the change instead of the size of the document, malformed edits fail loudly, and
undo is trivial because you have the patch.

If you're building anything where a model modifies structured data, I'd start here rather
than arrive here.

## Smaller things worth knowing

**The whole Rust side is 880 lines.** Across five files — server spawning, keychain, the
MCP server, browser handling, and a six-line `main.rs`. Tauri's value proposition is that
you write almost no Rust, and in my experience that held. Nearly all the complexity stayed
in TypeScript.

**CSP needs a nonce, and it can't come from `next.config.ts`.** The App Router streams RSC
and hydration data through inline `<script>` tags, so a static `script-src` from
`headers()` either blocks them or you give up and allow `'unsafe-inline'`, which defeats
the exercise. Generating a fresh nonce per request in middleware fixes it with less wiring
than you'd expect: Next auto-detects the nonce from the CSP response header and applies it
to its own inline scripts, so there's nothing to thread through your components.

**There's no telemetry, and that's genuinely inconvenient.** I can't tell you how many
people who downloaded the app ever generated a resume. I can see download counts and
nothing else. This is the correct trade for a privacy-focused app and it makes product
decisions meaningfully harder, so it's worth deciding deliberately rather than drifting
into it.

**Self-signing means the OS warns your users once.** Gatekeeper on macOS, and SmartScreen
on Windows whenever I get around to publishing that build. Certificates cost money and
Apple's requires a developer account. For a free tool I chose to document the two-click
bypass prominently instead, and telling people about the scary dialog before they meet it
turns out to matter more than the dialog itself.

**Cross-platform code is not the same as cross-platform releases.** Tauri builds for all
three and the release workflow has the Windows and Linux jobs written. Today only the macOS
build is actually published, because "it compiles" and "I've tested it enough to hand to a
stranger" are different bars and I only cleared the second one on one platform.

## Was it worth it?

The honest summary: local-first cost me a bundled Node runtime, a per-launch migration
step, a client-side-only AI path with no server to lean on, and the ability to measure
whether anyone uses the thing.

It bought an app with no account, no subscription, no server bill, and no ability on my
part to look at anyone's employment history. For this particular product — where the data
is your home address, your phone number, and every job you've held — that's the right
trade. For a different product it might not be.

The code is [on GitHub](https://github.com/Pranavraut033/resume-builder), MIT licensed. If
you're building something similar, the four problems in the middle of this post are the
ones I'd have wanted to read about first.
