import { describe, it, expect, vi, beforeEach } from "vitest";

import type { ClassifiedEmailInput } from "@/actions/emailSync";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailAccount: {
      update: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn(),
    },
    jobEmail: { create: vi.fn(), count: vi.fn() },
    jobListing: { findMany: vi.fn(), createMany: vi.fn() },
    job: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

const { prisma } = await import("@/lib/prisma");
const { persistClassifiedEmails, getEmailSyncStatus } =
  await import("@/actions/emailSync");

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
      kind: "APPLICATION",
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

  it("stores the extracted company and role even when no tracked job matches", async () => {
    vi.mocked(prisma.job.findMany).mockResolvedValue([]);

    await persistClassifiedEmails(1, [
      row({
        sender: "LinkedIn <jobs-noreply@linkedin.com>",
        classification: {
          ...row().classification,
          companyName: "Jobgether",
          role: null,
        },
      }),
    ]);

    expect(prisma.jobEmail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyName: "Jobgether",
        jobId: null,
      }),
    });
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

  describe("job-alert digests", () => {
    const alertRow = (listings: ClassifiedEmailInput["listings"]) =>
      row({
        sender: "LinkedIn <jobalerts-noreply@linkedin.com>",
        subject: "New jobs: Interview Coach at Stripe",
        classification: {
          ...row().classification,
          kind: "ALERT",
          stage: null,
          actionRequired: false,
        },
        listings,
      });
    const listing = (id: number) => ({
      title: `Role ${id}`,
      companyName: "Stripe",
      location: "Berlin",
      url: `https://www.linkedin.com/jobs/view/${id}`,
      source: "linkedin",
      postedText: null,
    });

    beforeEach(() => {
      vi.mocked(prisma.jobEmail.create).mockResolvedValue({ id: 7 } as never);
      vi.mocked(prisma.jobListing.findMany).mockResolvedValue([]);
    });

    it("never matches a job or changes its status", async () => {
      await persistClassifiedEmails(1, [alertRow([listing(1)])]);

      expect(prisma.jobEmail.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ kind: "ALERT" }),
      });
      const { data } = vi.mocked(prisma.jobEmail.create).mock.calls[0][0];
      expect(data).not.toHaveProperty("jobId");
      expect(prisma.job.update).not.toHaveBeenCalled();
    });

    it("saves only listings it has not seen, linked to the digest row", async () => {
      vi.mocked(prisma.jobListing.findMany).mockResolvedValue([
        { url: listing(1).url },
      ] as never);

      const result = await persistClassifiedEmails(1, [
        alertRow([listing(1), listing(2)]),
      ]);

      expect(result.created).toBe(1);
      expect(result.listingsCreated).toBe(1);
      expect(prisma.jobListing.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ url: listing(2).url, jobEmailId: 7 })],
      });
    });

    it("skips the listing insert when every posting is already known", async () => {
      vi.mocked(prisma.jobListing.findMany).mockResolvedValue([
        { url: listing(1).url },
      ] as never);

      const result = await persistClassifiedEmails(1, [alertRow([listing(1)])]);

      expect(result.listingsCreated).toBe(0);
      expect(prisma.jobListing.createMany).not.toHaveBeenCalled();
    });
  });

  describe("getEmailSyncStatus", () => {
    const account = { email: "me@gmail.com", lastSyncedAt: null };

    it("still reports the account as connected when a count throws", async () => {
      vi.mocked(prisma.emailAccount.findFirst).mockResolvedValue(
        account as never
      );
      vi.mocked(prisma.jobEmail.count).mockRejectedValue(new Error("boom"));

      // A stale Prisma client (no jobListing model) throws synchronously, too.
      await expect(getEmailSyncStatus()).resolves.toMatchObject({
        hasAccount: true,
        email: "me@gmail.com",
        totalEmails: 0,
        totalListings: 0,
      });
    });

    it("reports no account when the lookup itself fails", async () => {
      vi.mocked(prisma.emailAccount.findFirst).mockRejectedValue(
        new Error("db down")
      );
      await expect(getEmailSyncStatus()).resolves.toMatchObject({
        hasAccount: false,
      });
    });
  });
});
