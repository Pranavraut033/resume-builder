/**
 * Resume Edit Context Provider
 * Manages resume data, job context, and LLM generation state
 * Single source of truth for the resume edit page and all nested components
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

import { ResumeJSON, JobDetails } from "@/types/resume";

export interface LLMGenerationState {
  isLoading: boolean;
  error: string | null;
  result: string | null;
  lastField?: string; // Track which field was last generated
}

export interface ResumeEditContextType {
  // Resume data
  resume: ResumeJSON | null;
  setResume: (resume: ResumeJSON | null) => void;
  updateResume: (updates: Partial<ResumeJSON>) => void;

  // Job data
  job: {
    id: number;
    details: JobDetails | null;
    description: string;
    rawData: Record<string, unknown> | null;
  } | null;
  setJob: (job: ResumeEditContextType["job"]) => void;

  // LLM generation state
  llmState: LLMGenerationState;
  setLLMState: (state: LLMGenerationState) => void;

  // LLM generation methods
  generateFieldText: (
    field: string,
    context: Record<string, unknown>
  ) => Promise<string>;
  resetLLMState: () => void;

  // Loading and error states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const ResumeEditContext = createContext<ResumeEditContextType | undefined>(
  undefined
);

interface ResumeEditProviderProps {
  children: ReactNode;
}

export function ResumeEditProvider({ children }: ResumeEditProviderProps) {
  const [resume, setResumeState] = useState<ResumeJSON | null>(null);
  const [job, setJobState] = useState<ResumeEditContextType["job"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmState, setLLMState] = useState<LLMGenerationState>({
    isLoading: false,
    error: null,
    result: null,
  });

  const setResume = useCallback((newResume: ResumeJSON | null) => {
    setResumeState(newResume);
  }, []);

  const updateResume = useCallback((updates: Partial<ResumeJSON>) => {
    setResumeState((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, []);

  const setJob = useCallback((newJob: ResumeEditContextType["job"]) => {
    setJobState(newJob);
  }, []);

  const resetLLMState = useCallback(() => {
    setLLMState({
      isLoading: false,
      error: null,
      result: null,
    });
  }, []);

  const generateFieldText = useCallback(
    async (
      field: string,
      context: Record<string, unknown>
    ): Promise<string> => {
      try {
        setLLMState({
          isLoading: true,
          error: null,
          result: null,
          lastField: field,
        });

        // Import client LLM at runtime to avoid circular dependencies
        const { generateResumeFieldText } = await import("@/lib/clientLLM");

        const result = await generateResumeFieldText(field, {
          resumeData: resume,
          jobData: job?.details || null,
          jobDescription: job?.description || undefined,
          context,
        });

        setLLMState({
          isLoading: false,
          error: null,
          result,
          lastField: field,
        });

        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to generate text";
        setLLMState({
          isLoading: false,
          error: errorMsg,
          result: null,
          lastField: field,
        });
        throw err;
      }
    },
    [resume, job]
  );

  const value: ResumeEditContextType = {
    resume,
    setResume,
    updateResume,
    job,
    setJob,
    llmState,
    setLLMState,
    generateFieldText,
    resetLLMState,
    isLoading,
    setIsLoading,
    error,
    setError,
  };

  return (
    <ResumeEditContext.Provider value={value}>
      {children}
    </ResumeEditContext.Provider>
  );
}

export function useResumeEditContext() {
  const context = useContext(ResumeEditContext);
  if (!context) {
    throw new Error(
      "useResumeEditContext must be used within ResumeEditProvider"
    );
  }
  return context;
}
