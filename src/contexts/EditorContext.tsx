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

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

import { JobContext } from "@/actions/job";
import {
  ResumeJSON,
  ThemeCustomization,
  DEFAULT_CUSTOMIZATION,
} from "@/types/resume";

export type EditorContentType = "resume" | "coverLetter";

/**
 * Editor Context Type
 * Defines the shape of the editor context state and updater functions
 * for both resume and cover letter editing scenarios.
 * Includes:
 * - contentType: Indicates if editing a resume or cover letter
 * - coverLetter: Current cover letter text (if applicable)
 * - customization: Theme customization settings
 * - job: Job context data
 * - resume: Current resume JSON data (if applicable)
 * - updateCoverLetter: Function to update cover letter text
 * - updateCustomization: Function to update theme customization
 * - updateResume: Function to update resume JSON data
 */
export interface EditorContextType {
  contentType: EditorContentType;
  coverLetter: string | null;
  customization: ThemeCustomization;
  job: JobContext;
  resume: ResumeJSON | null;
  updateCoverLetter: (text: string) => void;
  updateCustomization: (updates: Partial<ThemeCustomization>) => void;
  updateResume: (updates: Partial<ResumeJSON>) => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

interface EditorProviderProps {
  children: ReactNode;
  contentType: EditorContentType;
  values: {
    coverLetter: string | null;
    customization: ThemeCustomization;
    job: JobContext;
    resume: ResumeJSON | null;
  };
}

export function EditorProvider({
  children,
  contentType,
  values,
}: EditorProviderProps) {
  const job = values.job!;

  const [resume, setResumeState] = useState<ResumeJSON | null>(
    values.resume || null
  );
  const [coverLetter, updateCoverLetter] = useState<string>(
    values.coverLetter || ""
  );

  const [customization, setCustomization] = useState<ThemeCustomization>(
    values.customization || DEFAULT_CUSTOMIZATION
  );

  const updateResume = useCallback((updates: Partial<ResumeJSON>) => {
    setResumeState((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      return updated;
    });
  }, []);

  const updateCustomization = useCallback(
    (updates: Partial<ThemeCustomization>) =>
      setCustomization((prev) => ({ ...prev, ...updates })),
    []
  );

  const value: EditorContextType = {
    contentType,
    coverLetter,
    customization,
    job,
    resume,
    updateCoverLetter,
    updateCustomization,
    updateResume,
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
