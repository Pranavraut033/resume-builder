"use client";

import { Customization } from "@prisma/client";
import { RefetchOptions, useMutation } from "@tanstack/react-query";
import { deepClone } from "fast-json-patch";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useEffect,
  useRef,
} from "react";

import { JobData } from "@/actions/job";
import {
  updateCoverLetter as updateCoverLetterAction,
  updateResume as updateResumeAction,
  saveAtsAnalysis as saveAtsAnalysisAction,
} from "@/actions/job";
import { Button } from "@/components/ui/Button";
import { FallbackState } from "@/components/ui/FallbackState";
import { useToast } from "@/components/ui/ToastProvider";
import { JobPageData, useJobPageDataQuery } from "@/hooks/useJobPageDataQuery";
import { areJsonValuesEqual } from "@/lib";
import { DateFormat } from "@/lib/date";
import { loadGoogleFont } from "@/lib/fontLoader";
import { ResumeHistory } from "@/lib/llm/ResumeHistory";
import logger from "@/lib/logger";
import { generateCoverLetterPDF, generateResumePDF } from "@/lib/pdfExport";
import { coverLetterToText, resumeToText } from "@/lib/resumeToText";
import {
  DEFAULT_CUSTOMIZATION,
  SanitizedCustomization,
} from "@/types/customization";
import { ATSAnalysisJSON, ResumeJSON } from "@/types/resume";

export type EditorContentType = "resume" | "coverLetter";
export type ChatSnapPosition = "left" | "right" | "undocked";
type SanitizedFields = "id" | "createdAt" | "updatedAt";

export type Sanitize<T> = Omit<T, SanitizedFields>;
type SaveToDbArgs =
  | [
      contentType: "resume",
      data: ResumeJSON,
      customization: SanitizedCustomization,
    ]
  | [
      contentType: "coverLetter",
      data: string,
      customization: SanitizedCustomization,
    ]
  | [contentType: "ats", data: ATSAnalysisJSON];

export interface JobPageContextType {
  contentType: EditorContentType;
  coverLetter: string;
  customization: SanitizedCustomization;
  job: JobData;
  profile: ResumeJSON;
  historyRef: React.RefObject<ResumeHistory | null>;
  resume: ResumeJSON;
  atsAnalysis: ATSAnalysisJSON | null;
  setAtsAnalysis: (analysis: ATSAnalysisJSON) => void;
  updateCoverLetterState: (text: string) => void;
  updateCustomizationState: (updates: Partial<Sanitize<Customization>>) => void;
  updateResumeState: (
    updates: Partial<Sanitize<ResumeJSON>>,
    note?: string
  ) => void;
  undoResume: () => void;
  redoResume: () => void;
  refetch: (options?: RefetchOptions, ...fields: (keyof JobPageData)[]) => void;
  isExportingPdf: boolean;
  isExportingTxt: boolean;
  onPDFExport: () => void;
  onTXTExport: () => void;
  onJSONExport: () => void;
  onCopyText: () => void;
  saveToDb: (...args: SaveToDbArgs) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  isDirtyCoverLetter: boolean;
  isDirtyResume: boolean;
  chatSnapPosition: ChatSnapPosition;
  setChatSnapPosition: (position: ChatSnapPosition) => void;
  setContentType: (type: EditorContentType) => void;
}

const JobPageContext = createContext<JobPageContextType | null>(null);

interface JobPageProviderProps {
  children: ReactNode;
  serverData: JobPageData;
  jobId: number;
}
export function JobPageProvider({
  children,
  serverData,
  jobId,
}: JobPageProviderProps) {
  const { data, isLoading, isError, refetch } = useJobPageDataQuery(
    jobId,
    serverData
  );
  const params = useSearchParams();
  const queryContentType = params.get("contentType");
  const router = useRouter();
  const pathname = usePathname();

  const [contentType, setContentType] = useState<EditorContentType>(
    queryContentType === "coverLetter" ? "coverLetter" : "resume"
  );

  const handleSetContentType = useCallback(
    (type: EditorContentType) => {
      setContentType(type);
      // Each document (resume / cover letter) has its own customization row.
      // Re-seed on every switch, or the panel keeps showing (and saving)
      // whichever document's customization happened to be loaded last.
      setCustomization(
        (type === "coverLetter" ? data?.coverLetter : data?.resume)
          ?.customizations ?? DEFAULT_CUSTOMIZATION
      );
      const newUrl =
        type === "coverLetter"
          ? `${pathname}?contentType=coverLetter`
          : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router, data?.coverLetter, data?.resume]
  );

  const [isExportingTxt, setIsExportingTxt] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [chatSnapPosition, setChatSnapPosition] =
    useState<ChatSnapPosition>("undocked");

  const resumeInitial = data?.resume?.contentJson ?? data!.profile;

  const [resume, setResumeState] = useState<ResumeJSON>(
    resumeInitial ? deepClone(resumeInitial) : ({} as ResumeJSON)
  );
  const historyRef = useRef<ResumeHistory>(new ResumeHistory(resumeInitial));
  // Last DB content this local state was known to match — lets the sync
  // effects below tell "the query cache moved because someone else wrote to
  // the DB (e.g. MCP)" apart from "the query cache moved because our own
  // save just landed", without clobbering genuinely unsaved local edits.
  const lastSyncedResumeRef = useRef<ResumeJSON>(resumeInitial);

  const [coverLetter, updateCoverLetterState] = useState<string>(
    data?.coverLetter?.contentText || ""
  );
  const lastSyncedCoverLetterRef = useRef<string>(
    data?.coverLetter?.contentText || ""
  );

  const [customization, setCustomization] = useState<SanitizedCustomization>(
    (contentType === "coverLetter" && data?.coverLetter
      ? data.coverLetter?.customizations
      : data?.resume && data.resume?.customizations) ?? DEFAULT_CUSTOMIZATION
  );

  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysisJSON | null>(
    data?.resume?.atsAnalysis ?? data?.job?.baseProfileAnalysis ?? null
  );

  const { pushToast } = useToast();

  const updateResumeState = useCallback(
    (updates: Partial<Sanitize<ResumeJSON>>, note?: string) => {
      setResumeState((prev) => {
        const updated = { ...prev, ...updates };

        // Deferred: addEntry synchronously notifies history-change listeners
        // (e.g. InlineJobPageLayout's setHistoryState), which must not run
        // while this updater is still executing inside React's render phase.
        queueMicrotask(() => {
          historyRef.current.addEntry(updated, note ?? "Resume updated");
        });

        return updated;
      });
    },
    []
  );

  const updateCustomizationState = useCallback(
    (updates: Partial<SanitizedCustomization>) =>
      setCustomization((prev) => ({ ...prev, ...updates })),
    []
  );

  // Undo/redo apply the reverted/replayed document back to React state
  // without recording a new history entry.
  const undoResume = useCallback(() => {
    const result = historyRef.current.undo();
    if (result) setResumeState(result);
  }, []);

  const redoResume = useCallback(() => {
    const result = historyRef.current.redo();
    if (result) setResumeState(result);
  }, []);

  const onPDFExport = useCallback(async () => {
    const jobData = data?.job;
    if (!jobData) return;

    setIsExportingPdf(true);

    try {
      if (contentType === "coverLetter") {
        const filename = `${jobData.company?.name ?? "Cover Letter"} ${resume.header.name} Cover Letter.pdf`;
        await generateCoverLetterPDF(
          coverLetter,
          resume,
          customization,
          filename,
          jobData.details
        );
      } else {
        const filename = `${jobData.company?.name ?? "Resume"} ${resume.header.name} Resume.pdf`;
        await generateResumePDF(resume, customization, filename);
      }
    } catch (err) {
      logger.error("JobPageContext", "PDF export failed:", err);
      pushToast({ title: "PDF export failed", variant: "error" });
    } finally {
      setIsExportingPdf(false);
    }
  }, [data?.job, contentType, pushToast, resume, customization, coverLetter]);

  const generateContentText = useCallback(() => {
    if (contentType === "coverLetter") {
      return coverLetterToText(
        coverLetter,
        resume,
        data?.job?.details,
        customization.dateFormat as DateFormat
      );
    } else {
      return resumeToText(resume);
    }
  }, [
    contentType,
    coverLetter,
    resume,
    data?.job?.details,
    customization.dateFormat,
  ]);

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

  const onJSONExport = useCallback(() => {
    const jobData = data?.job;
    if (!jobData)
      return pushToast({
        title: "No job context",
        description: "Cannot export without job context.",
        variant: "error",
      });

    const payload =
      contentType === "coverLetter"
        ? JSON.stringify({ coverLetter }, null, 2)
        : JSON.stringify(resume, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      contentType === "coverLetter"
        ? `${jobData.company?.name} Cover Letter.json`
        : `${jobData.company?.name} ${resume.header.name}-Resume.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [contentType, coverLetter, data?.job, pushToast, resume]);

  const onCopyText = useCallback(() => {
    navigator.clipboard.writeText(generateContentText());

    pushToast({
      title: "Content copied to clipboard",
      variant: "success",
    });
  }, [generateContentText, pushToast]);

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

  const saveAtsAnalysisMutation = useMutation({
    mutationFn: (data: { atsAnalysis: ATSAnalysisJSON }) =>
      saveAtsAnalysisAction(jobId, data.atsAnalysis),
    onSuccess: () => {
      refetch(undefined, "resume");
      logger.info("JobPageContext", "ATS analysis saved successfully");
    },
    onError: (err) => {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to save ATS analysis";
      logger.error("JobPageContext", "Failed to save ATS analysis:", err);
      pushToast({
        title: "Save failed",
        description: errorMsg,
        variant: "error",
      });
    },
  });

  const saveToDb = useCallback(
    (...args: SaveToDbArgs) => {
      const [contentType, data, customization] = args;
      if (contentType === "coverLetter")
        saveCoverLetter({ coverLetter: data, customization });
      else if (contentType === "resume")
        saveResume({ resume: data, customization });
      else if (contentType === "ats")
        saveAtsAnalysisMutation.mutate({ atsAnalysis: data });
    },
    [saveCoverLetter, saveResume, saveAtsAnalysisMutation]
  );

  useEffect(() => {
    if (customization.fontFamily) {
      // full: true — the applied resume font needs every weight it ships
      // (bold headings etc.), not just the single preview weight.
      loadGoogleFont(customization.fontFamily, { full: true });
    }
  }, [customization.fontFamily]);

  // Adopt DB content that changed outside this tab (e.g. an MCP-driven edit)
  // once the query refetches (TanStack's default refetchOnWindowFocus is
  // what actually triggers that refetch). Skipped when local state has
  // unsaved edits of its own, so an in-progress edit here never gets
  // silently overwritten by an external write.
  useEffect(() => {
    const incoming = data?.resume?.contentJson;
    if (!incoming || areJsonValuesEqual(incoming, lastSyncedResumeRef.current))
      return;

    setResumeState((prev) => {
      const hasLocalEdits = !areJsonValuesEqual(
        prev,
        lastSyncedResumeRef.current
      );
      lastSyncedResumeRef.current = incoming;
      return hasLocalEdits ? prev : deepClone(incoming);
    });
  }, [data?.resume?.contentJson]);

  useEffect(() => {
    const incoming = data?.coverLetter?.contentText;
    if (incoming === undefined || incoming === lastSyncedCoverLetterRef.current)
      return;

    updateCoverLetterState((prev) => {
      const hasLocalEdits = prev !== lastSyncedCoverLetterRef.current;
      lastSyncedCoverLetterRef.current = incoming;
      return hasLocalEdits ? prev : incoming;
    });
  }, [data?.coverLetter?.contentText]);

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
  const saveStatus =
    coverLetterStatus === "pending" ||
    resumeStatus === "pending" ||
    saveAtsAnalysisMutation.status === "pending"
      ? "saving"
      : coverLetterStatus === "error" ||
          resumeStatus === "error" ||
          saveAtsAnalysisMutation.status === "error"
        ? "error"
        : coverLetterStatus === "success" ||
            resumeStatus === "success" ||
            saveAtsAnalysisMutation.status === "success"
          ? "saved"
          : "idle";

  const value: JobPageContextType = {
    atsAnalysis,
    chatSnapPosition,
    contentType,
    coverLetter,
    customization,
    historyRef,
    isDirtyCoverLetter,
    isDirtyResume,
    isExportingPdf,
    isExportingTxt,
    job,
    onCopyText,
    onJSONExport,
    onPDFExport,
    onTXTExport,
    profile: data.profile,
    refetch,
    resume,
    saveStatus,
    saveToDb,
    setAtsAnalysis,
    setChatSnapPosition,
    setContentType: handleSetContentType,
    updateCoverLetterState,
    updateCustomizationState,
    updateResumeState,
    undoResume,
    redoResume,
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
