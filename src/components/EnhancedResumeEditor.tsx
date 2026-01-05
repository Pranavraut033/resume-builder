// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

"use client";

import { useState, useEffect } from "react";

import {
  getResumeByJobId,
  getResumeCustomization,
  updateResumeCustomization,
  getJobContext,
} from "@/actions/job";
import { getProfile } from "@/actions/profile";
import { AIProvider } from "@/contexts/AIContext";
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
import ResumeEditor from "./ResumeEditor";
import { ResumeSidePanel } from "./ResumeSidePanel";
import { TemplateRenderer } from "./templates/TemplateRenderer";
import { Button } from "./ui";
import { Icon } from "./ui/Icon";

interface EnhancedResumeEditorProps {
  jobId: string;
}

/**
 * Inner editor component that uses the ResumeEditContext
 * Separated to allow context provider to wrap the component
 */
function ResumeEditorContent({ _jobId }: { jobId: string }) {
  const {
    resume,
    setResume,
    _job,
    setJob,
    isLoading,
    setIsLoading,
    error,
    setError,
  } = useResumeEditContext();

  const [customization, setCustomization] = useState<ThemeCustomization>(
    DEFAULT_CUSTOMIZATION
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Load initial data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const jobIdNum = parseInt(jobId);

        // Load resume data, customization, and job context in parallel
        const [resumeData, customizationData, jobData] = await Promise.all([
          getResumeByJobId(jobIdNum),
          getResumeCustomization(jobIdNum),
          getJobContext(jobIdNum),
        ]);

        if (resumeData) {
          setResume(resumeData);
        } else {
          // No resume exists for this job, load profile as starting point
          const profileData = await getProfile();
          setResume(profileData);
        }

        setCustomization(customizationData);

        // Set job context if available
        if (jobData) {
          setJob({
            id: jobData.id,
            details: jobData.jobDetails,
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
    // jobId is a primitive from route params, safe to depend on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Load font whenever customization changes
  useEffect(() => {
    if (customization.fontFamily) {
      loadGoogleFont(customization.fontFamily);
    }
  }, [customization.fontFamily]);

  const handleCustomizationChange = async (
    updates: Partial<ThemeCustomization>
  ) => {
    const newCustomization = {
      ...customization,
      ...updates,
    };

    setCustomization(newCustomization);

    // Save to database
    try {
      await updateResumeCustomization(parseInt(jobId), updates);
    } catch (err) {
      console.error("Failed to save customization:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading resume...
          </p>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <Icon
            name="alert"
            className="mx-auto mb-4 h-16 w-16 text-yellow-500"
          />
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            {error || "Resume Not Found"}
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {error || "No resume data available for this job."}
          </p>
          <Button variant="primary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 lg:flex-row dark:bg-gray-900">
      {/* Main Editor Content */}
      <div className="flex-1">
        <div className="sticky top-14 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto flex max-w-4xl items-center space-x-6">
            <BackButton />

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Resume Editor
            </h1>
            <div
              onClick={() => setIsPreviewMode((s) => !s)}
              className="relative ml-auto h-10 w-20 cursor-pointer space-x-4 overflow-hidden rounded-full border border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700"
            >
              <div className="flex size-full items-center justify-around space-x-2 px-2">
                <Icon
                  name={"pencil"}
                  className={
                    "z-10 size-5 transition " +
                    (isPreviewMode ? "text-gray-400" : "text-primary-500")
                  }
                />
                <Icon
                  name={"EyeIcon"}
                  className={
                    "z-10 size-5 transition " +
                    (isPreviewMode ? "text-primary-500" : "text-gray-400")
                  }
                />
              </div>
              <div
                className={
                  "absolute inset-y-0 w-10 bg-white " +
                  (isPreviewMode ? "translate-x-10" : "translate-x-0") +
                  " transition-transform duration-300 ease-in-out"
                }
              />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {/* Resume Editor */}
          {resume &&
            (isPreviewMode ? (
              <TemplateRenderer
                template={customization.template || "modern-minimal"}
                resume={resume}
                colors={customization.colors || DEFAULT_COLORS}
                fontSize={customization.fontSize || "medium"}
                fontFamily={customization.fontFamily || "Inter"}
              />
            ) : (
              <ResumeEditor jobId={jobId} initialResume={resume} />
            ))}
        </div>
      </div>

      {/* Side Panel */}
      {resume && (
        <ResumeSidePanel
          resume={resume}
          customization={customization}
          onCustomizationChange={handleCustomizationChange}
          jobId={jobId}
        />
      )}
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
    <AIProvider>
      <ResumeEditProvider>
        <ResumeEditorContent jobId={jobId} />
      </ResumeEditProvider>
    </AIProvider>
  );
}
