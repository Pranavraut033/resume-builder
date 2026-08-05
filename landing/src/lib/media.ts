import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Build-time only (Astro frontmatter runs in Node). Globs public/screenshots/
// once so a new file dropped in by name is picked up on the next build with
// zero markup changes — see Media.astro.
const SCREENSHOTS_DIR = fileURLToPath(new URL('../../public/screenshots/', import.meta.url));

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
