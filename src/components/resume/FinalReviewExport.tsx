"use client";

import { analyzeResume } from "@pranavraut033/ats-checker";
import { useState, useEffect } from "react";

import { FontSelector } from "@/components/FontSelector";
import { TemplateRenderer } from "@/components/templates/TemplateRenderer";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { generateResumePDF } from "@/lib/pdfExport";
import { generateResumeTXT } from "@/lib/txtExport";
import {
  ResumeJSON,
  ThemeCustomization,
  ThemeColors,
  DEFAULT_COLORS,
  AVAILABLE_TEMPLATES,
  TemplateType,
} from "@/types/resume";

const COLOR_PRESETS: Array<{ name: string; hex: string; colors: ThemeColors }> =
  [
    {
      name: "Blue",
      hex: "#3b82f6",
      colors: { ...DEFAULT_COLORS, primary: "#3b82f6", accent: "#8b5cf6" },
    },
    {
      name: "Navy",
      hex: "#1e40af",
      colors: {
        ...DEFAULT_COLORS,
        primary: "#1e40af",
        secondary: "#3b82f6",
        accent: "#1e3a8a",
      },
    },
    {
      name: "Green",
      hex: "#10b981",
      colors: {
        ...DEFAULT_COLORS,
        primary: "#10b981",
        secondary: "#6ee7b7",
        accent: "#059669",
      },
    },
    {
      name: "Purple",
      hex: "#8b5cf6",
      colors: {
        ...DEFAULT_COLORS,
        primary: "#8b5cf6",
        secondary: "#a78bfa",
        accent: "#7c3aed",
      },
    },
    {
      name: "Rose",
      hex: "#e11d48",
      colors: {
        ...DEFAULT_COLORS,
        primary: "#e11d48",
        secondary: "#fb7185",
        accent: "#be123c",
      },
    },
    {
      name: "Teal",
      hex: "#14b8a6",
      colors: {
        ...DEFAULT_COLORS,
        primary: "#14b8a6",
        secondary: "#5eead4",
        accent: "#0d9488",
      },
    },
    {
      name: "Orange",
      hex: "#f97316",
      colors: {
        ...DEFAULT_COLORS,
        primary: "#f97316",
        secondary: "#fb923c",
        accent: "#ea580c",
      },
    },
    {
      name: "Gray",
      hex: "#6b7280",
      colors: {
        ...DEFAULT_COLORS,
        primary: "#6b7280",
        secondary: "#9ca3af",
        accent: "#374151",
      },
    },
  ];

interface FinalReviewExportProps {
  resume: ResumeJSON;
  customization: ThemeCustomization;
  onCustomizationChange: (updates: Partial<ThemeCustomization>) => void;
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

  const handlePDFExport = async () => {
    setIsExporting(true);
    try {
      await generateResumePDF(resume);
    } catch (err) {
      console.error("PDF export failed:", err);
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
            <p
              className="text-xs"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Page 1 of 1
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              const text = resumeToText(resume);
              navigator.clipboard.writeText(text);
            }}
          >
            <Icon name="Copy" className="mr-1.5 h-4 w-4" />
            Copy Text
          </Button>
        </div>

        <div
          className="overflow-hidden rounded-xl border shadow-md"
          style={{ borderColor: "var(--color-agent-outline-variant)" }}
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

function resumeToText(resume: ResumeJSON): string {
  const lines: string[] = [];
  const h = resume.header;
  lines.push(h.name, h.email, h.phone ?? "", h.location ?? "");
  lines.push(resume.summary ?? "");
  resume.experience.forEach((e) => {
    lines.push(
      `${e.role} at ${e.company} (${e.startDate}–${e.endDate ?? "Present"})`
    );
    lines.push(e.description);
    e.achievements.forEach((a) => lines.push(a));
  });
  resume.education.forEach((e) => {
    lines.push(`${e.degree} in ${e.field}, ${e.institution}`);
  });
  lines.push(resume.skills.join(", "));
  return lines.filter(Boolean).join("\n");
}
