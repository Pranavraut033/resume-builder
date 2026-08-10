// Deterministic cartoon-face SVG generated from a Kokoro voice id — avoids
// hand-drawing ~28 avatars. Same hashing idea as CompanyAvatar's color pick
// (src/components/CompanyAvatar.tsx:48-52), extended to pick a face trait
// per feature so every voice gets a distinct, stable look.

const SKIN_TONES = ["#FDE1C7", "#F4C69B", "#D9A066", "#A9673A", "#7A4426"];
const HAIR_COLORS = ["#2B1B12", "#5C3A21", "#8C5A2B", "#C99A3E", "#1A1A1A", "#B0522D"];

const HAIR_LONG = [
  "M12 26c0-13 8-22 20-22s20 9 20 22v14h-6V30c0-1-1-2-2-2s-2 1-2 2v20h-6V30c0-1-1-2-2-2s-2 1-2 2v20h-6V30c0-1-1-2-2-2s-2 1-2 2v10h-6V26z",
  "M32 5c11 0 19 8 20 19 3 2 4 6 2 10-2 3-6 4-9 3V22c0-9-6-15-13-15s-13 6-13 15v15c-3 1-7 0-9-3-2-4-1-8 2-10C13 13 21 5 32 5z",
  "M32 4C19 4 10 14 10 27v11h5V27c0-3 1-6 3-8-1 6 0 12 3 16l2-2c-2-5-2-11 1-15 1 5 4 9 8 11l1-3c-3-3-5-7-5-11 3 4 8 6 13 6l1-3c-4-1-7-3-9-6 4 2 9 2 13-1l-1-3c-3 2-7 2-10 0 3 0 6-2 7-5-3 1-6 1-9-1 6 5 8 12 8 19v11h5V27C46 14 45 4 32 4z",
  "M32 6c-12 0-21 9-21 21 0 4 1 8 3 11l3-2c-2-3-3-6-3-9 0-10 8-18 18-18s18 8 18 18c0 3-1 6-3 9l3 2c2-3 3-7 3-11 0-12-9-21-21-21z",
];
const HAIR_SHORT = [
  "M32 8c-11 0-19 8-19 18 0 3 1 6 2 8l3-2c-1-2-2-4-2-6 0-8 7-14 16-14s16 6 16 14c0 2-1 4-2 6l3 2c1-2 2-5 2-8 0-10-8-18-19-18z",
  "M32 7c-10 0-18 7-18 17 0 2 0 4 1 6h2c0-8 7-14 15-14s15 6 15 14h2c1-2 1-4 1-6 0-10-8-17-18-17z",
  "M14 22c2-9 9-15 18-15s16 6 18 15c1 3 0 6-2 8-1-5-4-9-8-10 2 2 3 5 3 8h-3c0-5-4-9-9-9s-9 4-9 9h-3c0-3 1-6 3-8-4 1-7 5-8 10-2-2-3-5-2-8z",
  "M32 8C21 8 13 15 13 24c0 2 0 4 1 5l2-1c-1-2-1-3-1-5 0-7 7-13 17-13s17 6 17 13c0 2 0 3-1 5l2 1c1-1 1-3 1-5 0-9-8-16-19-16z",
];

const EYES = [
  { l: "M22 30a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", r: "M42 30a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
  { l: "M19 28h6", r: "M39 28h6" },
  { l: "M19 27c1.5-2 4.5-2 6 0", r: "M39 27c1.5-2 4.5-2 6 0" },
];

const MOUTHS = [
  "M24 42c3 3 13 3 16 0",
  "M25 41c2.5 1.5 11.5 1.5 14 0",
  "M24 40q8 6 16 0",
];
const MOUTH_OPEN = "M26 39c0 4 3 6 6 6s6-2 6-6-3-3-6-3-6-1-6 3z";

const ACCESSORIES = [
  null,
  // glasses
  'M16 27h10v8H16zM38 27h10v8H38zM26 30h12M16 30h-4M48 30h4',
  // freckles
  "M20 34a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM24 36a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM40 34a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM44 36a1 1 0 1 1-2 0 1 1 0 0 1 2 0z",
];

/** Deterministic hash → trait index, stable across renders/reloads for a given id. */
function pick<T>(id: string, salt: number, arr: T[]): T {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

interface VoiceFaceProps {
  voiceId: string;
  gender: string;
  speaking?: boolean;
  className?: string;
}

export function VoiceFace({ voiceId, gender, speaking, className }: VoiceFaceProps) {
  const skin = pick(voiceId, 1, SKIN_TONES);
  const hairColor = pick(voiceId, 2, HAIR_COLORS);
  const hairSet = gender?.toLowerCase().startsWith("f") ? HAIR_LONG : HAIR_SHORT;
  const hair = pick(voiceId, 3, hairSet);
  const eyes = pick(voiceId, 4, EYES);
  const mouth = pick(voiceId, 5, MOUTHS);
  const accessory = pick(voiceId, 6, ACCESSORIES);

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="26" fill={skin} />
      <path d={eyes.l} stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d={eyes.r} stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path
        d={speaking ? MOUTH_OPEN : mouth}
        stroke="#1A1A1A"
        strokeWidth="2"
        strokeLinecap="round"
        fill={speaking ? "#7A2E2E" : "none"}
      />
      {accessory && (
        <path d={accessory} stroke="#333" strokeWidth="1.5" fill="none" opacity={0.85} />
      )}
      <path d={hair} fill={hairColor} />
    </svg>
  );
}

export default VoiceFace;

// Exported for the trait-stability test only.
export const __testing = { pick, SKIN_TONES, HAIR_COLORS, HAIR_LONG, HAIR_SHORT, EYES, MOUTHS, ACCESSORIES };
