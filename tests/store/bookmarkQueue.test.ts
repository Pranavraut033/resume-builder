import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/urlFetcher", () => ({
  fetchJobDescriptionFromUrl: vi.fn(),
}));
vi.mock("@/lib/llm/llmService", () => ({
  default: { parseJob: vi.fn() },
}));
vi.mock("@/actions/job", () => ({
  createJob: vi.fn(),
}));

import { createJob } from "@/actions/job";
import { fetchJobDescriptionFromUrl } from "@/actions/urlFetcher";
import LLMService from "@/lib/llm/llmService";
import { useBookmarkQueueStore } from "@/store/bookmarkQueueStore";
import { useNotificationStore } from "@/store/notificationStore";
import { ProviderType } from "@/types/llm";

let running = 0;
let peakRunning = 0;
let jobIdCounter = 0;

function resetPeakCounter() {
  running = 0;
  peakRunning = 0;
  jobIdCounter = 0;
}

const ctx = {
  modelOptions: { model: "gpt-test", provider: ProviderType.OPENAI },
  profileId: 1,
};

async function waitForSettled(count: number) {
  const start = Date.now();
  while (Date.now() - start < 5000) {
    const items = useBookmarkQueueStore.getState().items;
    if (
      items.length === count &&
      items.every((i) => i.status === "done" || i.status === "error")
    ) {
      return;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("Timed out waiting for queue items to settle");
}

describe("bookmarkQueueStore", () => {
  beforeEach(() => {
    useBookmarkQueueStore.setState({ items: [], runningCount: 0 });
    useNotificationStore.setState({ notifications: [] });
    resetPeakCounter();

    vi.mocked(fetchJobDescriptionFromUrl).mockImplementation(async () => {
      running++;
      peakRunning = Math.max(peakRunning, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return { success: true, content: "fake description" };
    });

    vi.mocked(LLMService.parseJob).mockResolvedValue({
      result: {
        job: { job_title: "Engineer" },
        company: { company_name: "Acme" },
        raw_description: "fake description",
      },
      usage: {},
    } as never);

    vi.mocked(createJob).mockImplementation(async () => ({
      jobId: ++jobIdCounter,
    }));
  });

  it("never runs more than 5 items concurrently and settles all as done", async () => {
    const urls = Array.from(
      { length: 12 },
      (_, i) => `https://example.com/${i}`
    );

    for (const url of urls) {
      useBookmarkQueueStore.getState().enqueue(url, ctx);
    }

    await waitForSettled(12);

    expect(peakRunning).toBeLessThanOrEqual(5);
    const items = useBookmarkQueueStore.getState().items;
    expect(items).toHaveLength(12);
    expect(items.every((i) => i.status === "done")).toBe(true);
  });

  it("doesn't stall the queue when one item fails", async () => {
    const urls = Array.from(
      { length: 12 },
      (_, i) => `https://example.com/${i}`
    );
    const failingUrl = urls[5];

    vi.mocked(fetchJobDescriptionFromUrl).mockImplementation(async (url) => {
      running++;
      peakRunning = Math.max(peakRunning, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      if (url === failingUrl) {
        return { success: false, error: "boom" };
      }
      return { success: true, content: "fake description" };
    });

    for (const url of urls) {
      useBookmarkQueueStore.getState().enqueue(url, ctx);
    }

    await waitForSettled(12);

    expect(peakRunning).toBeLessThanOrEqual(5);
    const items = useBookmarkQueueStore.getState().items;
    const failed = items.find((i) => i.url === failingUrl);
    const succeeded = items.filter((i) => i.url !== failingUrl);

    expect(failed?.status).toBe("error");
    expect(failed?.error).toBe("boom");
    expect(succeeded).toHaveLength(11);
    expect(succeeded.every((i) => i.status === "done")).toBe(true);
  });

  it("retry() resets a failed item and it eventually completes as done", async () => {
    let callCount = 0;
    vi.mocked(fetchJobDescriptionFromUrl).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { success: false, error: "temporary failure" };
      }
      return { success: true, content: "fake description" };
    });

    useBookmarkQueueStore
      .getState()
      .enqueue("https://example.com/retry-me", ctx);
    await waitForSettled(1);

    let item = useBookmarkQueueStore.getState().items[0];
    expect(item.status).toBe("error");
    expect(item.error).toBe("temporary failure");

    useBookmarkQueueStore.getState().retry(item.id);
    await waitForSettled(1);

    item = useBookmarkQueueStore.getState().items[0];
    expect(item.status).toBe("done");

    const notification = useNotificationStore
      .getState()
      .notifications.find((n) => n.id === item.notificationId);
    expect(notification?.status).toBe("success");
  });

  it("retry() does nothing when the item id is unknown", () => {
    expect(() =>
      useBookmarkQueueStore.getState().retry("does-not-exist")
    ).not.toThrow();
    expect(useBookmarkQueueStore.getState().items).toEqual([]);
  });

  describe("success notification title", () => {
    it("combines company and job title when both are present", async () => {
      vi.mocked(LLMService.parseJob).mockResolvedValue({
        result: {
          job: { job_title: "Engineer" },
          company: { company_name: "Acme" },
          raw_description: "fake description",
        },
        usage: {},
      } as never);

      useBookmarkQueueStore.getState().enqueue("https://example.com/both", ctx);
      await waitForSettled(1);

      const item = useBookmarkQueueStore.getState().items[0];
      const notification = useNotificationStore
        .getState()
        .notifications.find((n) => n.id === item.notificationId);
      expect(notification?.title).toBe("Acme — Engineer");
    });

    it("falls back to just the company name when job title is missing", async () => {
      vi.mocked(LLMService.parseJob).mockResolvedValue({
        result: {
          job: {},
          company: { company_name: "Acme" },
          raw_description: "fake description",
        },
        usage: {},
      } as never);

      useBookmarkQueueStore
        .getState()
        .enqueue("https://example.com/company-only", ctx);
      await waitForSettled(1);

      const item = useBookmarkQueueStore.getState().items[0];
      const notification = useNotificationStore
        .getState()
        .notifications.find((n) => n.id === item.notificationId);
      expect(notification?.title).toBe("Acme");
    });

    it('falls back to "Job saved" when neither company nor job title is present', async () => {
      vi.mocked(LLMService.parseJob).mockResolvedValue({
        result: { job: {}, company: {}, raw_description: "fake description" },
        usage: {},
      } as never);

      useBookmarkQueueStore
        .getState()
        .enqueue("https://example.com/neither", ctx);
      await waitForSettled(1);

      const item = useBookmarkQueueStore.getState().items[0];
      const notification = useNotificationStore
        .getState()
        .notifications.find((n) => n.id === item.notificationId);
      expect(notification?.title).toBe("Job saved");
    });
  });

  describe("ctx.onSaved", () => {
    it("is called exactly once when the item succeeds", async () => {
      const onSaved = vi.fn();
      useBookmarkQueueStore
        .getState()
        .enqueue("https://example.com/saved", { ...ctx, onSaved });

      await waitForSettled(1);

      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    it("is not called when the item fails", async () => {
      const onSaved = vi.fn();
      vi.mocked(fetchJobDescriptionFromUrl).mockResolvedValue({
        success: false,
        error: "boom",
      });

      useBookmarkQueueStore
        .getState()
        .enqueue("https://example.com/failed", { ...ctx, onSaved });

      await waitForSettled(1);

      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  describe("failure sources surface as item errors without stalling the queue", () => {
    it("fetchJobDescriptionFromUrl rejecting is caught and surfaces as an error item", async () => {
      vi.mocked(fetchJobDescriptionFromUrl).mockRejectedValue(
        new Error("network down")
      );

      useBookmarkQueueStore
        .getState()
        .enqueue("https://example.com/network-error", ctx);
      await waitForSettled(1);

      const item = useBookmarkQueueStore.getState().items[0];
      expect(item.status).toBe("error");
      expect(item.error).toBe("network down");
    });

    it("LLMService.parseJob rejecting surfaces as an error item", async () => {
      vi.mocked(LLMService.parseJob).mockRejectedValue(
        new Error("model unavailable")
      );

      useBookmarkQueueStore
        .getState()
        .enqueue("https://example.com/parse-error", ctx);
      await waitForSettled(1);

      const item = useBookmarkQueueStore.getState().items[0];
      expect(item.status).toBe("error");
      expect(item.error).toBe("model unavailable");
    });

    it("createJob rejecting surfaces as an error item", async () => {
      vi.mocked(createJob).mockRejectedValue(new Error("db write failed"));

      useBookmarkQueueStore
        .getState()
        .enqueue("https://example.com/create-error", ctx);
      await waitForSettled(1);

      const item = useBookmarkQueueStore.getState().items[0];
      expect(item.status).toBe("error");
      expect(item.error).toBe("db write failed");
    });
  });
});
