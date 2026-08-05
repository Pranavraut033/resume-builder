// Site-wide constants shared by every page/layout — one source instead of
// each page redeclaring `base`/REPO/RELEASES.
export const REPO = 'https://github.com/Pranavraut033/resume-builder';
export const RELEASES = `${REPO}/releases`;

export function getBase(rawBase: string): string {
  return rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
}
