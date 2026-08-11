import { describe, expect, it, vi } from "vitest";

import {
  applyProfileEditTool,
  getProfileTool,
  McpDeps,
  previewProfileEditTool,
} from "@/mcp/server";
import { ResumeJSON } from "@/types/resume";

import type { ResumeOp } from "@/lib/resume/editor";

function makeProfile(
  overrides: Partial<ResumeJSON> = {}
): ResumeJSON & { label: string } {
  return {
    label: "Default Profile",
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
      photoDataUrl: null,
    },
    summary: "Senior backend engineer.",
    experience: [],
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

function makeDeps(profile: ReturnType<typeof makeProfile> | null): {
  deps: McpDeps;
  updateProfile: ReturnType<typeof vi.fn>;
  getAllProfiles: ReturnType<typeof vi.fn>;
} {
  const updateProfile = vi.fn().mockResolvedValue({ success: true });
  const getAllProfiles = vi
    .fn()
    .mockResolvedValue(
      profile ? [{ id: 1, label: profile.label, name: "", email: "" }] : []
    );

  const deps = {
    getProfileById: vi.fn().mockResolvedValue(profile),
    getAllProfiles,
    updateProfile,
    // Unused by these tools — present only to satisfy McpDeps' shape.
    getJob: vi.fn(),
    getResumeByJobId: vi.fn(),
    getCoverLetterByJobId: vi.fn(),
    getAllJob: vi.fn(),
    createJob: vi.fn(),
    findJobByUrl: vi.fn(),
    updateResume: vi.fn(),
    saveAtsAnalysis: vi.fn(),
    updateCoverLetter: vi.fn(),
  } as unknown as McpDeps;

  return { deps, updateProfile, getAllProfiles };
}

describe("getProfileTool", () => {
  it("returns the full profile (label split out) plus pathLines", async () => {
    const profile = makeProfile();
    const { deps } = makeDeps(profile);

    const result = await getProfileTool(deps, { profileId: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profileId).toBe(1);
    expect(result.label).toBe("Default Profile");
    expect(result.profile).not.toHaveProperty("label");
    expect(result.pathLines).toContain('/header/name: "Jamie Rivera"');
  });

  it("defaults to the first profile when profileId is omitted", async () => {
    const profile = makeProfile();
    const { deps, getAllProfiles } = makeDeps(profile);

    const result = await getProfileTool(deps, {});

    expect(getAllProfiles).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.profileId).toBe(1);
  });

  it("returns an error when no profile exists", async () => {
    const { deps } = makeDeps(null);

    const result = await getProfileTool(deps, {});

    expect(result.ok).toBe(false);
  });
});

describe("previewProfileEditTool", () => {
  it("returns a diff without persisting anything", async () => {
    const profile = makeProfile();
    const { deps, updateProfile } = makeDeps(profile);

    const ops: ResumeOp[] = [
      { op: "replace", path: "/summary", value: "Updated summary." },
    ];
    const result = await previewProfileEditTool(deps, { profileId: 1, ops });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
    expect(result.after.summary).toBe("Updated summary.");
    expect(result.before.summary).toBe("Senior backend engineer.");
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("reports rejected ops without throwing", async () => {
    const profile = makeProfile();
    const { deps } = makeDeps(profile);

    const badOp: ResumeOp = {
      op: "add",
      path: "/experience/0/achievements/99",
      value: "x",
    };
    const result = await previewProfileEditTool(deps, {
      profileId: 1,
      ops: [badOp],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].op).toEqual(badOp);
  });
});

describe("applyProfileEditTool", () => {
  it("refuses to write without confirm: true", async () => {
    const profile = makeProfile();
    const { deps, updateProfile } = makeDeps(profile);

    const result = await applyProfileEditTool(deps, {
      profileId: 1,
      ops: [{ op: "replace", path: "/summary", value: "Updated." }],
      confirm: false,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/confirm: true/);
    expect(result.error).toMatch(/Backup & Restore/);
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("persists via updateProfile when confirm: true and at least one op applies", async () => {
    const profile = makeProfile();
    const { deps, updateProfile } = makeDeps(profile);

    const result = await applyProfileEditTool(deps, {
      profileId: 1,
      ops: [{ op: "replace", path: "/summary", value: "Updated." }],
      confirm: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.persisted).toBe(true);
    expect(result.backupWarning).toMatch(/Backup & Restore/);
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile.mock.calls[0][0]).toBe(1);
    expect(updateProfile.mock.calls[0][1].summary).toBe("Updated.");
    expect(updateProfile.mock.calls[0][2]).toBe("Default Profile");
  });

  it("does not persist when every op is rejected, even with confirm: true", async () => {
    const profile = makeProfile();
    const { deps, updateProfile } = makeDeps(profile);

    const result = await applyProfileEditTool(deps, {
      profileId: 1,
      ops: [{ op: "add", path: "/experience/0/achievements/99", value: "x" }],
      confirm: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.persisted).toBe(false);
    expect(result.applied).toHaveLength(0);
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("returns an error for an unknown profileId", async () => {
    const { deps } = makeDeps(null);

    const result = await applyProfileEditTool(deps, {
      profileId: 999,
      ops: [{ op: "replace", path: "/summary", value: "Updated." }],
      confirm: true,
    });

    expect(result.ok).toBe(false);
  });
});
