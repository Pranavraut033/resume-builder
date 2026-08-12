"use client";

import { isTauri } from "@tauri-apps/api/core";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { updateJobStatus, JobRecord } from "@/actions/job";
import {
  ChatContextProvider,
  useChatContext,
} from "@/components/chat/ChatContext";
import CompanyAvatar from "@/components/CompanyAvatar";
import PeekContent from "@/components/home/PeekContent";
import { StatusSelector } from "@/components/home/StatusControls";
import { Icon, BackButton, Modal, SaveButton } from "@/components/ui";
import { useToast } from "@/components/ui/ToastProvider";
import {
  EditorContentType,
  useJobPageContext,
} from "@/contexts/JobPageContext";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import cn from "@/lib/cn";
import {
  applyChangesToResume,
  applyChangesToText,
} from "@/lib/humanizer/applyChanges";
import { HistoryChangeListener } from "@/lib/llm/ResumeHistory";
import { applyProofreadFixes } from "@/lib/proofread/applyFixes";
import { htmlToText, resumeToProseText } from "@/lib/resumeToText";
import { HumanizerJSON } from "@/types/humanizer";
import { JobStatus } from "@/types/job";
import { ResumeJSON } from "@/types/resume";

import { ATSDrawer } from "./ATSDrawer";
import { ChatOverlay } from "./ChatOverlay";
import { CustomizationDrawer } from "./CustomizationDrawer";
import { DocumentCanvas } from "./DocumentCanvas";
import { FloatingActionBar, DrawerName } from "./FloatingActionBar";
import { GapDrawer } from "./GapDrawer";
import { HistoryDrawer } from "./HistoryDrawer";
import { HumanizerDrawer } from "./HumanizerDrawer";
import { ProofreadDrawer } from "./ProofreadDrawer";
import { SectionOutlinePanel } from "./resume/SectionOutlinePanel";

/**
 * ConnectedGapDrawer — GapDrawer stays decoupled from chat (plain props +
 * `externalResult`); this is the one place that bridges chat's stashed
 * `gapAnalysis` into that prop. It has to be its own component (not inlined
 * in InlineJobPageLayout) because it needs to be a descendant of
 * ChatContextProvider to call useChatContext.
 */
function ConnectedGapDrawer(
  props: Omit<React.ComponentProps<typeof GapDrawer>, "externalResult">
) {
  const chatContext = useChatContext(true);
  return (
    <GapDrawer {...props} externalResult={chatContext?.gapAnalysis ?? null} />
  );
}

/**
 * InlineJobPageLayout — the V2 single-surface WYSIWYG editor.
 *
 * One centered document card is the entire editing surface. Chat, Template,
 * and Customize are exposed as floating-action-bar overlays rather than
 * permanent columns/drawers.
 */
export function InlineJobPageLayout() {
  const {
    contentType,
    coverLetter,
    customization,
    historyRef,
    isDirtyCoverLetter,
    isDirtyResume,
    job,
    redoResume,
    refetch,
    resume,
    saveStatus,
    saveToDb,
    setChatSnapPosition,
    setContentType,
    undoResume,
    updateResumeState,
    updateCoverLetterState,
  } = useJobPageContext();

  const { pushToast } = useToast();

  // Single source of truth for the seven mutually-exclusive canvas-overlay
  // drawers — opening one always closes whichever other was open. Chat and
  // the details modal are independent overlays, not part of this union (see
  // FloatingActionBar's DrawerName).
  const [activeDrawer, setActiveDrawer] = useState<DrawerName>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPendingStatus, startStatusTransition] = useTransition();

  const isCustomizationOpen = activeDrawer === "customization";
  const isAtsOpen = activeDrawer === "ats";
  const isOutlineOpen = activeDrawer === "outline";
  const isHistoryOpen = activeDrawer === "history";
  const isHumanizerOpen = activeDrawer === "humanizer";
  const isProofreadOpen = activeDrawer === "proofread";
  const isGapOpen = activeDrawer === "gaps";

  // Toggles `name` on/off; opening any drawer also closes chat, matching the
  // old per-toggle "close the others" hand-written blocks.
  const toggleDrawer = useCallback((name: Exclude<DrawerName, null>) => {
    setActiveDrawer((current) => (current === name ? null : name));
    setIsChatOpen(false);
  }, []);

  const handleHumanizeAccept = (selected: HumanizerJSON["changes"]) => {
    if (contentType === "coverLetter") {
      const next = applyChangesToText(coverLetter, selected);
      updateCoverLetterState(next);
      refetch(undefined, "coverLetter");
      saveToDb("coverLetter", next, customization);
      pushToast({ title: "Cover letter updated", variant: "success" });
    } else {
      const next = applyChangesToResume(resume, selected);
      updateResumeState(next, "Humanized");
      saveToDb("resume", next, customization);
      pushToast({ title: "Resume updated", variant: "success" });
    }
    setActiveDrawer(null);
  };

  const handleProofreadApply = (
    result: ReturnType<typeof applyProofreadFixes>
  ) => {
    updateResumeState(result.resume, "Proofread");
    saveToDb("resume", result.resume, customization);
    pushToast({ title: "Resume updated", variant: "success" });
  };

  const handleGapApply = (updatedResume: ResumeJSON) => {
    updateResumeState(updatedResume, "Gap fixes");
    saveToDb("resume", updatedResume, customization);
    pushToast({ title: "Resume updated", variant: "success" });
    setActiveDrawer(null);
  };

  const canvasColumnRef = useRef<HTMLDivElement>(null);
  const isActionBarHidden = useHideOnScroll(canvasColumnRef, contentType);
  const pageRootRef = useRef<HTMLDivElement>(null);

  const [historyState, setHistoryState] = useState<{
    canUndo: boolean;
    canRedo: boolean;
    redoLabel: string | null;
    undoLabel: string | null;
  }>({ canUndo: false, canRedo: false, redoLabel: null, undoLabel: null });

  const handleStatusChange = useCallback(
    (newStatus: JobStatus) => {
      startStatusTransition(async () => {
        await updateJobStatus(job.id, newStatus);
        refetch(undefined, "job");
      });
    },
    [job.id, refetch]
  );

  const onSave = useCallback(() => {
    if (contentType === "coverLetter") {
      saveToDb("coverLetter", coverLetter, customization);
    } else {
      saveToDb("resume", resume, customization);
    }
  }, [contentType, saveToDb, coverLetter, resume, customization]);

  // History change listener
  useEffect(() => {
    const history = historyRef.current;
    if (!history) return;
    const listener: HistoryChangeListener = (
      canUndo,
      canRedo,
      redoLabel,
      undoLabel
    ) => {
      setHistoryState({ canUndo, canRedo, redoLabel, undoLabel });
    };
    history.addHistoryChangeListener(listener);
    return () => history.removeHistoryChangeListener(listener);
  }, [historyRef]);

  // ponytail: WKWebView (Tauri's macOS webview) sometimes commits a stale
  // flex layout when this page mounts via client-side navigation (not on a
  // full reload), shifting content left until it settles on its own a
  // moment later. Toggling the page root's `overflow-hidden` off/on is what
  // actually nudges WKWebView into recomputing it correctly (confirmed by
  // hand — dropping `overflow-hidden` entirely also "fixes" it, because it
  // stops the stale state from ever being clipped/visible, not because the
  // layout itself is right). `isMaskingLayoutShift` covers the page with an
  // opaque screen for that brief window so the toggling itself is never
  // visible. Drop all of this once Tauri/WKWebView fixes the underlying
  // repaint bug.
  //
  // Starts false (matching SSR, where `isTauri()` is always false — there's
  // no window) and flips in a layout effect instead of the useState
  // initializer: reading `isTauri()` synchronously during render would
  // make the first client render disagree with the server-rendered HTML
  // and trip a hydration-mismatch error on every direct load in Tauri.
  const [isMaskingLayoutShift, setIsMaskingLayoutShift] = useState(false);
  // Kept mounted slightly past `isMaskingLayoutShift` going false so the
  // opacity transition below can play instead of the mask popping away —
  // the "black flash" that showed up going from opaque straight to gone.
  const [isMaskMounted, setIsMaskMounted] = useState(false);
  useLayoutEffect(() => {
    // One-time client-only flag synced from the Tauri runtime, not a data
    // sync loop, so a direct setState here is intentional.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isTauri()) {
      setIsMaskingLayoutShift(true);
      setIsMaskMounted(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (isMaskingLayoutShift || !isMaskMounted) return;
    const timeout = setTimeout(() => setIsMaskMounted(false), 150);
    return () => clearTimeout(timeout);
  }, [isMaskingLayoutShift, isMaskMounted]);
  useEffect(() => {
    if (!isMaskingLayoutShift) return;
    // Remove/re-add on the same frame gives WKWebView nothing to actually
    // repaint in between — a real gap (one full frame) between the two is
    // what gives it a chance to settle, hence the two separate rAFs below
    // instead of a single synchronous toggle.
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let cycleRaf = 0;
    const cycle = () => {
      const el = pageRootRef.current;
      if (!el) return;
      el.classList.remove("overflow-hidden");
      cycleRaf = requestAnimationFrame(() => {
        cycleRaf = requestAnimationFrame(() => {
          el.classList.add("overflow-hidden");
          timeouts.push(setTimeout(cycle, 40));
        });
      });
    };
    cycle();
    const maskTimeout = setTimeout(() => setIsMaskingLayoutShift(false), 320);
    return () => {
      cancelAnimationFrame(cycleRaf);
      clearTimeout(maskTimeout);
      timeouts.forEach(clearTimeout);
    };
  }, [isMaskingLayoutShift]);

  // Global undo/redo keybindings — skip when editing text fields so native
  // text undo wins inside InlineField inputs.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (!meta || (key !== "z" && key !== "y")) return;

      const target = e.target as HTMLElement | null;
      const isTextEntry =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isTextEntry) return;

      const isRedo = key === "y" || (key === "z" && e.shiftKey);
      e.preventDefault();
      if (isRedo) redoResume();
      else undoResume();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [redoResume, undoResume]);

  return (
    <ChatContextProvider onOpenGapDrawer={() => setActiveDrawer("gaps")}>
      {/* ponytail: masks the forced-reflow layout correction above — see the
          isMaskingLayoutShift effect. Opaque, no spinner (the correction is
          a single frame, too fast for one to read); fades out instead of
          popping away once the reflow settles. */}
      {isMaskMounted && (
        <div
          className={cn(
            "bg-agent-bg fixed inset-0 z-[60] transition-opacity duration-150 ease-out",
            isMaskingLayoutShift
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          )}
        />
      )}
      <div
        ref={pageRootRef}
        className="bg-agent-bg text-agent-on-bg relative h-full overflow-hidden pt-16"
      >
        {/* Ambient orbs — matching V1 aesthetic */}
        <div className="bg-agent-primary-fixed-dim pointer-events-none absolute -top-36 -left-28 h-80 w-80 rounded-full opacity-35 blur-3xl" />
        <div className="bg-agent-tertiary-fixed-dim pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full opacity-40 blur-3xl" />

        {/* ── Header — fixed to the viewport, page content is padded below it ── */}
        <header className="bg-agent-surface border-agent-outline-variant fixed inset-x-0 top-0 z-50 h-16 border-b">
          <div className="flex h-full items-center gap-2.5 px-3 py-2">
            <BackButton />
            <CompanyAvatar name={job?.company?.name} size={34} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-agent-on-surface truncate text-sm leading-tight font-semibold">
                  {job?.role || "Untitled Role"}
                </h1>
                {job?.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-agent-primary shrink-0 opacity-60 transition-opacity hover:opacity-100"
                    aria-label="Open job listing"
                  >
                    <Icon name="link" size={12} />
                  </a>
                )}
              </div>
              <p className="text-agent-on-surface-variant truncate text-xs leading-tight">
                {job?.company?.name ?? "Unknown company"}
                {(job?.company?.locationCity ||
                  job?.company?.locationCountry) && (
                  <span className="opacity-60">
                    {" · "}
                    {[job.company?.locationCity, job.company?.locationCountry]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </p>
            </div>

            {/* V2 badge */}
            <span className="text-agent-primary bg-agent-primary/10 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide">
              WYSIWYG
            </span>

            <StatusSelector
              value={job?.status as JobStatus}
              onChange={handleStatusChange}
              disabled={isPendingStatus}
            />

            <button
              onClick={() => setIsDetailsOpen(true)}
              className="text-agent-on-surface-variant hover:bg-agent-surface-container flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-all"
            >
              <Icon name="info" size={13} />
              <span className="hidden sm:inline">Details</span>
            </button>

            {/* Document-type switcher */}
            <div className="bg-agent-surface-container flex shrink-0 rounded-xl p-1">
              {(["resume", "coverLetter"] as EditorContentType[]).map(
                (type) => {
                  const isActive = contentType === type;
                  const isDirty =
                    type === "resume" ? isDirtyResume : isDirtyCoverLetter;
                  return (
                    <button
                      key={type}
                      onClick={() => setContentType(type)}
                      className={cn(
                        "relative rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-agent-primary text-agent-on-primary shadow-sm"
                          : "text-agent-on-surface-variant hover:text-agent-on-surface"
                      )}
                    >
                      {type === "resume" ? "Resume" : "Cover Letter"}
                      {isDirty && !isActive && (
                        <span className="bg-agent-primary absolute top-1 right-1 h-1.5 w-1.5 rounded-full" />
                      )}
                    </button>
                  );
                }
              )}
            </div>

            <div className="shrink-0">
              <SaveButton
                onClick={onSave}
                status={saveStatus}
                isDirty={
                  contentType === "coverLetter"
                    ? isDirtyCoverLetter
                    : isDirtyResume
                }
              />
            </div>
          </div>
        </header>

        <div className="relative h-full p-3 md:p-4">
          <div className="border-agent-outline-variant bg-agent-surface-lowest shadow-agent-modal h-full overflow-hidden rounded-2xl border">
            <div className="bg-agent-surface-lowest flex h-full flex-col overflow-hidden">
              {/* Job details modal */}
              <Modal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                title="Job overview"
                size="lg"
              >
                <PeekContent
                  job={job as unknown as JobRecord}
                  details={job?.details ?? null}
                  onClose={() => setIsDetailsOpen(false)}
                />
              </Modal>

              {/* ── Body: customization panel + canvas column + chat side panel ── */}
              <div className="bg-agent-surface-low flex min-h-0 flex-1 overflow-hidden">
                {/* Customization side panel — pushes canvas right instead of overlaying */}
                <CustomizationDrawer
                  open={isCustomizationOpen}
                  onClose={() => setActiveDrawer(null)}
                />

                {/* Canvas column — fills remaining space */}
                <div
                  ref={canvasColumnRef}
                  className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <DocumentCanvas />
                  {/* Floating action bar — resume-only actions hide themselves
                      internally when contentType is "coverLetter". Hides on
                      scroll down, reappears on scroll up. */}
                  <FloatingActionBar
                    hidden={isActionBarHidden}
                    historyState={historyState}
                    activeDrawer={activeDrawer}
                    onOpenDrawer={(name) => {
                      if (name === null) {
                        setActiveDrawer(null);
                        return;
                      }
                      toggleDrawer(name);
                    }}
                    isChatOpen={isChatOpen}
                    onToggleChat={() => {
                      const next = !isChatOpen;
                      setIsChatOpen(next);
                      setChatSnapPosition(next ? "right" : "undocked");
                      setActiveDrawer(null);
                    }}
                  />

                  {/* Humanize drawer — slides over the canvas, resume or cover letter */}
                  <HumanizerDrawer
                    open={isHumanizerOpen}
                    onClose={() => setActiveDrawer(null)}
                    text={
                      contentType === "coverLetter"
                        ? htmlToText(coverLetter)
                        : resumeToProseText(resume)
                    }
                    onAccept={handleHumanizeAccept}
                  />

                  {/* Proofread drawer — slides over the canvas, resume only */}
                  {contentType === "resume" && (
                    <ProofreadDrawer
                      open={isProofreadOpen}
                      onClose={() => setActiveDrawer(null)}
                      resume={resume}
                      jobDetails={job?.details}
                      onApply={handleProofreadApply}
                    />
                  )}

                  {/* Gap analysis drawer — slides over the canvas, resume only */}
                  {contentType === "resume" && (
                    <ConnectedGapDrawer
                      open={isGapOpen}
                      onClose={() => setActiveDrawer(null)}
                      resume={resume}
                      jobDetails={job?.details}
                      onApply={handleGapApply}
                    />
                  )}

                  {/* ATS analysis drawer — slides over the canvas */}
                  <ATSDrawer
                    open={isAtsOpen}
                    onClose={() => setActiveDrawer(null)}
                  />

                  {/* Sections outline drawer — slides over the canvas */}
                  {contentType === "resume" && (
                    <SectionOutlinePanel
                      open={isOutlineOpen}
                      onClose={() => setActiveDrawer(null)}
                    />
                  )}

                  {/* Version history drawer — slides over the canvas */}
                  {contentType === "resume" && (
                    <HistoryDrawer
                      open={isHistoryOpen}
                      onClose={() => setActiveDrawer(null)}
                    />
                  )}
                </div>

                {/* Chat side panel — pushes canvas left instead of overlaying */}
                <ChatOverlay
                  open={isChatOpen}
                  onClose={() => {
                    setIsChatOpen(false);
                    setChatSnapPosition("undocked");
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ChatContextProvider>
  );
}
