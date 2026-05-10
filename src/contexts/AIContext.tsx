/**
 * AI Context Provider
 * Centralized state management for all AI/LLM operations across the application
 *
 * Manages:
 * - Selected LLM provider and model
 * - Temperature settings
 * - Generation state (loading, error, result)
 * - Context for prompt generation (resume, job data)
 * - Token usage tracking
 * - Field-level and full content generation
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

import { generateResumeFieldText } from "@/lib/llm/clientLLM";
import { useModelStore } from "@/store/modelStore";
import { ProviderType } from "@/types/llm";
import { ResumeJSON } from "@/types/resume";

import { useOptionalEditorContext } from "./EditorContext";
import { useOptionalResumeEditContext } from "./ResumeEditContext";

export interface AIGenerationState {
  isLoading: boolean;
  error: string | null;
  result: string | null | string[];
  lastField?: string;
  requestId?: string;
  promptPreview?: string;
}

export interface AIContextType {
  // LLM Configuration
  temperature?: number;
  setTemperature: (temp: number) => void;

  // Generation State
  generationState: AIGenerationState;
  setGenerationState: (state: AIGenerationState) => void;
  resetGenerationState: () => void;

  // Generation Methods
  generateFieldText: (
    field: string,
    context: Record<string, unknown>
  ) => Promise<string>;

  generateResume: (
    baseProfile: ResumeJSON,
    jobDescription: string,
    jobTitle: string,
    companyName: string
  ) => Promise<ResumeJSON>;

  generateCoverLetter: (
    baseProfile: ResumeJSON,
    resume: ResumeJSON,
    jobDescription: string,
    jobTitle: string,
    companyName: string
  ) => Promise<string>;

  // Helpers
  isReady: () => boolean;
  getContextSummary: () => string;
  // Selected Model and Provider
  selectedProvider: ProviderType;
  selectedModel: string;
}

const AIContext = createContext<AIContextType | null>(null);

interface AIProviderProps {
  children: ReactNode;
  defaultTemperature?: number;
}

export function AIProvider({ children, defaultTemperature }: AIProviderProps) {
  const editorContext = useOptionalEditorContext();
  const resumeEditContext = useOptionalResumeEditContext();

  // AIProvider is used across different editor flows.
  // Prefer unified EditorContext when available, otherwise fall back to ResumeEditContext.
  const resume = editorContext?.resume ?? resumeEditContext?.resume ?? null;
  const job = editorContext?.job ?? resumeEditContext?.job ?? null;

  // Use model store for provider and model selection
  const selectedProvider = useModelStore((s) =>
    s.getSelectedProvider()
  ) as ProviderType;
  const selectedModel = useModelStore((s) => s.getAllSelectedModels()[0]);

  const [temperature, setTemperature] = useState<number | undefined>(
    defaultTemperature
  );

  const [generationState, setGenerationState] = useState<AIGenerationState>({
    isLoading: false,
    error: null,
    result: null,
  });

  const resetGenerationState = useCallback(() => {
    setGenerationState({
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
        setGenerationState({
          isLoading: true,
          error: null,
          result: null,
          lastField: field,
        });

        const result = await generateResumeFieldText(
          field,
          {
            ...context,
            resumeData: resume,
            jobData: job?.details || null,
            jobDescription: job?.description,
          },
          selectedModel,
          selectedProvider,
          temperature
        );

        setGenerationState({
          isLoading: false,
          error: null,
          result,
          lastField: field,
        });

        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to generate text";
        setGenerationState({
          isLoading: false,
          error: errorMsg,
          result: null,
          lastField: field,
        });
        throw err;
      }
    },
    [resume, job, selectedModel, selectedProvider, temperature]
  );

  const generateResume = useCallback(
    async (
      baseProfile: ResumeJSON,
      jobDescription: string,
      jobTitle: string,
      companyName: string
    ): Promise<ResumeJSON> => {
      try {
        setGenerationState({ isLoading: true, error: null, result: null });

        const { generateResume: generateResumeImpl } =
          await import("@/lib/llm/clientLLM");

        const result = await generateResumeImpl(
          baseProfile,
          jobDescription,
          jobTitle,
          companyName,
          selectedModel,
          selectedProvider
        );

        setGenerationState({
          isLoading: false,
          error: null,
          result: "Resume generated successfully",
        });

        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to generate resume";
        setGenerationState({ isLoading: false, error: errorMsg, result: null });
        throw err;
      }
    },
    [selectedModel, selectedProvider]
  );

  const generateCoverLetter = useCallback(
    async (
      baseProfile: ResumeJSON,
      resume: ResumeJSON,
      jobDescription: string,
      jobTitle: string,
      companyName: string
    ): Promise<string> => {
      try {
        setGenerationState({ isLoading: true, error: null, result: null });

        const { generateCoverLetter: generateCoverLetterImpl } =
          await import("@/lib/llm/clientLLM");

        const result = await generateCoverLetterImpl(
          baseProfile,
          resume,
          jobDescription,
          jobTitle,
          companyName,
          selectedModel,
          selectedProvider
        );

        setGenerationState({
          isLoading: false,
          error: null,
          result: "Cover letter generated successfully",
        });

        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to generate cover letter";
        setGenerationState({ isLoading: false, error: errorMsg, result: null });
        throw err;
      }
    },
    [selectedModel, selectedProvider]
  );

  const isReady = useCallback(() => {
    return !!selectedProvider && !!selectedModel;
  }, [selectedProvider, selectedModel]);

  const getContextSummary = useCallback(() => {
    const parts: string[] = [];
    if (resume) parts.push("Resume context loaded");
    if (job) parts.push("Job context loaded");
    if (parts.length === 0) parts.push("No context loaded");
    return parts.join(", ");
  }, [resume, job]);
  return (
    <AIContext.Provider
      value={{
        temperature,
        setTemperature,
        generationState,
        setGenerationState,
        resetGenerationState,

        generateFieldText,
        generateResume,
        generateCoverLetter,
        isReady,
        getContextSummary,
        selectedProvider,
        selectedModel,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext(): AIContextType {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAIContext must be used within AIProvider");
  }
  return context;
}
