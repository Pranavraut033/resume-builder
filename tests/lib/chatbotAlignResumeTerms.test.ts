/**
 * Regression: alignResumeTerms's original op-conversion (findingToAlignOp)
 * built a whole-leaf {op:"replace", value: finding.suggestion} for every
 * additive finding. DocumentFinding.original is documented as a VERBATIM
 * SUBSTRING of the resume, not necessarily the entire leaf — the acronym
 * finding shape in deep-analysis.ts explicitly targets an acronym embedded
 * inside a longer bullet. A whole-leaf overwrite in that case silently
 * deletes everything else sharing the leaf. The fix (resolveAlignOp) splices
 * the suggestion into the CURRENT leaf text in place, verified via an
 * exactly-once occurrence check, mirroring applyFixes.ts's lint auto-apply.
 *
 * No LLM call in this path — alignResumeTerms filters/applies findings the
 * caller already has, so no provider mock is needed.
 */
import { LLMProvider } from "@pranavraut033/llm-core";
import { describe, expect, it, vi } from "vitest";

import { IntentLabel } from "@/lib/llm/chat-bot/prompts/intentClassifier";
import { DocumentFinding } from "@/types/documentAnalysis";
import { ProviderType } from "@/types/llm";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

// alignResumeTerms itself never calls the provider (it filters/applies
// findings the caller already has), but initializeSession still resolves
// one via ProviderFactory — so a minimal fake is needed even though nothing
// here ever exercises runLLM/runStructuredLLM.
function makeInertProvider(): LLMProvider {
  return {
    runLLM: vi.fn(),
    runStructuredLLM: vi.fn(),
  } as unknown as LLMProvider;
}

vi.mock("@/lib/llm/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/llm/providers")>();
  return {
    ...actual,
    ProviderFactory: {
      getInstance: vi.fn(async () => makeInertProvider()),
    },
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
      workAuthorization: null,
      nationality: null,
      dateOfBirth: null,
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
        achievements: [
          "Certified as CPA in 2019, later led the finance tooling team.",
        ],
      },
    ],
    projects: [],
    skills: [{ name: "React", category: "Frontend", tier: null }],
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

function makeFinding(overrides: Partial<DocumentFinding>): DocumentFinding {
  return {
    path: "/experience/0/achievements/0",
    original: "CPA",
    suggestion: "Certified Public Accountant (CPA)",
    kind: "keyword",
    severity: "warning",
    why: "JD requires the full form.",
    source: "llm",
    ...overrides,
  };
}

async function makeBot(resume: ResumeJSON) {
  const { default: ResumeChatBot } = await import("@/lib/llm/chat-bot/Chatbot");
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
  return bot;
}

describe("ResumeChatBot.alignResumeTerms", () => {
  it("splices an acronym into its surrounding bullet instead of deleting the rest of it", async () => {
    const resume = makeResume();
    const bot = await makeBot(resume);

    const events = [];
    for await (const event of bot.alignResumeTerms([makeFinding({})])) {
      events.push(event);
    }

    const result = events.find((e) => e.type === "tool_result");
    expect(result).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = (result as any).args.updatedResume as ResumeJSON;

    expect(updated.experience[0].achievements[0]).toBe(
      "Certified as Certified Public Accountant (CPA) in 2019, later led the finance tooling team."
    );
  });

  it("still applies a genuine new insertion (empty original) as an array append", async () => {
    // "add" is only genuinely an insertion against an ARRAY-append path
    // (`/-` or a new index) whose item type is a plain string —
    // experience[].achievements is one; skills (Skill[] objects) and
    // summary (an existing scalar) are not, for two different reasons:
    // "add" on skills would need a full {name, category, tier} object where
    // DocumentFinding.suggestion is always a plain string, and "add" on an
    // EXISTING scalar leaf like /summary REPLACES it per RFC 6902, which is
    // the exact same overwrite hazard resolveAlignOp exists to prevent — see
    // the fix to deep-analysis.ts's worked example, which used to model
    // this incorrectly against /skills/-.
    const resume = makeResume();
    const bot = await makeBot(resume);

    const finding = makeFinding({
      path: "/experience/0/achievements/-",
      original: "",
      suggestion: "Certified Kubernetes Administrator (CKA).",
    });

    const events = [];
    for await (const event of bot.alignResumeTerms([finding])) {
      events.push(event);
    }

    const result = events.find((e) => e.type === "tool_result");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = (result as any).args.updatedResume as ResumeJSON;

    expect(updated.experience[0].achievements).toEqual([
      "Certified as CPA in 2019, later led the finance tooling team.",
      "Certified Kubernetes Administrator (CKA).",
    ]);
  });

  it("drops a finding whose original no longer matches the current leaf, without touching the resume", async () => {
    const resume = makeResume();
    const bot = await makeBot(resume);

    const finding = makeFinding({ original: "text that is not in the bullet" });

    const events = [];
    for await (const event of bot.alignResumeTerms([finding])) {
      events.push(event);
    }

    const result = events.find((e) => e.type === "tool_result");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = (result as any).args;
    expect(args.updatedResume).toEqual(resume);
    expect(args.rejectedCount).toBeGreaterThan(0);
  });

  it("rejects a non-additive finding (rewrite, not a term alignment) before it ever reaches path resolution", async () => {
    const resume = makeResume();
    const bot = await makeBot(resume);

    const finding = makeFinding({
      path: "/experience/0/description",
      original: "Owned the checkout platform.",
      suggestion: "Architected a 40% faster checkout flow.",
    });

    const events = [];
    for await (const event of bot.alignResumeTerms([finding])) {
      events.push(event);
    }

    const result = events.find((e) => e.type === "tool_result");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = (result as any).args;
    expect(args.updatedResume).toEqual(resume);
    expect(args.rejectedCount).toBe(1);
  });

  it("has the IntentLabel.AlignTerms intent on its tool_result event", async () => {
    const resume = makeResume();
    const bot = await makeBot(resume);

    const events = [];
    for await (const event of bot.alignResumeTerms([makeFinding({})])) {
      events.push(event);
    }

    const result = events.find((e) => e.type === "tool_result");
    expect((result as { intent?: string })?.intent).toBe(
      IntentLabel.AlignTerms
    );
  });
});
