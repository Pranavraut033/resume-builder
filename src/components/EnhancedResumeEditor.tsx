// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

"use client";

import { useState, useEffect } from "react";
import {
  ResumeJSON,
  ResumeCustomization,
  DEFAULT_CUSTOMIZATION,
} from "@/types/resume";
import { ResumeCustomizationPanel } from "./ResumeCustomizationPanel";
import { TemplateRenderer } from "./templates/TemplateRenderer";
import ResumeEditor from "./ResumeEditor";
import {
  getResumeByJobId,
  getResumeCustomization,
  updateResumeCustomization,
} from "@/actions/job";

interface EnhancedResumeEditorProps {
  jobId: string;
}

export default function EnhancedResumeEditor({
  jobId,
}: EnhancedResumeEditorProps) {
  const [resume, setResume] = useState<ResumeJSON | null>(null);
  const [customization, setCustomization] = useState<ResumeCustomization>(
    DEFAULT_CUSTOMIZATION,
  );
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const jobIdNum = parseInt(jobId);

        // Load resume data and customization in parallel
        const [resumeData, customizationData] = await Promise.all([
          getResumeByJobId(jobIdNum),
          getResumeCustomization(jobIdNum),
        ]);

        if (resumeData) {
          setResume(resumeData);
        }

        setCustomization(customizationData);
      } catch (error) {
        console.error("Failed to load resume data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [jobId]);

  const handleCustomizationChange = async (
    updates: Partial<ResumeCustomization>,
  ) => {
    const newCustomization = {
      ...customization,
      ...updates,
    };

    setCustomization(newCustomization);

    // Save to database
    try {
      await updateResumeCustomization(parseInt(jobId), updates);
    } catch (error) {
      console.error("Failed to save customization:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blocky-500 mx-auto"></div>
          <p className="mt-4 text-blocky-700">Loading resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Original drag-and-drop editor */}
      <div className={showPreview ? "hidden" : "block"}>
        <ResumeEditor jobId={jobId} />
      </div>

      {/* Template preview (when enabled) */}
      {showPreview && resume && (
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-blocky-900">
              Resume Preview
            </h2>
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 bg-blocky-500 text-white rounded-block hover:bg-blocky-600"
            >
              Back to Editor
            </button>
          </div>

          <div className="bg-white shadow-lg">
            <TemplateRenderer
              template={customization.template}
              resume={resume}
              colors={customization.colors}
              fontSize={customization.fontSize}
              fontFamily={customization.fontFamily}
            />
          </div>
        </div>
      )}

      {/* Customization Panel */}
      <ResumeCustomizationPanel
        jobId={parseInt(jobId)}
        customization={customization}
        onCustomizationChange={handleCustomizationChange}
      />

      {/* Toggle Preview Button */}
      {!showPreview && (
        <div className="fixed bottom-8 right-24 z-10">
          <button
            onClick={() => setShowPreview(true)}
            className="rounded-full w-12 h-12 shadow-lg bg-blocky-700 text-white hover:bg-blocky-800 flex items-center justify-center"
            title="Preview with Template"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
