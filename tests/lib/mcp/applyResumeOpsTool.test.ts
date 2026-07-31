import { describe, expect, it, vi } from "vitest";

import { applyResumeOpsTool, McpDeps } from "@/mcp/server";
import { DEFAULT_CUSTOMIZATION } from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

import type { ResumeOp } from "@/lib/resume/editor";

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
  };
}

function makeDeps(resume: ResumeJSON): {
  deps: McpDeps;
  updateResume: ReturnType<typeof vi.fn>;
} {
  const updateResume = vi.fn().mockResolvedValue({ success: true });

  const deps = {
    getResumeByJobId: vi.fn().mockResolvedValue({
      id: 1,
      contentJson: resume,
      customizations: { ...DEFAULT_CUSTOMIZATION, id: 1 },
      atsAnalysis: null,
    }),
    updateResume,
    // Unused by apply_resume_ops — present only to satisfy McpDeps' shape.
    getJob: vi.fn(),
    getCoverLetterByJobId: vi.fn(),
    getAllJob: vi.fn(),
    getProfileById: vi.fn(),
    getAllProfiles: vi.fn(),
    createJob: vi.fn(),
    saveAtsAnalysis: vi.fn(),
    updateCoverLetter: vi.fn(),
  } as unknown as McpDeps;

  return { deps, updateResume };
}

describe("applyResumeOpsTool", () => {
  it("applies valid ops and rejects invalid ones without throwing, in the same call", async () => {
    const resume = makeResume();
    const { deps } = makeDeps(resume);

    const outOfRangeOp: ResumeOp = {
      op: "add",
      path: "/experience/0/achievements/99",
      value: "Out of range.",
    };
    const ops: ResumeOp[] = [
      { op: "replace", path: "/summary", value: "Updated summary." },
      outOfRangeOp,
      { op: "add", path: "/experience/0/achievements/-", value: "Shipped v2." },
    ];

    const result = await applyResumeOpsTool(deps, { jobId: 1, ops });

    expect(result.applied).toHaveLength(2);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].op).toEqual(outOfRangeOp);
    expect(typeof result.rejected[0].reason).toBe("string");
  });

  it("persists via updateResume when at least one op applies", async () => {
    const resume = makeResume();
    const { deps, updateResume } = makeDeps(resume);

    await applyResumeOpsTool(deps, {
      jobId: 1,
      ops: [{ op: "replace", path: "/summary", value: "Updated." }],
    });

    expect(updateResume).toHaveBeenCalledTimes(1);
    expect(updateResume.mock.calls[0][0]).toBe(1);
    expect(updateResume.mock.calls[0][1].summary).toBe("Updated.");
  });

  it("does not persist when every op is rejected", async () => {
    const resume = makeResume();
    const { deps, updateResume } = makeDeps(resume);

    const result = await applyResumeOpsTool(deps, {
      jobId: 1,
      ops: [{ op: "add", path: "/experience/0/achievements/99", value: "x" }],
    });

    expect(result.applied).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(updateResume).not.toHaveBeenCalled();
  });
});
