/**
 * Regression for the applyEdits/applyResumeOps migration: an edit_resume
 * tool call can name a path that doesn't resolve (out-of-range index,
 * unknown field) alongside otherwise-valid ops. Before the migration to
 * path-based ops, Chatbot.applyEdits threw on any invalid field content and
 * aborted the whole turn. Now a bad op must land in the tool_result note's
 * rejected-ops summary while the turn still completes normally (`done`),
 * and every other valid op in the same batch must still apply.
 */
import { LLMProvider } from "@pranavraut033/llm-core";
import { describe, expect, it, vi } from "vitest";

import { ProviderType } from "@/types/llm";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

// mergeLLMUsageInfo (used by runEditIntent to combine the extract + edit
// call usage) requires provider/model/purpose — unlike the plain
// `{promptTokens, completionTokens}` fixtures used elsewhere in this repo's
// tests, which never flow through a merge.
const USAGE = {
  promptTokens: 10,
  completionTokens: 10,
  provider: "openai",
  model: "test-model",
  purpose: "generate_text",
};

const JOB_DETAILS = {
  job: {},
  company: {},
  location: {},
  responsibilities: {},
  requirements: {},
  nice_to_have: {},
  tech_stack: {},
  benefits: {},
  contact: {},
  raw_description: "",
} as unknown as JobDetailsJSON;

function makeResume(overrides: Partial<ResumeJSON> = {}): ResumeJSON {
  return {
    header: {
      name: "Jamie Rivera",
      headline: "Backend Engineer",
      email: "jamie@example.com",
      phone: "555-0100",
      location: "Berlin, DE",
      linkedin: null,
      github: null,
      website: null,
      photoDataUrl: null,
    },
    summary: "Senior backend engineer.",
    experience: [
      {
        company: "Acme Corp",
        role: "Senior Engineer",
        startDate: "2020",
        endDate: "2021",
        description: "Owned the checkout platform.",
        achievements: ["Cut checkout latency 40%."],
      },
    ],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
    publications: null,
    languages: null,
    volunteer: null,
    awards: null,
    hobbies: null,
    sectionLayout: null,
    ...overrides,
  } as ResumeJSON;
}

// Fake provider: intent classification and extract-fields-to-edit go through
// runStructuredLLM/runLLM without tools; the actual edit call is the runLLM
// invocation with `tools` set — force it to return one valid op (replace the
// summary) and one op targeting a nonexistent path (out-of-range experience
// index) in the same tool call.
function makeEditProvider(): LLMProvider {
  return {
    runLLM: vi.fn(async (_messages: unknown, options: { tools?: unknown }) => {
      if (options?.tools) {
        return {
          toolCalls: [
            {
              id: "call_1",
              name: "edit_resume",
              arguments: {
                ops: [
                  {
                    op: "replace",
                    path: "/summary",
                    value: "Updated summary.",
                  },
                  {
                    op: "replace",
                    path: "/experience/99/company",
                    value: "Nonexistent",
                  },
                ],
                change_summary: "Shortened summary as requested.",
              },
            },
          ],
          usage: USAGE,
        };
      }
      // Intent classification call.
      return { result: "edit", usage: USAGE };
    }),
    runStructuredLLM: vi.fn(async () => ({
      result: { edits: [{ field: "summary", change: "shorten it" }] },
      usage: USAGE,
    })),
  } as unknown as LLMProvider;
}

vi.mock("@/lib/llm/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/llm/providers")>();
  return {
    ...actual,
    ProviderFactory: {
      getInstance: vi.fn(async () => makeEditProvider()),
    },
  };
});

describe("ResumeChatBot edit intent — invalid op handling", () => {
  it("reports an unresolvable op in the tool_result note and still completes (done), applying the valid op alongside it", async () => {
    const { default: ResumeChatBot } =
      await import("@/lib/llm/chat-bot/Chatbot");

    const resume = makeResume();
    const bot = new ResumeChatBot(
      ProviderType.OPENAI,
      "test-model",
      resume,
      JOB_DETAILS,
      resume
    );

    await bot.initializeSession(
      "test-model",
      resume,
      JOB_DETAILS,
      ProviderType.OPENAI
    );

    const events = [];
    for await (const event of bot.chat("shorten my summary", {
      provider: ProviderType.OPENAI,
      model: "test-model",
    })) {
      events.push(event);
    }

    // The turn must complete instead of throwing/erroring.
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(events.at(-1)?.type).toBe("done");

    const toolResult = events.find(
      (e) => e.type === "tool_result" && e.intent === "edit"
    );
    expect(toolResult).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = (toolResult as any).args;

    // The valid op applied.
    expect(args.updatedResume.summary).toBe("Updated summary.");
    // The invalid op is reported in the note instead of throwing.
    expect(args.note).toMatch(/could not be applied/i);
    expect(args.note).toContain("/experience/99/company");
  });
});
