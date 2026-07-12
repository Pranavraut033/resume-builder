"use client";

import { Webview } from "@tauri-apps/api/webview";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { createJob } from "@/actions/job";
import JobBrowserTabs from "@/components/find-jobs/JobBrowserTabs";
import JobBrowserToolbar from "@/components/find-jobs/JobBrowserToolbar";
import { useToast } from "@/components/ui/ToastProvider";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { useProfileSelection } from "@/hooks/useProfileSelection";
import {
  createBrowserWebview,
  destroyAllBrowserWebviews,
  destroyBrowserWebview,
  domRectToWebviewBounds,
  extractBrowserWebviewContent,
  getBrowserWebviewUrl,
  goBackBrowserWebview,
  OFFSCREEN_POSITION,
  parkBrowserWebview,
  reloadBrowserWebview,
  unparkBrowserWebview,
  updateWebviewBounds,
} from "@/lib/browserWebview";
import { buildSearchUrls, JOB_SITES } from "@/lib/jobSearchUrls";
import LLMService from "@/lib/llm/llmService";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";

const logger = createLogger("FindJobsBrowse");

// ── Inner component (uses useSearchParams) ──────────────────────────────────

function BrowsePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const location = searchParams.get("location") ?? "";

  const { selectedProfileId } = useProfileSelection();
  const { data: profile } = useProfileQuery(selectedProfileId);
  const { activeModelPair } = useModelStore();
  const [currentSelectedProvider, currentSelectedModel] = activeModelPair ?? [];
  const { pushToast } = useToast();

  const [activeTabKey, setActiveTabKey] = useState(JOB_SITES[0].key);
  const [currentUrl, setCurrentUrl] = useState("");
  const [isAddingToTracker, setIsAddingToTracker] = useState(false);
  const [webviewsReady, setWebviewsReady] = useState(false);

  // Use a ref-based callback so we get a stable DOM ref that triggers effects
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRefCallback = useCallback((el: HTMLDivElement | null) => {
    setContainerEl(el);
  }, []);

  const webviewsRef = useRef<Record<string, Webview>>({});
  const activeKeyRef = useRef(activeTabKey);

  // Guard: missing params → back to Step 1
  useEffect(() => {
    if (!query || !location) {
      router.replace("/find-jobs");
    }
  }, [query, location, router]);

  // Helper: read the container's current bounds and push only to the active
  // webview. Inactive webviews are parked off-screen — pushing container
  // bounds to them would un-park them and make them visible again.
  // Uses domRectToWebviewBounds to correct for the native window chrome offset
  // (LogicalPosition is relative to the outer window, not the viewport).
  const syncAllBounds = useCallback(() => {
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const active = webviewsRef.current[activeKeyRef.current];
    if (!active) return;
    domRectToWebviewBounds(rect)
      .then((bounds) => updateWebviewBounds(active, bounds))
      .catch(() => {});
  }, [containerEl]);

  // Create all 4 webviews once the container has a real size
  useEffect(() => {
    if (!query || !location || !containerEl) return;

    const rect = containerEl.getBoundingClientRect();
    // Don't create webviews until the container has real dimensions
    if (rect.width === 0 || rect.height === 0) return;

    const urls = buildSearchUrls(query, location);
    let cancelled = false;

    const init = async () => {
      // Compute bounds inside init() so we pick up the chrome offset
      // (domRectToWebviewBounds is async — must run inside the async fn).
      const bounds = await domRectToWebviewBounds(rect);

      for (const site of JOB_SITES) {
        if (cancelled) break;
        try {
          const webview = await createBrowserWebview(
            site.key,
            urls[site.key],
            bounds
          );
          if (cancelled) {
            await destroyBrowserWebview(webview).catch(() => {});
            break;
          }
          // Always re-apply bounds via LogicalPosition/LogicalSize after
          // construction — the constructor may interpret raw numbers as
          // physical pixels on high-DPR displays.
          await updateWebviewBounds(webview, bounds).catch(() => {});
          webviewsRef.current[site.key] = webview;
          // Park inactive webviews off-screen — hide() is unreliable on
          // child Webviews on some platforms.
          if (site.key !== JOB_SITES[0].key) {
            await webview.setPosition(OFFSCREEN_POSITION).catch(() => {});
          }
        } catch (err) {
          logger.error("Failed to create webview", { site: site.key, err });
        }
      }
      if (!cancelled) {
        setWebviewsReady(true);
        // Populate initial URL display
        getBrowserWebviewUrl(JOB_SITES[0].key)
          .then(setCurrentUrl)
          .catch(() => {});
      }
    };

    init();

    return () => {
      cancelled = true;
      webviewsRef.current = {};
      // Use the bulk Rust command — individual close() calls race with the
      // React teardown and can silently fail before Rust processes them.
      destroyAllBrowserWebviews().catch((err) =>
        logger.error("Error cleaning up webviews", { err })
      );
    };
  }, [query, location, containerEl]);

  // Keep webview bounds in sync when the container element resizes
  useEffect(() => {
    if (!containerEl || !webviewsReady) return;

    const observer = new ResizeObserver(() => {
      syncAllBounds();
    });
    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [containerEl, webviewsReady, syncAllBounds]);

  // Also sync on window resize (catches cases ResizeObserver misses,
  // e.g. when the OS window snaps or resizes via keyboard shortcuts)
  useEffect(() => {
    if (!webviewsReady) return;
    window.addEventListener("resize", syncAllBounds);
    return () => window.removeEventListener("resize", syncAllBounds);
  }, [webviewsReady, syncAllBounds]);

  // Destroy all webviews on hard page reload (beforeunload).
  // The bulk Rust command is more reliable than per-webview close() calls
  // which can lose the race against the JS context tearing down.
  useEffect(() => {
    const onUnload = () => {
      webviewsRef.current = {};
      destroyAllBrowserWebviews().catch(() => {});
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  // Tab switch: hide previous, show next — no webview recreation
  const handleTabSwitch = useCallback(
    async (newKey: string) => {
      if (newKey === activeKeyRef.current) return;
      const prev = webviewsRef.current[activeKeyRef.current];
      const next = webviewsRef.current[newKey];

      logger.debug("Tab switch", {
        newKey,
        hasNext: !!next,
        hasPrev: !!prev,
        availableKeys: Object.keys(webviewsRef.current),
        webviewsReady,
      });

      if (!next) return;
      if (!containerEl) return;

      const bounds = await domRectToWebviewBounds(
        containerEl.getBoundingClientRect()
      );

      // Park previous off-screen first, then unpark next into view.
      // hide()/show() is unreliable on child Webviews on some platforms.
      if (prev) await parkBrowserWebview(prev).catch(() => {});
      await unparkBrowserWebview(next, bounds).catch(() => {});
      activeKeyRef.current = newKey;
      setActiveTabKey(newKey);

      getBrowserWebviewUrl(newKey)
        .then(setCurrentUrl)
        .catch(() => {});
    },
    [containerEl, webviewsReady]
  );

  const handleAddToTracker = async () => {
    if (!currentSelectedModel || !currentSelectedProvider) {
      pushToast({
        title: "Model required",
        description:
          "Please select a model in Settings before adding to tracker.",
        variant: "error",
      });
      return;
    }
    if (!profile) {
      pushToast({
        title: "Profile required",
        description: "Please create a base profile before adding to tracker.",
        variant: "error",
      });
      return;
    }

    setIsAddingToTracker(true);
    try {
      const url = await getBrowserWebviewUrl(activeKeyRef.current);

      const content = await extractBrowserWebviewContent(activeKeyRef.current);
      if (!content || content.trim().length < 50) {
        throw new Error(
          "Could not find a job description on this page. Open a specific job listing (not a search results page) and try again."
        );
      }

      const result = await LLMService.generateApplicationMaterials({
        jobDescription: content,
        model: currentSelectedModel,
        provider: currentSelectedProvider,
        profile,
      });

      await createJob({
        jobDetails: result.jobDetails.result,
        url,
        tailoredResume: result.resume.result,
        coverLetterText: result.coverLetter.result,
        atsAnalysis: result.atsAnalysis.result,
        profileId: selectedProfileId ?? undefined,
      });

      router.push("/");
    } catch (err) {
      logger.error("Add to tracker failed", { err });
      pushToast({
        title: "Failed to add job",
        description:
          err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "error",
      });
      setIsAddingToTracker(false);
    }
  };

  const handleWebviewBack = () =>
    goBackBrowserWebview(activeKeyRef.current).catch(() => {});
  const handleRefresh = () =>
    reloadBrowserWebview(activeKeyRef.current).catch(() => {});

  // Explicitly destroy all webviews before navigating away so they don't
  // linger on screen during (or after) the route transition.
  const handleMainBack = useCallback(async () => {
    const views = webviewsRef.current;
    webviewsRef.current = {};
    await Promise.all(
      Object.values(views).map((v) => destroyBrowserWebview(v))
    ).catch(() => {});
    router.push("/find-jobs");
  }, [router]);

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden"
      style={{ background: "var(--color-agent-bg)" }}
    >
      {/* Toolbar */}
      <JobBrowserToolbar
        onWebviewBack={handleWebviewBack}
        onMainBack={handleMainBack}
        onRefresh={handleRefresh}
        currentUrl={currentUrl}
        onAddToTracker={handleAddToTracker}
        isAddingToTracker={isAddingToTracker}
      />

      {/* Site tabs */}
      <JobBrowserTabs
        sites={JOB_SITES}
        activeKey={activeTabKey}
        onSelect={handleTabSwitch}
      />

      {/* Webview host — child webviews are positioned over this element */}
      <div ref={containerRefCallback} className="relative min-h-0 flex-1">
        {!webviewsReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{
                borderColor: "var(--color-agent-primary)",
                borderTopColor: "transparent",
              }}
            />
            <p
              className="text-sm"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Opening job boards…
            </p>
          </div>
        )}
      </div>

      {/* Full-screen overlay while "Add to Tracker" runs */}
      {isAddingToTracker && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 backdrop-blur-sm"
          style={{
            background:
              "color-mix(in srgb, var(--color-agent-bg) 85%, transparent)",
          }}
        >
          <div
            className="h-10 w-10 animate-spin rounded-full border-[3px] border-t-transparent"
            style={{
              borderColor: "var(--color-agent-primary)",
              borderTopColor: "transparent",
            }}
          />
          <div className="text-center">
            <p
              className="text-base font-semibold"
              style={{ color: "var(--color-agent-on-surface)" }}
            >
              Analyzing job listing…
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Fetching, parsing, and tailoring your resume. This may take a
              moment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page export (wraps inner in Suspense for useSearchParams) ───────────────

export default function FindJobsBrowsePage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex h-screen items-center justify-center"
          style={{ background: "var(--color-agent-bg)" }}
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{
              borderColor: "var(--color-agent-primary)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      }
    >
      <BrowsePageInner />
    </Suspense>
  );
}
