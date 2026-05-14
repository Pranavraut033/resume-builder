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

import { RefetchOptions } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

import { JobContext } from "@/actions/job";
import { Button } from "@/components/ui/Button";
import { FallbackState } from "@/components/ui/FallbackState";
import {
  EditorContextData,
  useEditorContextQuery,
} from "@/hooks/useEditorContext";
import {
  ResumeJSON,
  ThemeCustomization,
  DEFAULT_CUSTOMIZATION,
  extractCustomization,
} from "@/types/resume";

export type EditorContentType = "resume" | "coverLetter";

export interface EditorContextType {
  contentType: EditorContentType;
  coverLetter: string;
  customization: ThemeCustomization;
  job: JobContext;
  profile: ResumeJSON;
  resume: ResumeJSON;
  updateCoverLetter: (text: string) => void;
  updateCustomization: (updates: Partial<ThemeCustomization>) => void;
  updateResume: (updates: Partial<ResumeJSON>) => void;
  refetch: (
    options?: RefetchOptions,
    ...fields: (keyof EditorContextData)[]
  ) => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

interface EditorProviderProps {
  children: ReactNode;
  contentType: EditorContentType;
  serverData: EditorContextData;
  jobId: number;
}

export function EditorProvider({
  children,
  contentType,
  serverData,
  jobId,
}: EditorProviderProps) {
  const { data, isLoading, isError, refetch } = useEditorContextQuery(
    jobId,
    serverData
  );

  const [resume, setResumeState] = useState<ResumeJSON>(
    data?.resume?.contentJson ??
      (JSON.parse(JSON.stringify(data?.profile ?? {})) as ResumeJSON) // Deep clone to prevent direct mutations
  );

  const [coverLetter, updateCoverLetter] = useState<string>(
    data?.coverLetter?.contentText || ""
  );

  const [customization, setCustomization] = useState<ThemeCustomization>(
    contentType === "coverLetter" && data?.coverLetter
      ? extractCustomization(data.coverLetter)
      : data?.resume
        ? extractCustomization(data.resume)
        : DEFAULT_CUSTOMIZATION
  );

  const updateResume = useCallback((updates: Partial<ResumeJSON>) => {
    setResumeState((prev) => {
      const updated = { ...prev, ...updates };

      return updated;
    });
  }, []);

  const updateCustomization = useCallback(
    (updates: Partial<ThemeCustomization>) =>
      setCustomization((prev) => ({ ...prev, ...updates })),
    []
  );
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
  const value: EditorContextType = {
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
  };

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditorContext must be used within EditorProvider");
  }
  return context;
}

export function useOptionalEditorContext() {
  return useContext(EditorContext);
}
