/**
 * Zustand store powering the background bookmark-parse queue.
 *
 * Pasting a job URL on `/bookmarks` shouldn't block the UI on an LLM parse
 * call — this store fans work out (max `MAX_CONCURRENT` in flight at once)
 * and reports progress through `notificationStore` so the bell shows a
 * `progress -> success/error` transition per item, with history the user can
 * check on later. Failures never block the rest of the queue; a failed item
 * just sits as `"error"` with a `retry()` handle.
 */

import { create } from "zustand";

import { createJob } from "@/actions/job";
import { fetchJobDescriptionFromUrl } from "@/actions/urlFetcher";
import LLMService from "@/lib/llm/llmService";
import { useNotificationStore } from "@/store/notificationStore";
import { ProviderType } from "@/types/llm";

const MAX_CONCURRENT = 5;

const generateId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export interface BookmarkQueueContext {
  modelOptions: { model: string; provider: ProviderType };
  profileId?: number;
  onSaved?: () => void;
}

export interface BookmarkQueueItem {
  id: string;
  url: string;
  status: "queued" | "running" | "done" | "error";
  error?: string;
  jobId?: number;
  notificationId: string;
  ctx: BookmarkQueueContext;
}

interface BookmarkQueueState {
  items: BookmarkQueueItem[];
  runningCount: number;

  enqueue: (url: string, ctx: BookmarkQueueContext) => void;
  retry: (itemId: string) => void;
  pump: () => void;
}

export const useBookmarkQueueStore = create<BookmarkQueueState>()(
  (set, get) => ({
    items: [],
    runningCount: 0,

    enqueue: (url, ctx) => {
      const notificationId = useNotificationStore.getState().notify({
        title: "Parsing job posting…",
        description: url,
        status: "progress",
        transient: false,
      });

      const item: BookmarkQueueItem = {
        id: generateId(),
        url,
        status: "queued",
        notificationId,
        ctx,
      };

      set((state) => ({ items: [...state.items, item] }));
      get().pump();
    },

    retry: (itemId) => {
      const item = get().items.find((i) => i.id === itemId);
      if (!item) return;

      set((state) => ({
        items: state.items.map((i) =>
          i.id === itemId ? { ...i, status: "queued", error: undefined } : i
        ),
      }));

      useNotificationStore.getState().update(item.notificationId, {
        title: "Parsing job posting…",
        description: item.url,
        status: "progress",
      });

      get().pump();
    },

    pump: () => {
      while (get().runningCount < MAX_CONCURRENT) {
        const next = get().items.find((i) => i.status === "queued");
        if (!next) break;

        set((state) => ({
          runningCount: state.runningCount + 1,
          items: state.items.map((i) =>
            i.id === next.id ? { ...i, status: "running" } : i
          ),
        }));

        void runItem(next);
      }
    },
  })
);

async function runItem(item: BookmarkQueueItem): Promise<void> {
  const { ctx } = item;

  try {
    const fetched = await fetchJobDescriptionFromUrl(item.url);
    if (!fetched.success || !fetched.content) {
      throw new Error(fetched.error || "Failed to fetch content from URL.");
    }

    const parsed = await LLMService.parseJob(fetched.content, ctx.modelOptions);

    const { jobId } = await createJob({
      jobDetails: parsed.result,
      url: item.url,
      status: "BOOKMARKED",
      profileId: ctx.profileId,
    });

    const companyName = parsed.result.company?.company_name;
    const jobTitle = parsed.result.job?.job_title;
    const title =
      companyName && jobTitle
        ? `${companyName} — ${jobTitle}`
        : companyName || jobTitle || "Job saved";

    useBookmarkQueueStore.setState((state) => ({
      items: state.items.map((i) =>
        i.id === item.id ? { ...i, status: "done", jobId } : i
      ),
    }));

    useNotificationStore.getState().update(item.notificationId, {
      title,
      description: item.url,
      status: "success",
    });

    ctx.onSaved?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    useBookmarkQueueStore.setState((state) => ({
      items: state.items.map((i) =>
        i.id === item.id ? { ...i, status: "error", error: message } : i
      ),
    }));

    useNotificationStore.getState().update(item.notificationId, {
      title: "Failed to parse job posting",
      description: message,
      status: "error",
    });
  } finally {
    useBookmarkQueueStore.setState((state) => ({
      runningCount: Math.max(0, state.runningCount - 1),
    }));
    useBookmarkQueueStore.getState().pump();
  }
}
