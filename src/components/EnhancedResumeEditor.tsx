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
import { ResumeSidePanel } from "./ResumeSidePanel";
import { ResumePreviewModal } from "./ResumePreviewModal";
import { ExportDropdown } from "./ExportDropdown";
import ResumeEditor from "./ResumeEditor";
import {
  getResumeByJobId,
  getResumeCustomization,
  updateResumeCustomization,
} from "@/actions/job";
import { getProfile } from "@/actions/profile";
import { generateResumePDF } from "@/lib/pdfExport";
import { Button } from "./ui";
import { Icon } from "./ui/Icon";

type IconName = React.ComponentProps<typeof Icon>["name"];

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
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const jobIdNum = parseInt(jobId);

        // Load resume data and customization in parallel
        const [resumeData, customizationData] = await Promise.all([
          getResumeByJobId(jobIdNum),
          getResumeCustomization(jobIdNum),
        ]);

        if (resumeData) {
          setResume(resumeData);
        } else {
          // No resume exists for this job, load profile as starting point
          const profileData = await getProfile();
          setResume(profileData);
        }

        setCustomization(customizationData);
      } catch (error) {
        console.error("Failed to load resume data:", error);
        setError("Failed to load resume data. Please try again.");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <Icon name="alert" className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error || "Resume Not Found"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || "No resume data available for this job."}
          </p>
          <Button
            variant="primary"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col lg:flex-row">
      {/* Main Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Resume Editor
            </h1>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowPreviewModal(true)}
                icon={<Icon name="grid" />}
              >
                Preview
              </Button>
              <ExportDropdown options={exportOptions} defaultLabel="Export" />
            </div>
          </div>
        </div>

        {/* Resume Editor */}
        {resume && <ResumeEditor jobId={jobId} initialResume={resume} />}
      </div>

      {/* Side Panel */}
      {resume && (
        <ResumeSidePanel
          resume={resume}
          customization={customization}
          onCustomizationChange={handleCustomizationChange}
          onPreview={() => setShowPreviewModal(true)}
          onExport={handleExportPDF}
        />
      )}

      {/* Preview Modal */}
      {resume && (
        <ResumePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          resume={resume}
          customization={customization}
        />
      )}
    </div>
  );
}
