import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/actions/emailSync", () => ({
  getSyncCursor: vi.fn(),
  filterNewMessageIds: vi.fn(),
  persistClassifiedEmails: vi.fn(),
}));

vi.mock("@/lib/email/gmailClient", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/email/gmailClient")
  >("@/lib/email/gmailClient");
  return {
    ...actual,
    getValidAccessToken: vi.fn(),
    fetchRecruitingEmails: vi.fn(),
  };
});

vi.mock("@/lib/llm/emailClassifier", () => ({
  classifyEmail: vi.fn(),
}));

vi.mock("@/components/AppShell", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

const { getSyncCursor, filterNewMessageIds, persistClassifiedEmails } =
  await import("@/actions/emailSync");
const {
  getValidAccessToken,
  fetchRecruitingEmails,
  GoogleReauthRequiredError,
} = await import("@/lib/email/gmailClient");
const { classifyEmail } = await import("@/lib/llm/emailClassifier");
const { runEmailSync } = await import("@/lib/email/runEmailSync");
const { useNotificationStore } = await import("@/store/notificationStore");

function fakeMessage(overrides: Record<string, unknown> = {}) {
  return {
    messageId: "msg-1",
    threadId: "thread-1",
    sender: "recruiter@stripe.com",
    recipient: "me@example.com",
    subject: "Interview",
    snippet: "snippet",
    bodyText: "body",
    date: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("runEmailSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.getState().clear();
  });

  it("short-circuits with NOT_CONNECTED when there is no access token", async () => {
    vi.mocked(getValidAccessToken).mockResolvedValue(null);

    const result = await runEmailSync(true);

    expect(result.status).toBe("NOT_CONNECTED");
    expect(getSyncCursor).not.toHaveBeenCalled();
  });

  it("surfaces NEEDS_REAUTH distinctly when the token requires reconnect", async () => {
    vi.mocked(getValidAccessToken).mockRejectedValue(
      new GoogleReauthRequiredError()
    );

    const result = await runEmailSync(true);

    expect(result.status).toBe("NEEDS_REAUTH");
  });

  it("never sends a non-recruiting email to persistClassifiedEmails", async () => {
    vi.mocked(getValidAccessToken).mockResolvedValue("token");
    vi.mocked(getSyncCursor).mockResolvedValue({
      accountId: 1,
      lastSyncedAt: null,
    });
    vi.mocked(fetchRecruitingEmails).mockResolvedValue([
      fakeMessage({ messageId: "recruiting" }) as never,
      fakeMessage({ messageId: "spam" }) as never,
    ]);
    vi.mocked(filterNewMessageIds).mockResolvedValue(["recruiting", "spam"]);
    // classifyEmail doesn't receive the messageId, so key off call order
    // (messages are classified in the order fetchRecruitingEmails returned).
    vi.mocked(classifyEmail)
      .mockResolvedValueOnce({
        isRecruitingEmail: true,
        companyName: "Stripe",
        role: null,
        stage: "INTERVIEW",
        confidence: 0.9,
        nextSteps: null,
        actionRequired: true,
      })
      .mockResolvedValueOnce({
        isRecruitingEmail: false,
        companyName: null,
        role: null,
        stage: null,
        confidence: 0.2,
        nextSteps: null,
        actionRequired: false,
      });
    vi.mocked(persistClassifiedEmails).mockResolvedValue({
      created: 1,
      matchedJobIds: [42],
      failedMessageIds: [],
    });

    await runEmailSync(true);

    expect(persistClassifiedEmails).toHaveBeenCalledTimes(1);
    const [, rows] = vi.mocked(persistClassifiedEmails).mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0].messageId).toBe("recruiting");
  });

  it("keeps the run going when one message fails to classify", async () => {
    vi.mocked(getValidAccessToken).mockResolvedValue("token");
    vi.mocked(getSyncCursor).mockResolvedValue({
      accountId: 1,
      lastSyncedAt: null,
    });
    vi.mocked(fetchRecruitingEmails).mockResolvedValue([
      fakeMessage({ messageId: "broken" }) as never,
      fakeMessage({ messageId: "fine" }) as never,
    ]);
    vi.mocked(filterNewMessageIds).mockResolvedValue(["broken", "fine"]);
    vi.mocked(classifyEmail)
      .mockRejectedValueOnce(new Error("provider timeout"))
      .mockResolvedValueOnce({
        isRecruitingEmail: true,
        companyName: "Stripe",
        role: null,
        stage: "INTERVIEW",
        confidence: 0.9,
        nextSteps: null,
        actionRequired: true,
      });
    vi.mocked(persistClassifiedEmails).mockResolvedValue({
      created: 1,
      matchedJobIds: [],
      failedMessageIds: [],
    });

    const result = await runEmailSync(true);

    expect(result.status).toBe("OK");
    const [, rows] = vi.mocked(persistClassifiedEmails).mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0].messageId).toBe("fine");
  });
});
