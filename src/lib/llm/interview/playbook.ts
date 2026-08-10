/**
 * Interview knowledge-base playbook — loaded as a bundled static asset
 * (`public/interview-kb/interview-playbook.md`) rather than hardcoded, so the
 * file can be swapped/grown later without a code change. No embeddings: the
 * search here is deliberately simple title/keyword matching (this KB's own
 * "grep handles it" philosophy) — good enough given the playbook stays in
 * the low hundreds of sections, and it keeps the round trip cheap for the
 * tool-calling loop in `interviewSession.ts`.
 */
import { ToolDefinition } from "@/types/llm";

export interface PlaybookSection {
  title: string;
  content: string;
}

const PLAYBOOK_URL = "/interview-kb/interview-playbook.md";
const MIN_QUERY_WORD_LENGTH = 3;
const MAX_RESULT_SECTIONS = 2;
/**
 * Ceiling on how much playbook text a single search can inject. The whole
 * reason this is a tool call rather than a system-prompt dump is that small
 * local models have limited effective context and degrade on "lost in the
 * middle" recall — returning two full stages unbounded would recreate exactly
 * that problem, and the playbook is expected to grow.
 */
const MAX_RESULT_CHARS = 6000;

/**
 * Splits a markdown document on level-2 (`## `) headings. Each section's
 * `content` runs from its own heading line up to (but not including) the
 * next `## ` heading or end of file — content above the first `## ` heading
 * (e.g. a title/intro) is discarded, there being no section to attach it to.
 */
export function parsePlaybookMarkdown(markdown: string): PlaybookSection[] {
  const lines = markdown.split("\n");
  const sections: PlaybookSection[] = [];

  let title: string | null = null;
  let bodyLines: string[] = [];

  const flush = () => {
    if (title !== null) {
      sections.push({ title, content: bodyLines.join("\n").trim() });
    }
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flush();
      title = line.slice("## ".length).trim();
      bodyLines = [line];
    } else if (title !== null) {
      bodyLines.push(line);
    }
  }
  flush();

  return sections;
}

let cachedPlaybook: Promise<PlaybookSection[]> | null = null;

/**
 * Fetches and parses the bundled playbook, caching the resulting promise at
 * module scope so repeated calls within a session (each interview turn,
 * plus the debrief) don't refetch. A failed fetch/parse clears the cache so
 * a later call can retry rather than permanently caching a rejection.
 */
export function loadInterviewPlaybook(): Promise<PlaybookSection[]> {
  if (!cachedPlaybook) {
    cachedPlaybook = fetch(PLAYBOOK_URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Failed to load interview playbook: ${res.status} ${res.statusText}`
          );
        }
        return res.text();
      })
      .then(parsePlaybookMarkdown)
      .catch((err) => {
        cachedPlaybook = null;
        throw err;
      });
  }
  return cachedPlaybook;
}

function formatMatches(sections: PlaybookSection[]): string {
  const joined = sections
    .slice(0, MAX_RESULT_SECTIONS)
    .map((section) => section.content)
    .join("\n\n---\n\n");

  return joined.length > MAX_RESULT_CHARS
    ? `${joined.slice(0, MAX_RESULT_CHARS)}\n\n[truncated]`
    : joined;
}

/**
 * Case-insensitive, no-embeddings search over parsed playbook sections:
 * 1. If the query substring-matches a section title (either direction),
 *    return that section's (up to 2 matches') content.
 * 2. Otherwise score every section by how many distinct query words
 *    (whitespace-split, words under 3 chars skipped) appear anywhere in its
 *    content, and return the top 1-2 scoring sections (score must be > 0).
 * 3. Otherwise return a clear "no match" string so the model knows to
 *    proceed without playbook grounding rather than silently getting
 *    nothing back.
 */
export function searchPlaybook(
  sections: PlaybookSection[],
  query: string
): string {
  const noMatch = `No matching playbook section found for "${query}".`;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return noMatch;

  const queryLower = trimmedQuery.toLowerCase();

  const titleMatches = sections.filter((section) => {
    const titleLower = section.title.toLowerCase();
    return titleLower.includes(queryLower) || queryLower.includes(titleLower);
  });
  if (titleMatches.length > 0) return formatMatches(titleMatches);

  const queryWords = queryLower
    .split(/\s+/)
    .filter((word) => word.length >= MIN_QUERY_WORD_LENGTH);
  if (queryWords.length === 0) return noMatch;

  const scored = sections
    .map((section) => {
      const contentLower = section.content.toLowerCase();
      const score = queryWords.reduce(
        (count, word) => count + (contentLower.includes(word) ? 1 : 0),
        0
      );
      return { section, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return noMatch;

  return formatMatches(scored.map(({ section }) => section));
}

/**
 * Builds the tool definition the model can call (`toolChoice: "auto"`) to
 * search the playbook mid-interview or mid-debrief. Section titles are
 * listed in the description so the model knows what topics actually exist
 * to search for — the app never forces this call, so an unhelpful/unclear
 * description would just mean it never gets used.
 */
export function buildSearchPlaybookTool(
  sections: PlaybookSection[]
): ToolDefinition {
  const titles = sections.map((section) => section.title).join(", ");

  return {
    name: "search_interview_playbook",
    description:
      "Search a bundled interview-advice playbook for guidance on a specific " +
      "topic or moment in the interview. The playbook is organized into " +
      `stages: ${titles}. Call this only when specific, sourced guidance on ` +
      "one of these topics would meaningfully sharpen your next question, " +
      "acknowledgment, or feedback — not on every turn.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'A short topic or keyword to search for, e.g. "behavioral questions" ' +
            'or "handling a weakness question".',
        },
      },
      required: ["query"],
    },
  };
}
