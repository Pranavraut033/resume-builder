import { REPO } from '../consts';

export interface ReleaseAsset {
  name: string;
  url: string;
}

export interface PlatformDownloads {
  version: string | null;
  macArm: ReleaseAsset | null;
  macIntel: ReleaseAsset | null;
  windows: ReleaseAsset | null;
  linux: ReleaseAsset | null;
}

const EMPTY: PlatformDownloads = { version: null, macArm: null, macIntel: null, windows: null, linux: null };
const REPO_SLUG = REPO.replace('https://github.com/', '');

function pickAsset(assets: { name: string; browser_download_url: string }[], pattern: RegExp): ReleaseAsset | null {
  const asset = assets.find((a) => pattern.test(a.name));
  return asset ? { name: asset.name, url: asset.browser_download_url } : null;
}

// ponytail: fetch runs only during `astro build` (output: "static" — no
// server adapter), so the shipped page stays fully static/zero-JS. Staying
// current relies on deploy-landing.yml rebuilding on every GitHub release,
// not on any client-side polling.
export async function getLatestReleaseAssets(): Promise<PlatformDownloads> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_SLUG}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return EMPTY;
    const data = await res.json();
    const assets = Array.isArray(data.assets) ? data.assets : [];
    return {
      version: typeof data.tag_name === 'string' ? data.tag_name : null,
      macArm: pickAsset(assets, /aarch64.*\.dmg$/i),
      macIntel: pickAsset(assets, /(x86_64|x64).*\.dmg$/i),
      windows: pickAsset(assets, /\.exe$/i),
      linux: pickAsset(assets, /\.appimage$/i),
    };
  } catch {
    // Build shouldn't fail because the GitHub API rate-limited or is down —
    // fall back to the generic releases page (RELEASES in consts.ts).
    return EMPTY;
  }
}
