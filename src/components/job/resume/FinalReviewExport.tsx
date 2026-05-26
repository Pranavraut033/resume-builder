"use client";

import { analyzeResume } from "@pranavraut033/ats-checker";
import { Customization } from "@prisma/client";
import { useState, useEffect, useRef, useCallback } from "react";

import { FontSelector } from "@/components/job/FontSelector";
import { TemplateRenderer } from "@/components/job/templates/TemplateRenderer";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { generateResumePDF } from "@/lib/pdfExport";
import { resumeToText } from "@/lib/resumeToText";
import { generateResumeTXT } from "@/lib/txtExport";
import { AVAILABLE_TEMPLATES, TemplateType } from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

import { useToast } from "../../ui/ToastProvider";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const CSS_PIXELS_PER_MM = 96 / 25.4;
const A4_WIDTH_PX = A4_WIDTH_MM * CSS_PIXELS_PER_MM;
const A4_HEIGHT_PX = A4_HEIGHT_MM * CSS_PIXELS_PER_MM;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

interface FinalReviewExportProps {
  resume: ResumeJSON;
  customization: Customization;
  onCustomizationChange: (updates: Partial<Customization>) => void;
  jobId: string;
}

export function FinalReviewExport({
  resume,
  customization,
  onCustomizationChange,
  jobId,
}: FinalReviewExportProps) {
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsKeywords, setAtsKeywords] = useState<string[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [margins, setMargins] = useState<"narrow" | "default" | "wide">(
    "default"
  );
  const [typographySize, setTypographySize] = useState<"compact" | "readable">(
    "readable"
  );
  const [zoomScale, setZoomScale] = useState(1);
  const [isFitMode, setIsFitMode] = useState(true);
  const [renderHeightPx, setRenderHeightPx] = useState(A4_HEIGHT_PX);

  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const previewPageRef = useRef<HTMLDivElement | null>(null);

  const { pushToast } = useToast();

  const recalculateFitZoom = useCallback(() => {
    const viewportEl = previewViewportRef.current;
    if (!viewportEl) return;

    const horizontalPadding = 48;
    const availableWidth = Math.max(
      0,
      viewportEl.clientWidth - horizontalPadding
    );
    const nextZoom = clampZoom(availableWidth / A4_WIDTH_PX);
    setZoomScale(nextZoom);
  }, []);

  useEffect(() => {
    import("@/actions/job").then(({ getJobById }) => {
      getJobById(parseInt(jobId)).then((job) => {
        if (job?.description) setJobDescription(job.description);
      });
    });
  }, [jobId]);

  useEffect(() => {
    if (!jobDescription.trim()) return;
    const resumeText = resumeToText(resume);
    const result = analyzeResume({ resumeText, jobDescription });
    setAtsScore(result.score);
    setAtsKeywords(result.missingKeywords?.slice(0, 5) ?? []);
  }, [resume, jobDescription]);

  useEffect(() => {
    const pageEl = previewPageRef.current;
    if (!pageEl) return;

    const measureHeight = () => {
      const measured = pageEl.scrollHeight;
      setRenderHeightPx(Math.max(A4_HEIGHT_PX, measured));
    };

    measureHeight();

    const observer = new ResizeObserver(measureHeight);
    observer.observe(pageEl);
    return () => observer.disconnect();
  }, [resume, customization]);

  useEffect(() => {
    if (!isFitMode) return;

    recalculateFitZoom();

    const viewportEl = previewViewportRef.current;
    if (!viewportEl) return;

    const observer = new ResizeObserver(() => {
      recalculateFitZoom();
    });
    observer.observe(viewportEl);

    return () => observer.disconnect();
  }, [isFitMode, recalculateFitZoom]);

  const zoomPercent = Math.round(zoomScale * 100);
  const scaledWidthPx = A4_WIDTH_PX * zoomScale;
  const scaledHeightPx = renderHeightPx * zoomScale;
  const pageBreakPositions = Array.from(
    { length: Math.max(0, Math.floor((renderHeightPx - 1) / A4_HEIGHT_PX)) },
    (_, index) => (index + 1) * A4_HEIGHT_PX
  );

  const handlePDFExport = async () => {
    setIsExporting(true);
    try {
      const filename = `${resume.header.name ?? "Resume"}.pdf`;
      await generateResumePDF(resume, customization, filename);
    } catch (err) {
      console.error("PDF export failed:", err);
      pushToast({ title: "PDF export failed", variant: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleTXTExport = () => {
    const text = generateResumeTXT(resume);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resume.header.name ?? "resume"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scoreColor =
    atsScore === null
      ? "var(--color-agent-on-surface-variant)"
      : atsScore >= 80
        ? "#22c55e"
        : atsScore >= 60
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div
      className="flex min-h-0 flex-1 overflow-hidden"
      style={{ background: "var(--color-agent-surface-lowest)" }}
    >
      {/* Left: Full resume preview */}
      <div
        className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r p-6"
        style={{ borderColor: "var(--color-agent-outline-variant)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--color-agent-on-surface)" }}
            >
              Final Review
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 rounded-lg border px-2 py-1"
              style={{
                borderColor: "var(--color-agent-outline-variant)",
                background: "var(--color-agent-surface)",
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setIsFitMode(true);
                  recalculateFitZoom();
                }}
                style={
                  isFitMode
                    ? {
                        background: "var(--color-agent-primary-container)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : undefined
                }
              >
                Fit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setIsFitMode(false);
                  setZoomScale(1);
                }}
                style={
                  !isFitMode && zoomPercent === 100
                    ? {
                        background: "var(--color-agent-primary-container)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : undefined
                }
              >
                100%
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setIsFitMode(false);
                  setZoomScale((current) => clampZoom(current - ZOOM_STEP));
                }}
                aria-label="Zoom out"
              >
                <Icon name="minus" className="h-4 w-4" />
              </Button>
              <span
                className="w-14 text-center text-xs font-semibold tabular-nums"
                style={{ color: "var(--color-agent-on-surface)" }}
              >
                {zoomPercent}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setIsFitMode(false);
                  setZoomScale((current) => clampZoom(current + ZOOM_STEP));
                }}
                aria-label="Zoom in"
              >
                <Icon name="plus" className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="secondary"
              onClick={() => {
                const text = resumeToText(resume);
                navigator.clipboard.writeText(text);
                pushToast({ title: "Resume text copied to clipboard" });
              }}
            >
              <Icon name="Copy" className="mr-1.5 h-4 w-4" />
              Copy Text
            </Button>
          </div>
        </div>

        <div className="bg-agent-inverse-on-surface border-agent-outline-variant overflow-hidden rounded-xl border shadow-md">
          <div ref={previewViewportRef} className="h-full overflow-auto p-6">
            <div
              className="relative mx-auto"
              style={{ width: scaledWidthPx, minHeight: scaledHeightPx }}
            >
              <div
                className="absolute top-0 left-0 origin-top-left"
                style={{
                  transform: `scale(${zoomScale})`,
                  width: `${A4_WIDTH_MM}mm`,
                }}
              >
                <div
                  ref={previewPageRef}
                  className="bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                  style={{
                    width: `${A4_WIDTH_MM}mm`,
                    minHeight: `${A4_HEIGHT_MM}mm`,
                    breakAfter: "page",
                  }}
                >
                  <TemplateRenderer
                    template={customization.template ?? "modern-minimal"}
                    resume={resume}
                    customization={customization}
                  />
                </div>
              </div>

              {pageBreakPositions.map((breakPosition, index) => (
                <div
                  key={`${breakPosition}-${index}`}
                  className="pointer-events-none absolute right-0 left-0"
                  style={{ top: breakPosition * zoomScale }}
                >
                  <div
                    className="flex h-7 items-center gap-3 px-3"
                    style={{
                      transform: "translateY(-50%)",
                      background: "var(--color-agent-surface-lowest)",
                    }}
                  >
                    <div
                      className="h-px flex-1"
                      style={{
                        background:
                          "linear-gradient(to right, transparent, var(--color-agent-outline), transparent)",
                      }}
                    />
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                      style={{
                        color: "var(--color-agent-on-surface-variant)",
                        background: "var(--color-agent-surface-container)",
                      }}
                    >
                      Page Break
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{
                        background:
                          "linear-gradient(to right, transparent, var(--color-agent-outline), transparent)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Settings & export */}
      <aside
        className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto p-4"
        style={{ background: "var(--color-agent-surface-low)" }}
      >
        {/* Template selection */}
        <Card>
          <h3
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Modern Professional
          </h3>
          <p
            className="mb-3 text-xs"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Pick a template style before exporting.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() =>
                  onCustomizationChange({ template: t.id as TemplateType })
                }
                className="rounded-lg border px-3 py-2 text-left text-xs transition-all"
                style={
                  customization.template === t.id
                    ? {
                        background: "var(--color-agent-primary-container)",
                        borderColor: "var(--color-agent-primary)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : {
                        background: "var(--color-agent-surface-container)",
                        borderColor: "var(--color-agent-outline-variant)",
                        color: "var(--color-agent-on-surface)",
                      }
                }
              >
                <span className="font-medium">{t.name}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Layout settings */}
        <Card>
          <h3
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Layout Settings
          </h3>

          <div className="mb-4">
            <p
              className="mb-2 text-xs font-medium"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Margins
            </p>
            <div
              className="flex rounded-lg p-0.5"
              style={{ background: "var(--color-agent-surface-container)" }}
            >
              {(["narrow", "default", "wide"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMargins(m)}
                  className="flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all"
                  style={
                    margins === m
                      ? {
                          background: "var(--color-agent-primary-container)",
                          color: "var(--color-agent-on-primary-container)",
                        }
                      : { color: "var(--color-agent-on-surface-variant)" }
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p
              className="mb-2 text-xs font-medium"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Typography Size
            </p>
            <div
              className="flex rounded-lg p-0.5"
              style={{ background: "var(--color-agent-surface-container)" }}
            >
              {(["compact", "readable"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setTypographySize(size)}
                  className="flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all"
                  style={
                    typographySize === size
                      ? {
                          background: "var(--color-agent-primary-container)",
                          color: "var(--color-agent-on-primary-container)",
                        }
                      : { color: "var(--color-agent-on-surface-variant)" }
                  }
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color accent */}
          <div className="mb-4">
            <p
              className="mb-2 text-xs font-medium"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Color Accent
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  title={preset.name}
                  onClick={() =>
                    onCustomizationChange({ colors: preset.colors })
                  }
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: preset.hex,
                    borderColor:
                      customization.colors?.primary === preset.colors.primary
                        ? "var(--color-agent-on-surface)"
                        : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <p
              className="mb-2 text-xs font-medium"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Font
            </p>
            <FontSelector
              value={customization.fontFamily ?? "Inter"}
              onChange={(font) => onCustomizationChange({ fontFamily: font })}
            />
          </div>
        </Card>

        {/* ATS Score */}
        {atsScore !== null && (
          <Card>
            <div className="flex items-center justify-between">
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--color-agent-on-surface)" }}
              >
                Resume Integrity
              </h3>
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: scoreColor }}
              >
                ATS {atsScore}%
              </span>
            </div>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Your resume is optimized for applicant tracking systems.
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full"
              style={{ background: "var(--color-agent-surface-container)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${atsScore}%`, background: scoreColor }}
              />
            </div>
            {atsKeywords.length > 0 && (
              <div className="mt-3">
                <p
                  className="mb-1.5 text-xs font-medium"
                  style={{ color: "var(--color-agent-on-surface-variant)" }}
                >
                  Missing keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {atsKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{
                        background: "var(--color-agent-surface-container)",
                        color: "var(--color-agent-on-surface-variant)",
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Finalize & Export */}
        <Card>
          <h3
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Finalize &amp; Export
          </h3>
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={handlePDFExport}
              disabled={isExporting}
              className="w-full justify-center"
            >
              <Icon name="Download" className="mr-2 h-4 w-4" />
              {isExporting ? "Generating PDF…" : "Download PDF"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleTXTExport}
              className="w-full justify-center"
            >
              <Icon name="FileText" className="mr-2 h-4 w-4" />
              Download Word (TXT)
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-center"
              disabled={isCopyingLink}
              onClick={async () => {
                try {
                  setIsCopyingLink(true);
                  await navigator.clipboard.writeText(window.location.href);
                } finally {
                  setIsCopyingLink(false);
                }
              }}
            >
              <Icon name="link" className="mr-2 h-4 w-4" />
              {isCopyingLink ? "Copying…" : "Share Link"}
            </Button>
          </div>
        </Card>
      </aside>
    </div>
  );
}
