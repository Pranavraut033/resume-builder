import { describe, expect, it } from "vitest";

import { __testing } from "@/components/practice/VoiceFace";

const { pick, SKIN_TONES, HAIR_COLORS, HAIR_LONG, HAIR_SHORT, EYES, MOUTHS, ACCESSORIES } =
  __testing;

const KOKORO_VOICE_IDS = [
  "af_heart",
  "af_alloy",
  "af_aoede",
  "af_bella",
  "af_jessica",
  "af_kore",
  "af_nicole",
  "af_nova",
  "af_river",
  "af_sarah",
  "af_sky",
  "am_adam",
  "am_echo",
  "am_eric",
  "am_fenrir",
  "am_liam",
  "am_michael",
  "am_onyx",
  "am_puck",
  "am_santa",
  "bf_emma",
  "bf_isabella",
  "bf_alice",
  "bf_lily",
  "bm_george",
  "bm_lewis",
  "bm_daniel",
  "bm_fable",
];

describe("VoiceFace trait hashing", () => {
  it("is deterministic for the same id", () => {
    for (const id of KOKORO_VOICE_IDS) {
      expect(pick(id, 3, HAIR_LONG)).toBe(pick(id, 3, HAIR_LONG));
    }
  });

  it("stays within array bounds for every real Kokoro voice id", () => {
    const arrays: unknown[][] = [
      SKIN_TONES,
      HAIR_COLORS,
      HAIR_LONG,
      HAIR_SHORT,
      EYES,
      MOUTHS,
      ACCESSORIES,
    ];
    for (const id of KOKORO_VOICE_IDS) {
      for (let salt = 0; salt < arrays.length; salt++) {
        const value = pick(id, salt, arrays[salt]);
        expect(arrays[salt]).toContain(value);
      }
    }
  });

  it("produces different trait tuples across most of the voice set", () => {
    const tuples = new Set(
      KOKORO_VOICE_IDS.map((id) =>
        [1, 2, 3, 4, 5, 6].map((salt) => pick(id, salt, [0, 1, 2, 3, 4, 5, 6])).join(",")
      )
    );
    expect(tuples.size).toBeGreaterThan(KOKORO_VOICE_IDS.length * 0.8);
  });
});
