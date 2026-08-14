import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Loader } from 'astro/loaders';

// The repo root, one level up from landing/ — these docs are already
// checked into the repo, so this reads them straight off disk instead of
// re-fetching them over the network at build time. fs accepts a URL
// directly, so this stays a URL rather than converting to a path string.
const REPO_ROOT = new URL('../../../', import.meta.url);
const REPO_BLOB_BASE = 'https://github.com/Pranavraut033/resume-builder/blob/main';

interface DocSource {
  id: string;
  file: string;
  /** Extract a subsection (matched by its `## heading` text) instead of the whole file. */
  section?: string;
}

const SOURCES: DocSource[] = [
  { id: 'install', file: 'README.md', section: 'Download & Install' },
  { id: 'mcp', file: 'docs/MCP.md' },
];

// These pages don't have a companion route for every doc in the repo, so a
// relative link (to another doc, a source file, etc.) would 404 as-is —
// point it at the real file on GitHub instead.
function absolutizeRelativeLinks(markdown: string, sourceFile: string): string {
  const sourceDir = dirname(sourceFile);
  return markdown.replace(/(!?\]\()(?!https?:\/\/|#|mailto:)([^)\s]+)(\))/g, (_match, open, link, close) => {
    const resolved = new URL(link, `${REPO_BLOB_BASE}/${sourceDir}/`).toString();
    return `${open}${resolved}${close}`;
  });
}

function extractSection(markdown: string, heading: string): string {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return markdown;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

// Every page that renders one of these docs supplies its own real <h1>
// (styled, with an eyebrow above it, matching every other page on the
// site) — so the doc's own leading heading would just be a second,
// unstyled title sitting above it. Drop it.
function stripLeadingHeading(markdown: string): string {
  const lines = markdown.split('\n');
  if (/^#{1,6}\s/.test(lines[0]?.trim() ?? '')) {
    lines.shift();
    while (lines[0]?.trim() === '') lines.shift();
  }
  return lines.join('\n');
}

// ponytail: reads local repo docs at build time only (Astro's content layer
// `load()` runs during `astro build`/content sync, never in the browser),
// so pages stay static/zero-JS. `renderMarkdown` is Astro's own pipeline —
// the same one that renders src/content/blog/*.md — so no markdown library
// dependency is added here.
export function docsLoader(): Loader {
  return {
    name: 'docs-loader',
    load: async ({ store, renderMarkdown, generateDigest, logger }) => {
      for (const source of SOURCES) {
        try {
          const raw = await readFile(new URL(source.file, REPO_ROOT), 'utf-8');
          const section = source.section ? extractSection(raw, source.section) : raw;
          const markdown = absolutizeRelativeLinks(stripLeadingHeading(section), source.file);
          const digest = generateDigest(markdown);
          const rendered = await renderMarkdown(markdown);
          store.set({ id: source.id, data: {}, digest, rendered });
        } catch (err) {
          logger.error(`docs-loader: failed to load ${source.file}: ${(err as Error).message}`);
        }
      }
    },
  };
}
