/**
 * `parsePlaybookMarkdown` and `searchPlaybook` are pure, no-LLM-call
 * functions — this exercises them against the real bundled
 * `public/interview-kb/interview-playbook.md` (read from disk rather than
 * `fetch`, since `loadInterviewPlaybook`'s network fetch isn't what's under
 * test here) so a KB rewrite that breaks the heading structure or search
 * behavior is caught without a live LLM call.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  parsePlaybookMarkdown,
  searchPlaybook,
} from "@/lib/llm/interview/playbook";

const PLAYBOOK_PATH = path.join(
  process.cwd(),
  "public/interview-kb/interview-playbook.md"
);

function loadPlaybookMarkdown(): string {
  return readFileSync(PLAYBOOK_PATH, "utf-8");
}

describe("parsePlaybookMarkdown", () => {
  it("splits the bundled playbook into its 13 level-2-heading sections, in order", () => {
    const sections = parsePlaybookMarkdown(loadPlaybookMarkdown());

    expect(sections.map((s) => s.title)).toEqual([
      "Stage 0 — Application and resume",
      "Stage 1 — Prep",
      "Stage 2 — The first 30 seconds",
      'Stage 3 — "Tell me about yourself"',
      "Stage 4 — Behavioral questions",
      "Stage 5 — The dangerous questions",
      "Stage 6 — Not knowing the answer",
      "Stage 7 — The technical / coding round",
      "Stage 8 — Rapport, and who is actually in the room",
      "Stage 9 — Your questions at the end",
      "Stage 10 — Salary and follow-up",
      "Where the sources disagree",
      "Claims flagged as unverified in the source notes",
    ]);
  });

  it("gives every section non-empty content that starts with its own heading line", () => {
    const sections = parsePlaybookMarkdown(loadPlaybookMarkdown());

    for (const section of sections) {
      expect(section.content.length).toBeGreaterThan(0);
      expect(section.content.startsWith(`## ${section.title}`)).toBe(true);
    }
  });

  it("does not leak a later section's heading into an earlier section's content", () => {
    const sections = parsePlaybookMarkdown(loadPlaybookMarkdown());
    const behavioral = sections.find((s) =>
      s.title.includes("Behavioral questions")
    );

    expect(behavioral).toBeDefined();
    expect(behavioral!.content).not.toContain(
      "## Stage 5 — The dangerous questions"
    );
  });

  it("returns an empty array for a document with no level-2 headings", () => {
    expect(parsePlaybookMarkdown("# Title\n\nSome intro text.\n")).toEqual([]);
  });
});

describe("searchPlaybook", () => {
  const sections = parsePlaybookMarkdown(loadPlaybookMarkdown());

  it("returns the matching stage's content for a title-matching query", () => {
    const result = searchPlaybook(sections, "behavioral");

    expect(result).toContain("## Stage 4 — Behavioral questions");
    expect(result).toContain("STAR");
  });

  it("falls back to keyword-overlap scoring and surfaces the weakness/dangerous-questions stage", () => {
    const result = searchPlaybook(sections, "weakness answer");

    expect(result).toContain("## Stage 5 — The dangerous questions");
  });

  it("returns a clear no-match string for a query that hits nothing", () => {
    const result = searchPlaybook(
      sections,
      "xyzzy quokka nonexistent gibberish"
    );

    expect(result).toBe(
      'No matching playbook section found for "xyzzy quokka nonexistent gibberish".'
    );
  });

  it("returns a clear no-match string for an empty/whitespace-only query", () => {
    expect(searchPlaybook(sections, "   ")).toBe(
      'No matching playbook section found for "   ".'
    );
  });
});
