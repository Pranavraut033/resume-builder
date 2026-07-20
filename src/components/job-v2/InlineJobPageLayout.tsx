"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { updateJobStatus, JobRecord } from "@/actions/job";
import { ChatContextProvider } from "@/components/chat/ChatContext";
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
import { htmlToText, resumeToProseText } from "@/lib/resumeToText";
import { HumanizerJSON } from "@/types/humanizer";
import { JobStatus } from "@/types/job";

import { ATSDrawer } from "./ATSDrawer";
import { ChatOverlay } from "./ChatOverlay";
import { CustomizationDrawer } from "./CustomizationDrawer";
import { DocumentCanvas } from "./DocumentCanvas";
import { FloatingActionBar } from "./FloatingActionBar";
import { HistoryDrawer } from "./HistoryDrawer";
import { HumanizerDrawer } from "./HumanizerDrawer";
import { SectionOutlinePanel } from "./resume/SectionOutlinePanel";

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

  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [isAtsOpen, setIsAtsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHumanizerOpen, setIsHumanizerOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPendingStatus, startStatusTransition] = useTransition();

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
    setIsHumanizerOpen(false);
  };

  const canvasColumnRef = useRef<HTMLDivElement>(null);
  const isActionBarHidden = useHideOnScroll(canvasColumnRef, contentType);

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
    <ChatContextProvider>
      <div className="bg-agent-bg text-agent-on-bg relative h-full overflow-hidden pt-16">
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
                  onClose={() => setIsCustomizationOpen(false)}
                />

                {/* Canvas column — fills remaining space */}
                <div
                  ref={canvasColumnRef}
                  className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <DocumentCanvas
                    isHumanizerOpen={isHumanizerOpen}
                    onToggleHumanizer={() => {
                      setIsHumanizerOpen((o) => !o);
                      setIsCustomizationOpen(false);
                      setIsAtsOpen(false);
                    }}
                  />
                  {/* Floating action bar — resume-only actions hide themselves
                      internally when contentType is "coverLetter". Hides on
                      scroll down, reappears on scroll up. */}
                  <FloatingActionBar
                    hidden={isActionBarHidden}
                    historyState={historyState}
                    isCustomizationOpen={isCustomizationOpen}
                    onToggleCustomization={() => {
                      setIsCustomizationOpen((o) => !o);
                      setIsAtsOpen(false);
                      setIsChatOpen(false);
                    }}
                    isAtsOpen={isAtsOpen}
                    onToggleAts={() => {
                      setIsAtsOpen((o) => !o);
                      setIsCustomizationOpen(false);
                      setIsChatOpen(false);
                    }}
                    isChatOpen={isChatOpen}
                    onToggleChat={() => {
                      const next = !isChatOpen;
                      setIsChatOpen(next);
                      setChatSnapPosition(next ? "right" : "undocked");
                      setIsCustomizationOpen(false);
                      setIsAtsOpen(false);
                    }}
                    isOutlineOpen={isOutlineOpen}
                    onToggleOutline={() => {
                      setIsOutlineOpen((o) => !o);
                      setIsCustomizationOpen(false);
                      setIsAtsOpen(false);
                    }}
                    isHistoryOpen={isHistoryOpen}
                    onToggleHistory={() => {
                      setIsHistoryOpen((o) => !o);
                      setIsCustomizationOpen(false);
                      setIsAtsOpen(false);
                    }}
                    isHumanizerOpen={isHumanizerOpen}
                    onToggleHumanizer={() => {
                      setIsHumanizerOpen((o) => !o);
                      setIsCustomizationOpen(false);
                      setIsAtsOpen(false);
                    }}
                  />

                  {/* Humanize drawer — slides over the canvas, resume or cover letter */}
                  <HumanizerDrawer
                    open={isHumanizerOpen}
                    onClose={() => setIsHumanizerOpen(false)}
                    text={
                      contentType === "coverLetter"
                        ? htmlToText(coverLetter)
                        : resumeToProseText(resume)
                    }
                    onAccept={handleHumanizeAccept}
                  />

                  {/* ATS analysis drawer — slides over the canvas */}
                  <ATSDrawer
                    open={isAtsOpen}
                    onClose={() => setIsAtsOpen(false)}
                  />

                  {/* Sections outline drawer — slides over the canvas */}
                  {contentType === "resume" && (
                    <SectionOutlinePanel
                      open={isOutlineOpen}
                      onClose={() => setIsOutlineOpen(false)}
                    />
                  )}

                  {/* Version history drawer — slides over the canvas */}
                  {contentType === "resume" && (
                    <HistoryDrawer
                      open={isHistoryOpen}
                      onClose={() => setIsHistoryOpen(false)}
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
