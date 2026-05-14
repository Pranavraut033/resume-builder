/**
 * AI Suggestions Panel Component
 * Provides LLM-assisted content generation for resume fields
 *
 * Features:
 * - Clear AI Suggestions flow: select field → configure AI → generate → preview → apply
 * - Model and temperature selection
 * - Prompt preview for transparency
 * - Unified LLM operations with token tracking
 */

"use client";

import { useState, useEffect } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { PromptPreview } from "@/components/PromptPreview";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useResumeEditContext } from "@/contexts/ResumeEditContext";
import LLMService from "@/lib/llm/llmService";
import { PromptSystem, PromptPurpose, ResolvedPrompt } from "@/lib/llm/prompts";

const FIELD_LABELS: Record<
  string,
  { label: string; description: string; purpose: PromptPurpose }
> = {
  summary: {
    label: "Professional Summary",
    description:
      "Generate a compelling summary of your professional background",
    purpose: "generate_summary",
  },
  experience_description: {
    label: "Experience Description",
    description:
      "Generate descriptions for job responsibilities and achievements",
    purpose: "generate_experience",
  },
  experience_achievements: {
    label: "Experience Achievements",
    description: "Generate key achievements for your work experience",
    purpose: "generate_experience",
  },
  skills: {
    label: "Skills",
    description: "Generate a list of relevant skills based on the job",
    purpose: "generate_skills",
  },
  projects_description: {
    label: "Project Description",
    description: "Generate compelling project descriptions with impact",
    purpose: "generate_projects",
  },
  projects_technologies: {
    label: "Project Technologies",
    description: "Generate technologies used in your projects",
    purpose: "generate_projects",
  },
  education_summary: {
    label: "Education Summary",
    description: "Summarize your educational background",
    purpose: "generate_education",
  },
};

interface AISuggestionsPanelProps {
  onFieldInsert?: (field: string, content: string | string[]) => void;
}

type FlowState =
  | "idle"
  | "configure"
  | "preview"
  | "ready"
  | "generating"
  | "error";

export function AIAssistPanel({ onFieldInsert }: AISuggestionsPanelProps) {
  const { resume, job } = useResumeEditContext();

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [selectedField, setSelectedField] = useState<string>("summary");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [promptPreview, setPromptPreview] = useState<ResolvedPrompt | null>(
    null
  );
  const [, setShowPromptPreview] = useState(false);

  // Reset flow when field changes
  useEffect(() => {
    setFlowState("idle");
    setGeneratedContent(null);
    resetGenerationState();
  }, [selectedField]);

  const handleStartConfiguration = () => {
    if (!resume || !job) {
      setFlowState("error");
      return;
    }
    setFlowState("configure");
  };

  const handleReviewPrompt = () => {
    const purpose = FIELD_LABELS[selectedField].purpose;
    const prompt = PromptSystem.generatePrompt(purpose, {
      resume,
      jobDetails: job?.details,
      jobDescription: job?.description,
      field: selectedField,
    });
    setPromptPreview(prompt);
    setShowPromptPreview(true);
    setFlowState("preview");
  };

  const handleGenerate = async () => {
    if (!resume || !job || !selectedProvider || !selectedModel) {
      setFlowState("error");
      return;
    }

    setFlowState("generating");
    resetGenerationState();

    try {
      const result = await LLMService.generateFieldText(
        selectedField,
        resume,
        job.details,
        job.description,
        {
          provider: selectedProvider,
          model: selectedModel,
          temperature,
        }
      );

      setGeneratedContent(result.result);
      setFlowState("ready");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate content";
      setFlowState("error");
      setGenerationState({
        isLoading: false,
        error: errorMessage,
        result: null,
      });
    }
  };

  const handleInsertContent = () => {
    if (generatedContent && onFieldInsert) {
      onFieldInsert(selectedField, generatedContent);
      setFlowState("idle");
      setGeneratedContent(null);
    }
  };

  // Initial context check (only resume and job needed for field selection)
  const hasContext = !!resume && !!job;

  // LLM readiness check (provider and model needed for generation)
  const isLLMReady = !!selectedProvider && !!selectedModel;

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="px-1">
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
          AI Suggestions
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Generate tailored content for your resume sections using AI. Select a
          field, configure settings, review the prompt, and generate.
        </p>
      </div>

      {/* Step 1: Missing Context Warning */}
      {!hasContext && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800/50 dark:bg-yellow-900/20">
          <div className="flex items-start gap-3">
            <Icon
              name="alert"
              className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400"
            />
            <div>
              <p className="mb-1 text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Context not loaded
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                {!resume && "Resume data "}
                {!resume && !job && "and "}
                {!job && "job context "}
                not available. Please refresh the page.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Field Selection */}
      {(flowState === "idle" || flowState === "error") && hasContext && (
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
            1. Select Field
          </label>
          <div className="space-y-2">
            {Object.entries(FIELD_LABELS).map(
              ([key, { label, description }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedField(key)}
                  className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
                    selectedField === key
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  } cursor-pointer`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {label}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {description}
                  </p>
                </button>
              )
            )}
          </div>

          <Button
            onClick={handleStartConfiguration}
            variant="primary"
            className="mt-4 w-full"
          >
            Continue to Configuration
          </Button>
        </div>
      )}

      {/* Step 3: Model & Temperature Configuration */}
      {flowState === "configure" && hasContext && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
              2. Configure AI Settings
            </label>
            <ModelSelector onModelSelected={() => {}} />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setFlowState("idle")}
              variant="secondary"
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleReviewPrompt}
              variant="primary"
              className="flex-1"
            >
              Review Prompt
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Prompt Preview */}
      {flowState === "preview" && promptPreview && isLLMReady && (
        <div className="space-y-4">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            3. Review Prompt
          </label>
          <PromptPreview prompt={promptPreview} isOpen={true} />

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-xs text-blue-900 dark:text-blue-300">
              Review the prompt above to ensure it captures your intent
              correctly. Click "Generate" to send this to the AI.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setFlowState("configure")}
              variant="secondary"
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleGenerate}
              variant="primary"
              className="flex-1"
              disabled={generationState.isLoading}
            >
              {generationState.isLoading ? (
                <>
                  <Icon name="spinner" className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Content"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Generated Content Ready */}
      {flowState === "ready" && generatedContent && (
        <div className="space-y-4">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            4. Review & Apply
          </label>

          <Card className="border-2 border-blue-200 bg-gray-50 dark:border-blue-800 dark:bg-gray-800">
            <div className="max-h-64 overflow-y-auto">
              <pre className="text-sm wrap-break-word whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {generatedContent}
              </pre>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button
              onClick={handleInsertContent}
              variant="primary"
              className="flex-1"
            >
              <Icon name="check" className="mr-2 h-4 w-4" />
              Use Content
            </Button>
            <Button
              onClick={handleGenerate}
              variant="secondary"
              className="flex-1"
            >
              <Icon name="refresh" className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            You can edit this content after inserting it into your resume.
          </p>
        </div>
      )}

      {/* Error State */}
      {flowState === "error" && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <Icon
              name="alert"
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
            />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-300">
                {generationState.error || "Failed to generate content"}
              </p>
              <Button
                onClick={() => setFlowState("idle")}
                variant="ghost"
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Generating State */}
      {flowState === "generating" && (
        <Card className="flex items-center justify-center py-6">
          <Icon
            name="spinner"
            className="mr-3 h-5 w-5 animate-spin text-blue-600 dark:text-blue-400"
          />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Generating content...
          </p>
        </Card>
      )}
    </div>
  );
}
