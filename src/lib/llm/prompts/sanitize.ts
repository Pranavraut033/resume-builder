/**
 * Fence-defusal for untrusted text embedded into Handlebars prompt templates.
 *
 * `src/lib/llm/prompts/` wraps untrusted values (job descriptions, resumes,
 * free-text user input, LLM output fed back in) in `---`-fenced (or
 * ` ```json `-fenced) blocks before interpolating them with `{{{...}}}`
 * (unescaped). The Handlebars resolver in `@pranavraut033/llm-core` runs with
 * `noEscape: true`, so the value is emitted byte-for-byte — nothing strips a
 * literal fence-delimiter line out of the untrusted value first. A job
 * description or resume that itself contains a line that is exactly `---`
 * (a common markdown horizontal rule) or a code fence closes the wrapping
 * fence early; everything after it is then read by the model as top-level
 * prompt instructions rather than data.
 *
 * `sanitizeUntrustedText` neutralizes any line that, once trimmed, is
 * *solely* a run of 3+ dashes or 3+ backticks (optionally followed by a fence
 * language tag, e.g. ` ```json `) by backslash-escaping each delimiter
 * character. This does not attempt full markdown fidelity (no DOMPurify-style
 * parsing) — it only needs to guarantee the exact-match fence line can never
 * survive untouched, so it can't prematurely close/open a fence.
 *
 * Apply this at the point an untrusted string is serialized into a prompt,
 * before it is handed to the template resolver — see `normalizedFieldsToString`
 * in `./index.ts` and the `*CompactPositional` serializers in
 * `@/types/resume`.
 */

// A line that is nothing but 3+ dashes (a markdown horizontal rule / our own
// `---` fence marker).
const DASH_FENCE_LINE = /^-{3,}$/;
// A line that is nothing but 3+ backticks, optionally followed by a fence
// language tag (e.g. ```json, ```ts).
const BACKTICK_FENCE_LINE = /^`{3,}[a-zA-Z0-9_-]*$/;

function escapeFenceChars(line: string): string {
  return line.replace(/[-`]/g, (ch) => `\\${ch}`);
}

/**
 * Escape standalone delimiter lines (`---`, ` ``` `, ` ```json `, etc.) in
 * untrusted text so they can no longer close/open a fence when embedded
 * verbatim into a prompt template. Preserves everything else byte-for-byte,
 * including leading/trailing whitespace on the line and the surrounding
 * null/undefined/empty-string-ness of the input.
 */
export function sanitizeUntrustedText<T extends string | null | undefined>(
  input: T
): T {
  if (!input) return input;

  return input
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (DASH_FENCE_LINE.test(trimmed) || BACKTICK_FENCE_LINE.test(trimmed)) {
        return line.replace(trimmed, escapeFenceChars(trimmed));
      }
      return line;
    })
    .join("\n") as T;
}
