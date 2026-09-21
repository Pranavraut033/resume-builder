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
const { useEmailSyncStore, describeSyncProgress } =
  await import("@/store/emailSyncStore");

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
      alertsAfter: null,
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
        kind: "APPLICATION",
        isRecruitingEmail: true,
        companyName: "Stripe",
        role: null,
        stage: "INTERVIEW",
        confidence: 0.9,
        nextSteps: null,
        actionRequired: true,
      })
      .mockResolvedValueOnce({
        kind: "APPLICATION",
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
      listingsCreated: 0,
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
      alertsAfter: null,
    });
    vi.mocked(fetchRecruitingEmails).mockResolvedValue([
      fakeMessage({ messageId: "broken" }) as never,
      fakeMessage({ messageId: "fine" }) as never,
    ]);
    vi.mocked(filterNewMessageIds).mockResolvedValue(["broken", "fine"]);
    vi.mocked(classifyEmail)
      .mockRejectedValueOnce(new Error("provider timeout"))
      .mockResolvedValueOnce({
        kind: "APPLICATION",
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
      listingsCreated: 0,
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

describe("runEmailSync shared state", () => {
  const isSyncing = () => useEmailSyncStore.getState().isSyncing;
  const deferredToken = () => {
    let release!: (token: string | null) => void;
    vi.mocked(getValidAccessToken).mockReturnValue(
      new Promise((resolve) => (release = resolve))
    );
    return release;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useEmailSyncStore.setState({ isSyncing: false });
  });

  it("is busy for exactly the length of a run", async () => {
    const release = deferredToken();
    expect(isSyncing()).toBe(false);

    const run = runEmailSync(true);
    expect(isSyncing()).toBe(true);

    release(null);
    await run;
    expect(isSyncing()).toBe(false);
  });

  it("joins a run already in flight instead of starting a second", async () => {
    const release = deferredToken();

    // e.g. the background scheduler, then a Sync button on another page.
    const background = runEmailSync(false);
    const manual = runEmailSync(true);

    expect(manual).toBe(background);
    release(null);
    await Promise.all([background, manual]);
    expect(getValidAccessToken).toHaveBeenCalledTimes(1);
    expect(isSyncing()).toBe(false);
  });

  it("stays busy until the shared run ends, not until the first caller resolves", async () => {
    const release = deferredToken();
    const first = runEmailSync(false);
    void runEmailSync(true);

    release(null);
    await first;
    expect(isSyncing()).toBe(false);
  });

  it("clears the flag when the run throws, so no button is stuck on Syncing…", async () => {
    vi.mocked(getValidAccessToken).mockRejectedValue(new Error("keychain"));

    await expect(runEmailSync(true)).rejects.toThrow("keychain");

    expect(isSyncing()).toBe(false);
  });

  it("allows a fresh run once the previous one has finished", async () => {
    vi.mocked(getValidAccessToken).mockResolvedValue(null);

    await runEmailSync(true);
    await runEmailSync(true);

    expect(getValidAccessToken).toHaveBeenCalledTimes(2);
  });

  describe("progress", () => {
    it("walks fetching → classifying → saving, then clears when idle", async () => {
      vi.mocked(getValidAccessToken).mockResolvedValue("token");
      vi.mocked(getSyncCursor).mockResolvedValue({
        accountId: 1,
        lastSyncedAt: null,
        alertsAfter: null,
      });
      vi.mocked(fetchRecruitingEmails).mockImplementation((async (
        _token: string,
        options: { onProgress?: (done: number, total: number) => void }
      ) => {
        options.onProgress?.(1, 2);
        options.onProgress?.(2, 2);
        return [
          fakeMessage({ messageId: "a" }),
          fakeMessage({ messageId: "b" }),
        ];
      }) as never);
      vi.mocked(filterNewMessageIds).mockResolvedValue(["a", "b"]);
      vi.mocked(classifyEmail).mockResolvedValue({
        kind: "APPLICATION",
        isRecruitingEmail: false,
        companyName: null,
        role: null,
        stage: null,
        confidence: 0.2,
        nextSteps: null,
        actionRequired: false,
      });
      vi.mocked(persistClassifiedEmails).mockResolvedValue({
        created: 0,
        listingsCreated: 0,
        matchedJobIds: [],
        failedMessageIds: [],
      });

      const seen: string[] = [];
      const noticeLines: string[] = [];
      const unsubscribe = useEmailSyncStore.subscribe((state) => {
        if (state.progress) seen.push(describeSyncProgress(state.progress));
      });
      const unsubscribeNotice = useNotificationStore.subscribe((state) => {
        const line = state.notifications[0]?.description;
        if (line) noticeLines.push(line);
      });
      await runEmailSync(true);
      unsubscribe();
      unsubscribeNotice();

      // A manual run's notification shows the same text as the buttons.
      expect(noticeLines).toEqual(
        expect.arrayContaining([
          "Classifying 1/2",
          "Classifying 2/2",
          "Saving…",
        ])
      );

      expect(seen).toEqual(
        expect.arrayContaining([
          "Fetching emails 2/2",
          "Classifying 1/2",
          "Classifying 2/2",
          "Saving…",
        ])
      );
      // Phases arrive in order.
      expect(seen.indexOf("Fetching emails 2/2")).toBeLessThan(
        seen.indexOf("Classifying 1/2")
      );
      expect(seen.indexOf("Classifying 2/2")).toBeLessThan(
        seen.indexOf("Saving…")
      );
      expect(useEmailSyncStore.getState().progress).toBeNull();
    });

    it("clears progress when the run fails part-way", async () => {
      vi.mocked(getValidAccessToken).mockResolvedValue("token");
      vi.mocked(getSyncCursor).mockRejectedValue(new Error("db down"));

      const result = await runEmailSync(true);

      expect(result.status).toBe("ERROR");
      expect(useEmailSyncStore.getState().progress).toBeNull();
      expect(useEmailSyncStore.getState().isSyncing).toBe(false);
    });
  });
});

describe("describeSyncProgress", () => {
  it("names each phase, and says so before the total is known", () => {
    expect(describeSyncProgress({ phase: "fetching", done: 0, total: 0 })).toBe(
      "Checking Gmail…"
    );
    expect(
      describeSyncProgress({ phase: "fetching", done: 12, total: 150 })
    ).toBe("Fetching emails 12/150");
    expect(
      describeSyncProgress({ phase: "classifying", done: 3, total: 40 })
    ).toBe("Classifying 3/40");
    expect(describeSyncProgress({ phase: "saving", done: 0, total: 0 })).toBe(
      "Saving…"
    );
  });
});
