#!/usr/bin/env node
// Parses RELEASE_NOTES.md into a generated TS module the client can import
// directly — no runtime file IO (the packaged app doesn't ship the repo
// root), no second hand-maintained copy of the content. Run via predev /
// prebuild; the generated file is also committed so type-check/test:run
// never depend on build order.
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const source = readFileSync(path.join(repoRoot, "RELEASE_NOTES.md"), "utf-8");

const HEADING_RE = /^# v(\S+) — (.+)$/;

const lines = source.split("\n");
const entries = [];
let current = null;

for (const line of lines) {
  const heading = line.match(HEADING_RE);
  if (heading) {
    current = {
      version: heading[1],
      date: heading[2].trim(),
      summary: "",
      bullets: [],
    };
    entries.push(current);
    continue;
  }
  if (!current) continue;

  const trimmed = line.trim();
  if (trimmed.startsWith("- ")) {
    current.bullets.push(trimmed.slice(2).trim());
  } else if (trimmed && !current.summary) {
    // First non-empty, non-bullet line under a heading is the lede sentence.
    current.summary = trimmed;
  }
}

const out = `// GENERATED FILE — do not edit by hand.
// Source: RELEASE_NOTES.md, produced by scripts/gen-release-notes.mjs
// (wired into \`predev\`/\`prebuild\`). Re-run that script after editing
// RELEASE_NOTES.md, or just build/dev — it regenerates automatically.

export interface ReleaseNoteEntry {
  version: string;
  date: string;
  summary: string;
  bullets: string[];
}

export const RELEASE_NOTES: ReleaseNoteEntry[] = ${JSON.stringify(entries, null, 2)};
`;

writeFileSync(path.join(repoRoot, "src/lib/releaseNotes.generated.ts"), out);
console.log(
  `Generated src/lib/releaseNotes.generated.ts with ${entries.length} entries.`
);
