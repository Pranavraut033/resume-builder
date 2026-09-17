import { describe, it, expect, vi, beforeEach } from "vitest";
import { matchEmailToJob } from "@/lib/email/jobMatcher";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: {
      findMany: vi.fn(),
    },
  },
}));

describe("matchEmailToJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matches email when classified company matches job company name", async () => {
    vi.mocked(prisma.job.findMany).mockResolvedValue([
      {
        id: 42,
        role: "Frontend Engineer",
        url: "https://stripe.com/jobs/123",
        companyId: 10,
        company: { id: 10, name: "Stripe" },
      },
    ] as any);

    const match = await matchEmailToJob(
      {
        sender: "recruiter@stripe.com",
        subject: "Regarding your application",
        snippet: "We would like to speak with you.",
      },
      {
        isRecruitingEmail: true,
        companyName: "Stripe",
        role: "Frontend Engineer",
        stage: "INTERVIEW",
        confidence: 0.9,
        nextSteps: null,
        actionRequired: true,
      }
    );

    expect(match).not.toBeNull();
    expect(match?.jobId).toBe(42);
    expect(match?.companyId).toBe(10);
  });

  it("matches email by sender domain against job posting url", async () => {
    vi.mocked(prisma.job.findMany).mockResolvedValue([
      {
        id: 101,
        role: "Backend Engineer",
        url: "https://boards.greenhouse.io/datadog/jobs/456",
        companyId: 20,
        company: { id: 20, name: "Datadog" },
      },
    ] as any);

    const match = await matchEmailToJob(
      {
        sender: "recruiting@datadoghq.com",
        subject: "Datadog updates",
        snippet: "Thanks for checking in.",
      },
      {
        isRecruitingEmail: true,
        companyName: null,
        role: "Backend Engineer",
        stage: "INFO",
        confidence: 0.6,
        nextSteps: null,
        actionRequired: false,
      }
    );

    expect(match).not.toBeNull();
    expect(match?.jobId).toBe(101);
  });

  it("returns null if no job matches the email criteria", async () => {
    vi.mocked(prisma.job.findMany).mockResolvedValue([
      {
        id: 7,
        role: "Product Manager",
        url: "https://netflix.com/jobs/1",
        companyId: 5,
        company: { id: 5, name: "Netflix" },
      },
    ] as any);

    const match = await matchEmailToJob(
      {
        sender: "hr@unknownstartup.xyz",
        subject: "Random inquiry",
        snippet: "Hello there",
      },
      {
        isRecruitingEmail: true,
        companyName: "Unknown Startup",
        role: "Account Executive",
        stage: "APPLIED",
        confidence: 0.5,
        nextSteps: null,
        actionRequired: false,
      }
    );

    expect(match).toBeNull();
  });
});
