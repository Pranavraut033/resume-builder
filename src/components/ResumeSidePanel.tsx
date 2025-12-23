/**
 * Resume Editor Side Panel
 * Consolidates all resume customization settings, ATS analysis, and job description.
 * This is the single source for all settings not related to content editing.
 */

"use client";

import { useState, useEffect } from "react";
import { ResumeCustomization } from "@/types/resume";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { ATSScorePanel } from "./ATSScorePanel";
import { ATSAnalysis, analyzeResumeForATS } from "@/lib/atsAnalyzer";
import { ResumeJSON } from "@/types/resume";

interface ResumeSidePanelProps {
  resume: ResumeJSON;
  customization: ResumeCustomization;
  onCustomizationChange: (customization: ResumeCustomization) => void;
  onPreview?: () => void;
  onExport?: () => void;
  isAnalyzing?: boolean;
}

export function ResumeSidePanel({
  resume,
  customization,
  onCustomizationChange,
  onPreview,
  onExport,
}: ResumeSidePanelProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [atsAnalysis, setATSAnalysis] = useState<ATSAnalysis | null>(null);
  const [atsLoading, setATSLoading] = useState(false);

  // Analyze resume whenever resume or job description changes
  useEffect(() => {
    if (!jobDescription.trim()) {
      setATSAnalysis(null);
      return;
    }

    const timer = setTimeout(() => {
      const analysis = analyzeResumeForATS(resume, jobDescription);
      setATSAnalysis(analysis);
    }, 500);

    return () => clearTimeout(timer);
  }, [resume, jobDescription]);

  return (
    <div className="w-80 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col h-full">
      {/* Header with action buttons */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <div className="flex gap-2">
          {onPreview && (
            <Button
              variant="primary"
              size="sm"
              onClick={onPreview}
              className="flex-1"
            >
              <Icon name="grid" className="w-4 h-4" />
              Preview
            </Button>
          )}
          {onExport && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onExport}
              className="flex-1"
            >
              <Icon name="download" className="w-4 h-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Job Description Input */}
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
            Paste Job Description
          </h3>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description or requirements here to analyze your resume..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </Card>

        {/* ATS Score Analysis */}
        {jobDescription.trim() && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm px-1">
              ATS Analysis
            </h3>
            <ATSScorePanel analysis={atsAnalysis} isLoading={atsAnalysis === null && jobDescription.trim().length > 0} />
          </div>
        )}

        {/* Customization Settings */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm px-1">
            Appearance
          </h3>
          
          {/* Template Selection */}
          <Card>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template
            </label>
            <select
              value={customization.template || "modern-minimal"}
              onChange={(e) =>
                onCustomizationChange({
                  ...customization,
                  template: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="modern-minimal">Modern Minimal</option>
              <option value="tech-sidebar">Tech Sidebar</option>
              <option value="business-professional">Business Professional</option>
              <option value="elegant-timeline">Elegant Timeline</option>
              <option value="creative-modern">Creative Modern</option>
              <option value="bjet-professional">BJet Professional</option>
            </select>
          </Card>

          {/* Font Selection */}
          <Card>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Font
            </label>
            <select
              value={customization.fontFamily || "Inter"}
              onChange={(e) =>
                onCustomizationChange({
                  ...customization,
                  fontFamily: e.target.value,
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="Inter">Inter</option>
              <option value="Poppins">Poppins</option>
              <option value="Georgia">Georgia</option>
              <option value="Lora">Lora</option>
              <option value="Montserrat">Montserrat</option>
              <option value="Playfair Display">Playfair Display</option>
            </select>
          </Card>

          {/* Font Size Selection */}
          <Card>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </Card>

          {/* Page Format Selection */}
          <Card>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="letter">Letter (8.5" x 11")</option>
              <option value="a4">A4 (210mm x 297mm)</option>
            </select>
          </Card>

          {/* Color Customization */}
          <Card>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
              Colors
            </label>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Primary</label>
                <input
                  type="color"
                  value={customization.colors?.primary || "#3B82F6"}
                  onChange={(e) =>
                    onCustomizationChange({
                      ...customization,
                      colors: {
                        ...customization.colors,
                        primary: e.target.value,
                      },
                    })
                  }
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Text</label>
                <input
                  type="color"
                  value={customization.colors?.text || "#1F2937"}
                  onChange={(e) =>
                    onCustomizationChange({
                      ...customization,
                      colors: {
                        ...customization.colors,
                        text: e.target.value,
                      },
                    })
                  }
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
