/**
 * Live probe for the chat "edit" intent against a real OpenAI model:
 * classifyIntent → extract_fields_to_edit → forced edit_resume tool call →
 * applyResumeOps, exactly the chain ResumeChatBot.runEditIntent drives.
 * Existing coverage of this path (chatbotEditResume.test.ts) mocks the
 * provider and only proves the plumbing; this proves a real model correctly
 * maps typo'd/bad-grammar instructions onto the right resume field.
 *
 * Opt-in only — real API calls cost money. Skips automatically unless
 * OPENAI_API_KEY is set, so `npm run test:run` / CI stay green at zero cost.
 */
import { LLMProvider } from "@pranavraut033/llm-core";
import { describe, expect, it, vi } from "vitest";

import { ChatStreamEvent } from "@/lib/llm/chat-bot/Chatbot";
import { ProviderType } from "@/types/llm";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

const MODEL = "gpt-4o-mini";

vi.mock("@/lib/llm/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/llm/providers")>();
  const { getProviderInstance } = await import("@pranavraut033/llm-core");
  await import("@pranavraut033/llm-core/providers/register-builtins");
  const provider = await getProviderInstance("openai", {
    keyResolver: async () => process.env.OPENAI_API_KEY,
  });
  return {
    ...actual,
    ProviderFactory: { getInstance: vi.fn(async () => provider) },
  };
});

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

function makeResume(): ResumeJSON {
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
    summary: "Backend engineer with 5 years experience in Python and Django.",
    experience: [
      {
        company: "Acme Corp",
        role: "Senior Engineer",
        startDate: "2020",
        endDate: "2021",
        description: "Owned the checkout platform.",
        achievements: [
          "Cut checkout latency 40%.",
          "Mentored two junior engineers.",
        ],
      },
    ],
    projects: [],
    skills: [
      { name: "Python", category: null, tier: "primary" },
      { name: "AWS", category: null, tier: "primary" },
    ],
    education: [],
    certifications: [],
    publications: null,
    languages: null,
    volunteer: null,
    awards: null,
    hobbies: null,
    sectionLayout: null,
  } as ResumeJSON;
}

async function runEdit(
  resume: ResumeJSON,
  userInput: string
): Promise<{ events: ChatStreamEvent[]; updatedResume?: ResumeJSON }> {
  const { default: ResumeChatBot } = await import("@/lib/llm/chat-bot/Chatbot");

  const bot = new ResumeChatBot(
    ProviderType.OPENAI,
    MODEL,
    resume,
    JOB_DETAILS,
    resume
  );
  await bot.initializeSession(MODEL, resume, JOB_DETAILS, ProviderType.OPENAI);

  const events: ChatStreamEvent[] = [];
  for await (const event of bot.chat(userInput, {
    provider: ProviderType.OPENAI,
    model: MODEL,
  })) {
    events.push(event);
  }

  const toolResult = events.find(
    (e) => e.type === "tool_result" && e.intent === "edit"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatedResume = (toolResult as any)?.args?.updatedResume as
    | ResumeJSON
    | undefined;

  return { events, updatedResume };
}

function expectCleanCompletion(events: ChatStreamEvent[]) {
  expect(events.some((e) => e.type === "error")).toBe(false);
  expect(events.at(-1)?.type).toBe("done");
  expect(
    events.some((e) => e.type === "tool_result" && e.intent === "edit")
  ).toBe(true);
}

describe.skipIf(!process.env.OPENAI_API_KEY)(
  "ResumeChatBot edit intent (live, OpenAI, messy input)",
  () => {
    describe("happy path", () => {
      it("adds a named skill", async () => {
        const resume = makeResume();
        const { events, updatedResume } = await runEdit(
          resume,
          "Add Kubernetes to my skills list"
        );

        expectCleanCompletion(events);
        expect(
          updatedResume?.skills.some((s) => /kubernetes/i.test(s.name))
        ).toBe(true);
      }, 60_000);

      it("rewrites the summary", async () => {
        const resume = makeResume();
        const { events, updatedResume } = await runEdit(
          resume,
          "Rewrite my summary to mention I have experience leading teams"
        );

        expectCleanCompletion(events);
        expect(updatedResume?.summary).toBeTruthy();
        expect(updatedResume?.summary).not.toBe(resume.summary);
      }, 60_000);
    });

    describe("messy grammar / typos", () => {
      it("typo'd summary edit still lands on summary", async () => {
        const resume = makeResume();
        const { events, updatedResume } = await runEdit(
          resume,
          "can u fix my sumary section its rly bad make it soundbetter"
        );

        expectCleanCompletion(events);
        expect(updatedResume?.summary).not.toBe(resume.summary);
      }, 60_000);

      it("bad-grammar skills edit adds the named skill", async () => {
        const resume = makeResume();
        const { events, updatedResume } = await runEdit(
          resume,
          "the skils part not good need add docker asap"
        );

        expectCleanCompletion(events);
        expect(updatedResume?.skills.some((s) => /docker/i.test(s.name))).toBe(
          true
        );
      }, 60_000);

      it("typo'd achievement edit changes experience achievements", async () => {
        const resume = makeResume();
        const { events, updatedResume } = await runEdit(
          resume,
          "pls make my achevments at acme corp sound more impresive"
        );

        expectCleanCompletion(events);
        expect(updatedResume?.experience[0]?.achievements).not.toEqual(
          resume.experience[0].achievements
        );
      }, 60_000);

      it("run-on headline edit updates the headline", async () => {
        const resume = makeResume();
        const { events, updatedResume } = await runEdit(
          resume,
          "change headline to senior backend engineer i think its outdated rn"
        );

        expectCleanCompletion(events);
        expect(updatedResume?.header.headline).not.toBe(resume.header.headline);
        expect(updatedResume?.header.headline).toMatch(
          /senior backend engineer/i
        );
      }, 60_000);
    });

    describe("edge cases", () => {
      it("multi-field messy instruction touches both named fields", async () => {
        const resume = makeResume();
        const { events, updatedResume } = await runEdit(
          resume,
          "fix bothh my sumary and skils section their outdated add react to skils"
        );

        expectCleanCompletion(events);
        expect(updatedResume?.summary).not.toBe(resume.summary);
        expect(updatedResume?.skills.some((s) => /react/i.test(s.name))).toBe(
          true
        );
      }, 60_000);

      it("ultra-terse instruction still completes cleanly", async () => {
        const resume = makeResume();
        const { events } = await runEdit(resume, "fix summary");

        expectCleanCompletion(events);
      }, 60_000);
    });
  }
);
