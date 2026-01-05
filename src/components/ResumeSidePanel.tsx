/**
 * Resume Editor Side Panel
 * Consolidates all resume customization settings, ATS analysis, and job description.
 * This is the single source for all settings not related to content editing.
 */

"use client";

import {
  analyzeResume,
  analyzeResumeAsync,
  ATSAnalysisResult,
} from "@pranavraut033/ats-checker";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { createLLMClient } from "@/lib/atsLLMClient";
import { loadGoogleFont } from "@/lib/fontLoader";
import { generateResumePDF } from "@/lib/pdfExport";
import { generateRequestId } from "@/lib/tokenTracker";
import { useModelStore } from "@/store/modelStore";
import { ResumeJSON } from "@/types/resume";
import {
  ThemeCustomization,
  ThemeColors,
  DEFAULT_COLORS,
} from "@/types/resume";

import { ATSScorePanel } from "./ATSScorePanel";
import { ExportDropdown } from "./ExportDropdown";
import { FontSelector } from "./FontSelector";

const COLOR_PRESETS: Array<{ name: string; colors: ThemeColors }> = [
  {
    name: "Default Blue",
    colors: DEFAULT_COLORS,
  },
  {
    name: "Professional Gray",
    colors: {
      primary: "#6b7280",
      secondary: "#9ca3af",
      accent: "#374151",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Modern Green",
    colors: {
      primary: "#10b981",
      secondary: "#6ee7b7",
      accent: "#059669",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Creative Purple",
    colors: {
      primary: "#8b5cf6",
      secondary: "#a78bfa",
      accent: "#7c3aed",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Executive Navy",
    colors: {
      primary: "#1e40af",
      secondary: "#3b82f6",
      accent: "#1e3a8a",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Elegant Rose",
    colors: {
      primary: "#e11d48",
      secondary: "#fb7185",
      accent: "#be123c",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Tech Teal",
    colors: {
      primary: "#14b8a6",
      secondary: "#5eead4",
      accent: "#0d9488",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Warm Orange",
    colors: {
      primary: "#f97316",
      secondary: "#fb923c",
      accent: "#ea580c",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
];

interface ResumeSidePanelProps {
  resume: ResumeJSON;
  customization: ThemeCustomization;
  onCustomizationChange: (customization: ThemeCustomization) => void;
  onPreview?: () => void;
  onExport?: () => void;
  jobId?: string;
}

export function ResumeSidePanel({
  resume,
  customization,
  onCustomizationChange,
  onPreview,
  jobId,
}: ResumeSidePanelProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "ats" | "customization">(
    "customization"
  );
  const [atsAnalysis, setATSAnalysis] = useState<ATSAnalysisResult | null>(
    null
  );
  const [jobDescription, setJobDescription] = useState("");
  const [enableLLM, setEnableLLM] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>("custom");
  const selectedProvider = useModelStore((s) => s.getSelectedProvider());
  const selectedModel = useModelStore((s) => s.getAllSelectedModels()[0]);

  // Check if current colors match any preset
  useEffect(() => {
    const colors = customization.colors || DEFAULT_COLORS;
    const matchingPreset = COLOR_PRESETS.find(
      (preset) =>
        preset.colors.primary === colors.primary &&
        preset.colors.secondary === colors.secondary &&
        preset.colors.accent === colors.accent &&
        preset.colors.text === colors.text &&
        preset.colors.background === colors.background
    );
    setSelectedTheme(matchingPreset?.name || "custom");
  }, [customization.colors]);

  // Load font when fontFamily changes
  useEffect(() => {
    if (customization.fontFamily) {
      loadGoogleFont(customization.fontFamily);
    }
  }, [customization.fontFamily]);

  // Fetch job description from jobId
  useEffect(() => {
    if (!jobId) return;

    import("@/actions/job").then(({ getJobById }) => {
      getJobById(parseInt(jobId)).then((job) => {
        if (job?.description) {
          setJobDescription(job.description);
        }
      });
    });
  }, [jobId]);

  // Analyze resume whenever resume or job description changes
  useEffect(() => {
    if (!jobDescription.trim()) {
      setATSAnalysis(null);
      return;
    }

    const timer = setTimeout(async () => {
      const resumeText = resumeToText(resume);
      const requestId = generateRequestId(); // Generate ID for grouping ATS LLM calls
      try {
        let analysis: ATSAnalysisResult;
        if (enableLLM && selectedProvider && selectedModel) {
          const llmClient = await createLLMClient(selectedProvider, requestId);
          if (llmClient) {
            analysis = await analyzeResumeAsync({
              resumeText,
              jobDescription,
              llm: {
                client: llmClient,
                models: { default: selectedModel },
                limits: {
                  maxCalls: 3,
                  maxTokensPerCall: 1000,
                  maxTotalTokens: 5000,
                },
                enable: { suggestions: true },
              },
            });
          } else {
            analysis = analyzeResume({ resumeText, jobDescription });
          }
        } else {
          analysis = analyzeResume({ resumeText, jobDescription });
        }
        setATSAnalysis(analysis);
      } catch (_e) {
        const fallback = analyzeResume({ resumeText, jobDescription });
        setATSAnalysis(fallback);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [resume, jobDescription, selectedProvider, selectedModel, enableLLM]);

  type IconName = React.ComponentProps<typeof Icon>["name"];

  const handleThemeChange = (themeName: string) => {
    setSelectedTheme(themeName);
    if (themeName !== "custom") {
      const preset = COLOR_PRESETS.find((p) => p.name === themeName);
      if (preset) {
        onCustomizationChange({
          ...customization,
          colors: preset.colors,
        });
      }
    }
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setSelectedTheme("custom");
    onCustomizationChange({
      ...customization,
      colors: {
        ...customization.colors,
        [key]: value,
      },
    });
  };

  const handleExportPDF = () => {
    if (!resume) return;
    generateResumePDF(resume);
  };

  const handleExportJSON = () => {
    if (!resume) return;
    const dataStr = JSON.stringify(resume, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resume-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportOptions: Array<{
    label: string;
    icon: IconName;
    description: string;
    onExport: () => void;
  }> = [
    {
      label: "PDF",
      icon: "download",
      description: "Download as PDF",
      onExport: handleExportPDF,
    },
    {
      label: "JSON",
      icon: "fileText",
      description: "Export as JSON",
      onExport: handleExportJSON,
    },
  ];

  return (
    <div
      className="sticky top-20 flex w-80 flex-col space-y-4 overflow-hidden border-l border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
      style={{ height: "calc(100vh - 5rem)" }}
    >
      {/* Header with action buttons */}
      <Button
        variant="secondary"
        onClick={onPreview}
        icon={<Icon name="grid" />}
      >
        Preview
      </Button>
      <ExportDropdown options={exportOptions} defaultLabel="Export" />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("ats")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "ats"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          ATS
        </button>
        <button
          onClick={() => setActiveTab("customization")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "customization"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Customization
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* ATS Tab */}
        {activeTab === "ats" && (
          <div>
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                ATS Analysis
              </h3>
              {selectedProvider && selectedModel && (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enableLLM}
                    onChange={(e) => setEnableLLM(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    AI Enhanced
                  </span>
                </label>
              )}
            </div>
            <ATSScorePanel
              analysis={atsAnalysis}
              isLoading={
                atsAnalysis === null && jobDescription.trim().length > 0
              }
            />
          </div>
        )}

        {/* Customization Tab */}
        {activeTab === "customization" && (
          <div className="space-y-4">
            <h3 className="mb-3 px-1 text-sm font-semibold text-gray-900 dark:text-white">
              Appearance
            </h3>

            {/* Template Selection */}
            <Card>
              <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Template
              </label>
              <select
                value={customization.template || "modern-minimal"}
                onChange={(e) =>
                  onCustomizationChange({
                    ...customization,
                    template: e.target.value as unknown as string,
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="modern-minimal">Modern Minimal</option>
                <option value="tech-sidebar">Tech Sidebar</option>
                <option value="business-professional">
                  Business Professional
                </option>
                <option value="elegant-timeline">Elegant Timeline</option>
                <option value="creative-modern">Creative Modern</option>
                <option value="bjet-professional">BJet Professional</option>
              </select>
            </Card>

            {/* Font Selection */}
            <Card>
              <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Font
              </label>
              <FontSelector
                value={customization.fontFamily || "Inter"}
                onChange={(font) =>
                  onCustomizationChange({
                    ...customization,
                    fontFamily: font,
                  })
                }
              />
            </Card>

            {/* Font Size Selection */}
            <Card>
              <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Font Size
              </label>
              <select
                value={customization.fontSize || "medium"}
                onChange={(e) =>
                  onCustomizationChange({
                    ...customization,
                    fontSize: e.target.value as "small" | "medium" | "large",
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </Card>

            {/* Page Format Selection */}
            <Card>
              <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Page Format
              </label>
              <select
                value={customization.pageFormat || "letter"}
                onChange={(e) =>
                  onCustomizationChange({
                    ...customization,
                    pageFormat: e.target.value as "letter" | "a4",
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="letter">Letter (8.5" x 11")</option>
                <option value="a4">A4 (210mm x 297mm)</option>
              </select>
            </Card>

            {/* Color Theme Selection */}
            <Card>
              <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Color Theme
              </label>
              <select
                value={selectedTheme}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {COLOR_PRESETS.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>

              {/* Color Preview for Preset Themes */}
              {selectedTheme !== "custom" && (
                <div className="mt-3">
                  <div className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                    Theme Colors
                  </div>
                  <div className="flex gap-2">
                    <div
                      className="h-10 w-10 rounded border border-gray-300 dark:border-gray-600"
                      style={{
                        backgroundColor:
                          customization.colors?.primary ||
                          DEFAULT_COLORS.primary,
                      }}
                      title="Primary"
                    />
                    <div
                      className="h-10 w-10 rounded border border-gray-300 dark:border-gray-600"
                      style={{
                        backgroundColor:
                          customization.colors?.secondary ||
                          DEFAULT_COLORS.secondary,
                      }}
                      title="Secondary"
                    />
                    <div
                      className="h-10 w-10 rounded border border-gray-300 dark:border-gray-600"
                      style={{
                        backgroundColor:
                          customization.colors?.accent || DEFAULT_COLORS.accent,
                      }}
                      title="Accent"
                    />
                    <div
                      className="h-10 w-10 rounded border border-gray-300 dark:border-gray-600"
                      style={{
                        backgroundColor:
                          customization.colors?.text || DEFAULT_COLORS.text,
                      }}
                      title="Text"
                    />
                  </div>
                </div>
              )}

              {/* Custom Color Pickers - Only show when Custom is selected */}
              {selectedTheme === "custom" && (
                <div className="mt-3 space-y-2">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">
                      Primary
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="color"
                        value={
                          customization.colors?.primary ||
                          DEFAULT_COLORS.primary
                        }
                        onChange={(e) =>
                          handleColorChange("primary", e.target.value)
                        }
                        className="h-8 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={
                          customization.colors?.primary ||
                          DEFAULT_COLORS.primary
                        }
                        onChange={(e) =>
                          handleColorChange("primary", e.target.value)
                        }
                        placeholder="#3b82f6"
                        className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">
                      Secondary
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="color"
                        value={
                          customization.colors?.secondary ||
                          DEFAULT_COLORS.secondary
                        }
                        onChange={(e) =>
                          handleColorChange("secondary", e.target.value)
                        }
                        className="h-8 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={
                          customization.colors?.secondary ||
                          DEFAULT_COLORS.secondary
                        }
                        onChange={(e) =>
                          handleColorChange("secondary", e.target.value)
                        }
                        placeholder="#64748b"
                        className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">
                      Accent
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="color"
                        value={
                          customization.colors?.accent || DEFAULT_COLORS.accent
                        }
                        onChange={(e) =>
                          handleColorChange("accent", e.target.value)
                        }
                        className="h-8 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={
                          customization.colors?.accent || DEFAULT_COLORS.accent
                        }
                        onChange={(e) =>
                          handleColorChange("accent", e.target.value)
                        }
                        placeholder="#8b5cf6"
                        className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">
                      Text
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="color"
                        value={
                          customization.colors?.text || DEFAULT_COLORS.text
                        }
                        onChange={(e) =>
                          handleColorChange("text", e.target.value)
                        }
                        className="h-8 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={
                          customization.colors?.text || DEFAULT_COLORS.text
                        }
                        onChange={(e) =>
                          handleColorChange("text", e.target.value)
                        }
                        placeholder="#1f2937"
                        className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
// Convert ResumeJSON to plain text for ATS analysis
function resumeToText(r: ResumeJSON): string {
  const sections: string[] = [];

  if (r.header) {
    sections.push(r.header.name || "");
    if (r.header.email) sections.push(r.header.email);
    if (r.header.phone) sections.push(r.header.phone);
    if (r.header.location) sections.push(r.header.location);
    if (r.header.linkedin) sections.push(r.header.linkedin);
    if (r.header.github) sections.push(r.header.github);
    if (r.header.website) sections.push(r.header.website);
  }

  if (r.summary) {
    sections.push("Summary");
    sections.push(r.summary);
  }

  if (r.experience && r.experience.length > 0) {
    sections.push("Experience");
    r.experience.forEach((exp) => {
      if (exp.company) sections.push(exp.company);
      if (exp.role) sections.push(exp.role);
      if (exp.startDate) sections.push(`Start Date: ${exp.startDate}`);
      if (exp.endDate) sections.push(`End Date: ${exp.endDate}`);
      if (exp.description) sections.push(exp.description);
      if (exp.achievements && exp.achievements.length > 0) {
        sections.push(exp.achievements.join(" "));
      }
    });
  }

  if (r.skills && r.skills.length > 0) {
    sections.push("Skills");
    sections.push(r.skills.join(", "));
  }

  if (r.projects && r.projects.length > 0) {
    sections.push("Projects");
    r.projects.forEach((proj) => {
      if (proj.name) sections.push(proj.name);
      if (proj.description) sections.push(proj.description);
      if (proj.technologies && proj.technologies.length > 0) {
        sections.push(proj.technologies.join(", "));
      }
      if (proj.url) sections.push(proj.url);
    });
  }

  if (r.education && r.education.length > 0) {
    sections.push("Education");
    r.education.forEach((edu) => {
      if (edu.institution) sections.push(edu.institution);
      if (edu.degree) sections.push(edu.degree);
      if (edu.field) sections.push(edu.field);
      if (edu.endDate) sections.push(`Graduation: ${edu.endDate}`);
    });
  }

  if (r.certifications && r.certifications.length > 0) {
    sections.push("Certifications");
    r.certifications.forEach((cert) => {
      if (cert.name) sections.push(cert.name);
      if (cert.issuer) sections.push(cert.issuer);
      if (cert.date) sections.push(cert.date);
    });
  }

  return sections.filter(Boolean).join("\n");
}
