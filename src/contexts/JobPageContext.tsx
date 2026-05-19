/**
 * Unified Editor Context Provider
 * Manages both resume and cover letter editing with shared state for:
 * - Content data (resume or cover letter)
 * - Job context
 * - Customization (theme, colors, fonts, template)
 *
 * LLM operations are handled by AIContext to avoid duplication
 */

"use client";

import { RefetchOptions, useMutation } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useEffect,
} from "react";

import { JobData } from "@/actions/job";
import {
  updateCoverLetter as updateCoverLetterAction,
  updateResume as updateResumeAction,
} from "@/actions/job";
import { Button } from "@/components/ui/Button";
import { FallbackState } from "@/components/ui/FallbackState";
import { useToast } from "@/components/ui/ToastProvider";
import { JobPageData, useJobPageDataQuery } from "@/hooks/useJobPageDataQuery";
import { areJsonValuesEqual } from "@/lib";
import { loadGoogleFont } from "@/lib/fontLoader";
import { coverLetterToText, resumeToText } from "@/lib/resumeToText";
import {
  DEFAULT_CUSTOMIZATION,
  SanitizedCustomization,
} from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

export type EditorContentType = "resume" | "coverLetter";
type SanitizedFields = "id" | "createdAt" | "updatedAt";

export type Sanitize<T> = Omit<T, SanitizedFields>;

export interface JobPageContextType {
  contentType: EditorContentType;
  coverLetter: string;
  customization: SanitizedCustomization;
  job: JobData;
  profile: ResumeJSON;
  resume: ResumeJSON;
  updateCoverLetter: (text: string) => void;
  updateCustomization: (
    updates: Partial<Sanitize<SanitizedCustomization>>
  ) => void;
  updateResume: (updates: Partial<Sanitize<ResumeJSON>>) => void;
  refetch: (options?: RefetchOptions, ...fields: (keyof JobPageData)[]) => void;
  isExportingPdf: boolean;
  isExportingTxt: boolean;
  onPDFExport: () => void;
  onTXTExport: () => void;
  onCopyText: () => void;
  saveToDb: <T extends EditorContentType>(
    contentType: T,
    data: T extends "resume" ? ResumeJSON : string,
    customization: SanitizedCustomization
  ) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  isDirtyCoverLetter: boolean;
  isDirtyResume: boolean;
}

const JobPageContext = createContext<JobPageContextType | null>(null);

interface JobPageProviderProps {
  children: ReactNode;
  contentType: EditorContentType;
  serverData: JobPageData;
  jobId: number;
}

export function JobPageProvider({
  children,
  contentType,
  serverData,
  jobId,
}: JobPageProviderProps) {
  const { data, isLoading, isError, refetch } = useJobPageDataQuery(
    jobId,
    serverData
  );

  const [isExportingTxt, setIsExportingTxt] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [resume, setResumeState] = useState<ResumeJSON>(
    data?.resume?.contentJson ??
      (JSON.parse(JSON.stringify(data?.profile ?? {})) as ResumeJSON) // Deep clone to prevent direct mutations
  );

  const [coverLetter, updateCoverLetter] = useState<string>(
    data?.coverLetter?.contentText || ""
  );

  const [customization, setCustomization] = useState<SanitizedCustomization>(
    (contentType === "coverLetter" && data?.coverLetter
      ? data.coverLetter?.customizations
      : data?.resume && data.resume?.customizations) ?? DEFAULT_CUSTOMIZATION
  );

  const { pushToast } = useToast();

  const updateResume = useCallback((updates: Partial<Sanitize<ResumeJSON>>) => {
    setResumeState((prev) => {
      const updated = { ...prev, ...updates };

      return updated;
    });
  }, []);

  const updateCustomization = useCallback(
    (updates: Partial<SanitizedCustomization>) =>
      setCustomization((prev) => ({ ...prev, ...updates })),
    []
  );

  const onPDFExport = () => {
    setIsExportingPdf(true);
    setTimeout(() => {
      setIsExportingPdf(false);
    }, 2000);
  };

  const generateContentText = useCallback(() => {
    if (contentType === "coverLetter") {
      return coverLetterToText(coverLetter, resume);
    } else {
      return resumeToText(resume);
    }
  }, [contentType, coverLetter, resume]);

  const onTXTExport = () => {
    if (!job)
      return pushToast({
        title: "No job context",
        description: "Cannot export without job context.",
        variant: "error",
      });
    setIsExportingTxt(true);
    const textContent = generateContentText();
    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      contentType === "coverLetter"
        ? `${job.company?.name} Cover Letter.txt`
        : `${job.company?.name} ${resume.header.name}-Resume.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setIsExportingTxt(false);
    }, 2000);
  };

  const onCopyText = () => {
    navigator.clipboard.writeText(generateContentText());

    pushToast({
      title: "Content copied to clipboard",
      variant: "success",
    });
  };
  const { mutate: saveCoverLetter, status: coverLetterStatus } = useMutation({
    mutationFn: (data: {
      coverLetter: string;
      customization: SanitizedCustomization;
    }) => updateCoverLetterAction(jobId, data.coverLetter, data.customization),
    onSuccess: () => {
      refetch(undefined, "coverLetter");
      pushToast({ title: "Cover letter saved", variant: "success" });
    },
    onError: (err) => {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to save cover letter";
      console.error("Failed to save cover letter:", err);
      pushToast({
        title: "Save failed",
        description: errorMsg,
        variant: "error",
      });
    },
  });

  const { mutate: saveResume, status: resumeStatus } = useMutation({
    mutationFn: (data: {
      resume: ResumeJSON;
      customization: SanitizedCustomization;
    }) => updateResumeAction(jobId, data.resume, data.customization),
    onSuccess: () => {
      refetch(undefined, "resume");
      pushToast({ title: "Resume saved", variant: "success" });
    },
    onError: (err) => {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to save resume";
      console.error("Failed to save resume:", err);
      pushToast({
        title: "Save failed",
        description: errorMsg,
        variant: "error",
      });
    },
  });

  const saveToDb = useCallback(
    <T extends EditorContentType>(
      contentType: T,
      data: T extends "resume" ? ResumeJSON : string,
      customization: SanitizedCustomization
    ) => {
      if (contentType === "coverLetter")
        saveCoverLetter({ coverLetter: data as string, customization });
      else saveResume({ resume: data as ResumeJSON, customization });
    },
    [saveCoverLetter, saveResume]
  );

  useEffect(() => {
    if (customization.fontFamily) {
      loadGoogleFont(customization.fontFamily);
    }
  }, [customization.fontFamily]);

  const isDirtyCoverLetter = useMemo(() => {
    return data?.coverLetter?.contentText !== coverLetter;
  }, [coverLetter, data?.coverLetter]);

  const isDirtyResume = useMemo(() => {
    if (!data?.resume?.contentJson) return false;
    return !areJsonValuesEqual(data?.resume?.contentJson, resume);
  }, [resume, data?.resume]);

  if (isLoading) {
    return (
      <FallbackState
        iconName="loader"
        title="Loading editor context"
        description="Fetching your resume and cover letter data. This should only take a moment."
        action={null}
      />
    );
  }

  if (!data || isError) {
    return (
      <FallbackState
        title="Editor context unavailable"
        description="We couldn’t load your editor data right now. Refresh the app or try again later."
        action={
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        }
      />
    );
  }

  const job = data.job;
  const value: JobPageContextType = {
    contentType,
    coverLetter,
    customization,
    job,
    profile: data.profile,
    resume: resume,
    updateCoverLetter,
    updateCustomization,
    updateResume,
    refetch,
    isExportingPdf,
    isExportingTxt,
    onPDFExport,
    onTXTExport,
    onCopyText,
    isDirtyCoverLetter,
    isDirtyResume,
    saveStatus:
      coverLetterStatus === "pending" || resumeStatus === "pending"
        ? "saving"
        : coverLetterStatus === "error" || resumeStatus === "error"
          ? "error"
          : coverLetterStatus === "success" || resumeStatus === "success"
            ? "saved"
            : "idle",
    saveToDb,
  };

  return (
    <JobPageContext.Provider value={value}>{children}</JobPageContext.Provider>
  );
}

export function useJobPageContext() {
  const context = useContext(JobPageContext);

  if (!context) {
    throw new Error("useJobPageContext must be used within JobPageProvider");
  }
  return context;
}
