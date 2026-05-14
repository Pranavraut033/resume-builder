// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

"use client";

import { useState, useEffect, useRef } from "react";

import {
  getResumeByJobId,
  getResumeCustomization,
  updateResumeCustomization,
  getJobContext,
} from "@/actions/job";
import { getProfile } from "@/actions/profile";
import {
  ResumeEditProvider,
  useResumeEditContext,
} from "@/contexts/ResumeEditContext";
import { loadGoogleFont } from "@/lib/fontLoader";
import {
  ThemeCustomization,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_COLORS,
} from "@/types/resume";

import BackButton from "./BackButton";
import { FinalReviewExport } from "./resume/FinalReviewExport";
// import { ResumeChatAssistant } from "./resume/ResumeChatAssistant";
import { ResumeSectionNav, SectionId } from "./resume/ResumeSectionNav";
import { SectionEditor } from "./resume/SectionEditor";
import { TemplateRenderer } from "./templates/TemplateRenderer";
import { Button } from "./ui";
import { FallbackState } from "./ui/FallbackState";

interface EnhancedResumeEditorProps {
  jobId: string;
}

type EditorTab = "edit" | "export";

const PREVIEW_MIN_WIDTH = 360;
const PREVIEW_MAX_WIDTH = 720;

/**
 * Inner editor component that uses the ResumeEditContext
 * Separated to allow context provider to wrap the component
 */
function ResumeEditorContent({ jobId }: { jobId: string }) {
  const {
    resume,
    setResume,
    setJob,
    isLoading,
    setIsLoading,
    error,
    setError,
  } = useResumeEditContext();

  const [customization, setCustomization] = useState<ThemeCustomization>(
    DEFAULT_CUSTOMIZATION
  );
  const [activeSection, setActiveSection] = useState<SectionId>("personal");
  const [activeTab, setActiveTab] = useState<EditorTab>("edit");
  const [lastSaved, setLastSaved] = useState<string | undefined>(undefined);
  const [previewWidth, setPreviewWidth] = useState<number>(416);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);

  useEffect(() => {
    if (!isResizingPreview) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const delta = resizeStartRef.current.x - event.clientX;
      const nextWidth = Math.min(
        PREVIEW_MAX_WIDTH,
        Math.max(PREVIEW_MIN_WIDTH, resizeStartRef.current.width + delta)
      );
      setPreviewWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizingPreview(false);
      resizeStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingPreview]);

  // Load initial data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const jobIdNum = parseInt(jobId);

        const [resumeData, customizationData, jobData] = await Promise.all([
          getResumeByJobId(jobIdNum),
          getResumeCustomization(jobIdNum),
          getJobContext(jobIdNum),
        ]);

        if (resumeData) {
          setResume(resumeData.contentJson);
        } else {
          const profileData = await getProfile();
          setResume(profileData);
        }

        setCustomization(customizationData);

        if (jobData) {
          setJob({
            id: jobData.id,
            details: jobData.details,
            description: jobData.description,
            rawData: jobData,
          });
        }
      } catch (err) {
        console.error("Failed to load resume data:", err);
        setError("Failed to load resume data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (customization.fontFamily) {
      loadGoogleFont(customization.fontFamily);
    }
  }, [customization.fontFamily]);

  const handleCustomizationChange = async (
    updates: Partial<ThemeCustomization>
  ) => {
    const newCustomization = { ...customization, ...updates };
    setCustomization(newCustomization);
    try {
      await updateResumeCustomization(parseInt(jobId), updates);
    } catch (err) {
      console.error("Failed to save customization:", err);
    }
  };

  const handleResumeChange = async (updatedResume: typeof resume) => {
    if (!updatedResume) return;
    setResume(updatedResume);
    setLastSaved(new Date().toLocaleTimeString());
    try {
      const { updateResume } = await import("@/actions/job");
      await updateResume(parseInt(jobId), updatedResume);
    } catch (err) {
      console.error("Failed to save resume:", err);
    }
  };

  if (isLoading) {
    return (
      <FallbackState
        iconName="loader"
        title="Loading resume"
        description="Preparing the editor and loading your saved resume draft."
        action={null}
      />
    );
  }

  if (error || !resume) {
    return (
      <FallbackState
        title={error || "Resume not found"}
        description={error || "No resume data is available for this job."}
        action={
          <Button variant="primary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        }
      />
    );
  }

  const templateName =
    customization.template
      ?.replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Modern Minimal";

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: "var(--color-agent-surface-lowest)" }}
    >
      {/* Top bar */}
      <header
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
        style={{
          background: "var(--color-agent-surface)",
          borderColor: "var(--color-agent-outline-variant)",
        }}
      >
        <BackButton />
        <div className="min-w-0">
          <h1
            className="truncate text-base font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Interactive AI Editor
          </h1>
          <p
            className="truncate text-xs"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Edit each section in the side panel with live A4 preview.
          </p>
        </div>

        {/* Tab switcher */}
        <div
          className="ml-auto flex rounded-lg p-0.5"
          style={{ background: "var(--color-agent-surface-container)" }}
        >
          {(["edit", "export"] as EditorTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-all"
              style={
                activeTab === tab
                  ? {
                      background: "var(--color-agent-primary-container)",
                      color: "var(--color-agent-on-primary-container)",
                    }
                  : { color: "var(--color-agent-on-surface-variant)" }
              }
            >
              {tab === "edit" ? "Editor" : "Final Review & Export"}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      {activeTab === "edit" ? (
        <div
          className="flex min-h-0 flex-1"
          style={
            isResizingPreview
              ? { userSelect: "none", cursor: "col-resize" }
              : undefined
          }
        >
          {/* Left: Section nav */}
          <ResumeSectionNav
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            templateName={templateName}
            lastSaved={lastSaved}
          />

          {/* Center: Section editor */}
          <main
            className="flex min-w-0 flex-1 flex-col overflow-y-auto"
            style={{ background: "var(--color-agent-surface-low)" }}
          >
            <div className="min-h-full px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6">
              <div className="mx-auto w-full max-w-4xl">
                <SectionEditor
                  section={activeSection}
                  resume={resume}
                  jobId={jobId}
                  onResumeChange={handleResumeChange}
                />
              </div>
            </div>
          </main>

          {/* Right: Draggable live preview */}
          <div className="hidden shrink-0 xl:flex">
            <button
              type="button"
              aria-label="Resize preview panel"
              onMouseDown={(event) => {
                event.preventDefault();
                resizeStartRef.current = {
                  x: event.clientX,
                  width: previewWidth,
                };
                setIsResizingPreview(true);
              }}
              className="hover:bg-agent-primary-container/30 w-1.5 cursor-col-resize transition-colors"
              style={{ background: "var(--color-agent-outline-variant)" }}
            />

            <aside
              className="overflow-y-auto border-l"
              style={{
                width: `${previewWidth}px`,
                background: "var(--color-agent-surface-lowest)",
                borderColor: "var(--color-agent-outline-variant)",
              }}
            >
              <div className="p-4">
                <p
                  className="mb-2 text-xs font-medium tracking-wide uppercase"
                  style={{ color: "var(--color-agent-on-surface-variant)" }}
                >
                  Live Preview
                </p>
                <div
                  className="overflow-hidden rounded-lg border shadow-sm"
                  style={{ borderColor: "var(--color-agent-outline-variant)" }}
                >
                  <div
                    className="origin-top-left scale-[0.52]"
                    style={{ width: "192%", height: "192%" }}
                  >
                    <TemplateRenderer
                      template={customization.template ?? "modern-minimal"}
                      resume={resume}
                      colors={customization.colors ?? DEFAULT_COLORS}
                      fontSize={customization.fontSize ?? "medium"}
                      fontFamily={customization.fontFamily ?? "Inter"}
                    />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <FinalReviewExport
          resume={resume}
          customization={customization}
          onCustomizationChange={handleCustomizationChange}
          jobId={jobId}
        />
      )}
      {/*
      {activeTab === "edit" && (
        <ResumeChatAssistant
          resume={resume}
          onApplyResume={handleResumeChange}
        />
      )} */}
    </div>
  );
}

/**
 * Outer component that provides context to inner editor
 */
export default function EnhancedResumeEditor({
  jobId,
}: EnhancedResumeEditorProps) {
  return (
    <ResumeEditProvider>
      <ResumeEditorContent jobId={jobId} />
    </ResumeEditProvider>
  );
}
