import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncEmails } from "@/lib/email/emailSyncService";
import { prisma } from "@/lib/prisma";
import * as gmailClient from "@/lib/email/gmailClient";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailAccount: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    jobEmail: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    job: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/gmailClient", () => ({
  getValidAccessToken: vi.fn(),
  getGoogleUserInfo: vi.fn(),
  fetchRecruitingEmails: vi.fn(),
}));

describe("syncEmails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_CONNECTED when access token is missing", async () => {
    vi.mocked(gmailClient.getValidAccessToken).mockResolvedValue(null);

    const result = await syncEmails();

    expect(result.success).toBe(false);
    expect(result.status).toBe("NOT_CONNECTED");
    expect(result.newEmailsCount).toBe(0);
  });

  it("successfully syncs and creates email records", async () => {
    vi.mocked(gmailClient.getValidAccessToken).mockResolvedValue("mock_token_123");
    vi.mocked(prisma.emailAccount.findFirst).mockResolvedValue({
      id: 1,
      email: "candidate@example.com",
      lastSyncedAt: new Date(Date.now() - 3600 * 1000),
      isActive: true,
    } as Awaited<ReturnType<typeof prisma.emailAccount.findFirst>>);

    vi.mocked(gmailClient.fetchRecruitingEmails).mockResolvedValue([
      {
        messageId: "msg_abc123",
        threadId: "thread_xyz",
        sender: "recruiter@stripe.com",
        recipient: "candidate@example.com",
        subject: "Interview with Stripe",
        snippet: "Let's schedule a call.",
        date: new Date(),
      },
    ]);

    vi.mocked(prisma.jobEmail.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.job.findMany).mockResolvedValue([
      {
        id: 10,
        role: "Software Engineer",
        url: "https://stripe.com",
        companyId: 5,
        company: { id: 5, name: "Stripe" },
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.job.findMany>>);
    vi.mocked(prisma.job.findUnique).mockResolvedValue({
      status: "APPLIED",
    } as Awaited<ReturnType<typeof prisma.job.findUnique>>);

    const result = await syncEmails();

    expect(result.success).toBe(true);
    expect(result.status).toBe("OK");
    expect(result.newEmailsCount).toBe(1);
    expect(result.matchedJobsCount).toBe(1);
    expect(prisma.jobEmail.create).toHaveBeenCalledTimes(1);
  });
});
