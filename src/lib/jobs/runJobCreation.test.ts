import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/job", () => ({
  createJob: vi.fn(),
  attachGeneratedMaterials: vi.fn(),
  getJobById: vi.fn(),
}));
vi.mock("@/lib/llm/llmService", () => ({
  default: {
    parseJob: vi.fn(),
    analyzeDocument: vi.fn(),
    generateVerifiedTailoredResume: vi.fn(),
    generateTailoredResume: vi.fn(),
    generateCoverLetter: vi.fn(),
  },
}));
vi.mock("@/components/AppShell", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

import { createJob } from "@/actions/job";
import LLMService from "@/lib/llm/llmService";
import { useNotificationStore } from "@/store/notificationStore";
import { ProviderType } from "@/types/llm";

import { startJobCreation } from "./runJobCreation";

const profile = { label: "Default", header: { name: "Test" } } as never;

const baseInput = {
  profile,
  description: "fake job description",
  modelOptions: { model: "gpt-test", provider: ProviderType.OPENAI },
  skipTailoring: false,
  skipVerification: false,
  coverLetterStyle: "professional" as never,
};

async function waitForSettled() {
  const start = Date.now();
  while (Date.now() - start < 5000) {
    const notifications = useNotificationStore.getState().notifications;
    const entry = notifications[0];
    if (entry && (entry.status === "success" || entry.status === "error")) {
      return entry;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("Timed out waiting for notification to settle");
}

describe("runJobCreation", () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
    vi.clearAllMocks();

    vi.mocked(LLMService.parseJob).mockResolvedValue({
      result: {
        job: { job_title: "Engineer" },
        company: { company_name: "Acme" },
        raw_description: "fake job description",
      },
      usage: {},
    } as never);

    vi.mocked(LLMService.analyzeDocument).mockResolvedValue({
      result: { findings: [] },
      usage: {},
    } as never);

    vi.mocked(LLMService.generateVerifiedTailoredResume).mockResolvedValue({
      result: {},
      flags: [],
      atsBefore: 50,
      atsAfter: 80,
    } as never);

    vi.mocked(LLMService.generateCoverLetter).mockResolvedValue({
      result: "cover letter text",
      usage: {},
    } as never);

    vi.mocked(createJob).mockResolvedValue({ jobId: 42 });
  });

  it("reports progress -> success with meta.jobId on completion", async () => {
    startJobCreation(baseInput);

    const entry = await waitForSettled();

    expect(entry.status).toBe("success");
    expect(entry.title).toBe("Acme — Engineer");
    expect(entry.meta).toEqual({ jobId: 42 });
  });

  it("starts with a progress notification before resolving", () => {
    startJobCreation(baseInput);

    const entry = useNotificationStore.getState().notifications[0];
    expect(entry.status).toBe("progress");
    expect(entry.description).toContain("Parsing job description");
  });

  it("reports progress -> error with the failure message when a step throws", async () => {
    vi.mocked(LLMService.analyzeDocument).mockRejectedValue(
      new Error("model unavailable")
    );

    startJobCreation(baseInput);

    const entry = await waitForSettled();

    expect(entry.status).toBe("error");
    expect(entry.description).toBe("model unavailable");
  });
});
