// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

describe("authCodeStore", () => {
  // Next bundles the OAuth callback route and the `consumeAuthCode` server
  // action separately, so each gets its own copy of this module. A plain
  // module-level Map means the route stashes into one copy and the action
  // polls another — the code never arrives and Gmail connect hangs.
  it("hands a code from one module instance to another", async () => {
    const route = await import("@/lib/email/authCodeStore");
    vi.resetModules();
    const action = await import("@/lib/email/authCodeStore");
    expect(action).not.toBe(route);

    route.stashAuthCode("state-1", "code-1");

    expect(action.takeAuthCode("state-1")).toBe("code-1");
  });

  it("is single use", async () => {
    const store = await import("@/lib/email/authCodeStore");
    store.stashAuthCode("state-2", "code-2");

    expect(store.takeAuthCode("state-2")).toBe("code-2");
    expect(store.takeAuthCode("state-2")).toBeNull();
  });

  it("returns null for an unknown state", async () => {
    const store = await import("@/lib/email/authCodeStore");
    expect(store.takeAuthCode("never-stashed")).toBeNull();
  });

  it("expires a code after the 5 minute TTL", async () => {
    vi.useFakeTimers();
    const store = await import("@/lib/email/authCodeStore");
    store.stashAuthCode("state-3", "code-3");

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    expect(store.takeAuthCode("state-3")).toBeNull();
  });
});
