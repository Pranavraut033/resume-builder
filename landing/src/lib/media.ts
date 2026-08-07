import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Build-time only (Astro frontmatter runs in Node). Globs public/screenshots/
// once so a new file dropped in by name is picked up on the next build with
// zero markup changes — see Media.astro.
// process.cwd() rather than import.meta.url: Vite relocates this module when
// bundling for `astro build`, which silently breaks an import.meta.url-relative
// path (it resolves into dist/, which has no public/screenshots) even though
// the same code works fine in `astro dev`.
// cwd isn't always the astro project root, though — some launchers invoke
// `astro dev --root landing` from the monorepo root, leaving cwd one level
// up. Try both so either invocation style finds the real directory.
const CANDIDATE_DIRS = [
  join(process.cwd(), 'public/screenshots/'),
  join(process.cwd(), 'landing/public/screenshots/'),
];
const SCREENSHOTS_DIR = CANDIDATE_DIRS.find((dir) => existsSync(dir)) ?? CANDIDATE_DIRS[0];

const files = existsSync(SCREENSHOTS_DIR) ? readdirSync(SCREENSHOTS_DIR) : [];

// Preference order: real video beats a raw gif beats a static shot.
const EXT_PRIORITY = ['mp4', 'webm', 'gif', 'png', 'jpg', 'jpeg'];

export type ResolvedMedia = {
  src: string;
  kind: 'video' | 'image';
  poster: string | null;
};

export function resolveMedia(name: string): ResolvedMedia | null {
  for (const ext of EXT_PRIORITY) {
    const file = `${name}.${ext}`;
    if (files.includes(file)) {
      const poster = files.includes(`${name}-poster.png`) ? `${name}-poster.png` : null;
      return {
        src: `screenshots/${file}`,
        kind: ext === 'mp4' || ext === 'webm' ? 'video' : 'image',
        poster: poster ? `screenshots/${poster}` : null,
      };
    }
  }
  return null;
}
