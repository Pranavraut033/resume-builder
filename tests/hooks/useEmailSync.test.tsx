import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReactNode } from "react";

const pushToast = vi.fn();
vi.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({ pushToast }),
}));

vi.mock("@/actions/emailSync", () => ({
  getEmailSyncStatus: vi.fn().mockResolvedValue({
    hasAccount: true,
    email: "me@gmail.com",
    lastSyncedAt: null,
    totalEmails: 0,
    matchedEmails: 0,
    totalListings: 0,
  }),
  disconnectGoogleAccount: vi.fn(),
}));

vi.mock("@/lib/email/gmailClient", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("token"),
  clearGoogleAuthTokens: vi.fn(),
}));

const connectGmail = vi.fn();
vi.mock("@/lib/email/connectGmail", () => ({
  connectGmail: (...a: unknown[]) => connectGmail(...a),
}));

const runEmailSync = vi.fn();
vi.mock("@/lib/email/runEmailSync", () => ({
  runEmailSync: (...a: unknown[]) => runEmailSync(...a),
  startEmailSync: vi.fn(),
}));

const { useEmailSync } = await import("@/hooks/useEmailSync");
const { useEmailSyncStore } = await import("@/store/emailSyncStore");

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useEmailSync — shared state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEmailSyncStore.setState({ isSyncing: false, isConnecting: false });
  });

  it("every mounted copy sees a sync started elsewhere", async () => {
    const a = renderHook(() => useEmailSync(), { wrapper });
    const b = renderHook(() => useEmailSync(), { wrapper });
    expect(a.result.current.isSyncing).toBe(false);

    // runEmailSync (not the hook) is the writer — as when the scheduler starts one.
    act(() => useEmailSyncStore.setState({ isSyncing: true }));

    expect(a.result.current.isSyncing).toBe(true);
    expect(b.result.current.isSyncing).toBe(true);
  });

  it("a second Connect click joins the sign-in already waiting instead of opening another", async () => {
    let finish!: (v: { email: string }) => void;
    connectGmail.mockReturnValue(new Promise((r) => (finish = r)));
    const a = renderHook(() => useEmailSync(), { wrapper });
    const b = renderHook(() => useEmailSync(), { wrapper });

    let first!: Promise<void>;
    act(() => {
      first = a.result.current.connect();
    });
    expect(b.result.current.isConnecting).toBe(true);
    await act(async () => {
      await b.result.current.connect(); // e.g. Connect button on another page
    });
    expect(connectGmail).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish({ email: "me@gmail.com" });
      await first;
    });
    await waitFor(() => expect(b.result.current.isConnecting).toBe(false));
    // One toast, not one per mounted copy.
    expect(pushToast).toHaveBeenCalledTimes(1);
  });

  it("clears isConnecting when sign-in fails so Connect isn't stuck disabled", async () => {
    connectGmail.mockRejectedValue(new Error("timed out"));
    const a = renderHook(() => useEmailSync(), { wrapper });

    await act(async () => {
      await a.result.current.connect();
    });

    expect(useEmailSyncStore.getState().isConnecting).toBe(false);
    expect(pushToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" })
    );
  });

  it("syncNow starts a manual run", async () => {
    runEmailSync.mockResolvedValue({ status: "OK" });
    const a = renderHook(() => useEmailSync(), { wrapper });

    await act(async () => {
      await a.result.current.syncNow();
    });

    expect(runEmailSync).toHaveBeenCalledWith(true);
  });
});
