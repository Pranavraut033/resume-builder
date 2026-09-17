import { describe, it, expect, vi, beforeEach } from "vitest";

import type { ClassifiedEmailInput } from "@/actions/emailSync";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailAccount: { update: vi.fn().mockResolvedValue({}) },
    jobEmail: { create: vi.fn() },
    job: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

const { prisma } = await import("@/lib/prisma");
const { persistClassifiedEmails } = await import("@/actions/emailSync");

function row(
  overrides: Partial<ClassifiedEmailInput> = {}
): ClassifiedEmailInput {
  return {
    messageId: "msg-1",
    sender: "recruiter@stripe.com",
    subject: "Update",
    snippet: "snippet",
    receivedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    classification: {
      isRecruitingEmail: true,
      companyName: "Stripe",
      role: "Engineer",
      stage: "INTERVIEW",
      confidence: 0.9,
      nextSteps: null,
      actionRequired: true,
    },
    ...overrides,
  };
}

const candidateJob = {
  id: 42,
  role: "Engineer",
  url: "https://stripe.com",
  companyId: 10,
  company: { id: 10, name: "Stripe" },
};

describe("persistClassifiedEmails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.job.findMany).mockResolvedValue([candidateJob] as never);
    vi.mocked(prisma.jobEmail.create).mockResolvedValue({} as never);
  });

  it("skips rows the classifier marked as non-recruiting", async () => {
    const result = await persistClassifiedEmails(1, [
      row({
        classification: { ...row().classification, isRecruitingEmail: false },
      }),
    ]);

    expect(prisma.jobEmail.create).not.toHaveBeenCalled();
    expect(result.created).toBe(0);
  });

  it("isolates a per-row failure — one bad row doesn't abort the batch", async () => {
    vi.mocked(prisma.jobEmail.create)
      .mockRejectedValueOnce(new Error("unique constraint"))
      .mockResolvedValueOnce({} as never);

    const result = await persistClassifiedEmails(1, [
      row({ messageId: "bad" }),
      row({ messageId: "good" }),
    ]);

    expect(result.created).toBe(1);
    expect(result.failedMessageIds).toEqual(["bad"]);
    // lastSyncedAt still advances despite the partial failure.
    expect(prisma.emailAccount.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { lastSyncedAt: expect.any(Date) },
    });
  });

  it.each([
    ["APPLIED", "INTERVIEW", "INTERVIEW"],
    ["DRAFT", "INTERVIEW", "INTERVIEW"],
    ["INTERVIEW", "INTERVIEW", null], // no-op, not a transition Google cares about
    ["APPLIED", "OFFER", "OFFER"],
    ["OFFER", "OFFER", null], // already OFFER, no update
    ["APPLIED", "REJECTED", "REJECTED"],
    ["OFFER", "REJECTED", null], // an offer never regresses to rejected
  ])(
    "job at %s + stage %s -> %s",
    async (currentStatus, stage, expectedNewStatus) => {
      vi.mocked(prisma.job.findUnique).mockResolvedValue({
        status: currentStatus,
      } as never);

      await persistClassifiedEmails(1, [
        row({
          classification: {
            ...row().classification,
            stage: stage as "INTERVIEW" | "OFFER" | "REJECTED",
            confidence: 0.9,
          },
        }),
      ]);

      if (expectedNewStatus) {
        expect(prisma.job.update).toHaveBeenCalledWith({
          where: { id: candidateJob.id },
          data: { status: expectedNewStatus },
        });
      } else {
        expect(prisma.job.update).not.toHaveBeenCalled();
      }
    }
  );

  it("does not apply a status transition below the confidence threshold", async () => {
    vi.mocked(prisma.job.findUnique).mockResolvedValue({
      status: "APPLIED",
    } as never);

    await persistClassifiedEmails(1, [
      row({
        classification: {
          ...row().classification,
          stage: "INTERVIEW",
          confidence: 0.5,
        },
      }),
    ]);

    expect(prisma.job.update).not.toHaveBeenCalled();
  });
});
