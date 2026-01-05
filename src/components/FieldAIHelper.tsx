/**
 * Field AI Helper Component
 * Inline AI generation button with model/temperature controls
 * Minimal, one-click generation with prompt transparency
 */

"use client";

import { useState, useRef } from "react";

import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { ExtractedContext } from "@/lib/contextExtractor";
import {
  generateFieldPrompt,
  formatPromptForTooltip,
} from "@/lib/fieldPromptSystem";
import { getAvailableProviders } from "@/lib/llm/providers";
import LLMService from "@/lib/llmService";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";
import { Providers } from "@/types/llm";
import { ResumeJSON } from "@/types/resume";

const logger = createLogger("FieldAIHelper");

type FieldType =
  | "summary"
  | "education_description"
  | "experience_description"
  | "achievements";

interface FieldAIHelperProps {
  field: FieldType;
  context: ExtractedContext;
  onGenerate: (content: string) => void;
  onError?: (error: string) => void;
}

export function FieldAIHelper({
  field,
  context,
  onGenerate,
  onError,
}: FieldAIHelperProps) {
  const { modelsByProvider } = useModelStore();
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<Providers>("openai");
  const [temperature, setTemperature] = useState(0.7);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get available models for selected provider
  const models = modelsByProvider?.[provider] || [];
  const currentModel = models[0] || "gpt-4o";

  const handleGenerate = async () => {
    if (!provider || !currentModel) {
      onError?.("No LLM provider or model selected");
      return;
    }

    setIsLoading(true);
    try {
      const result = await LLMService.executeCall(
        "generate_summary", // Use generic purpose for all field types
        {
          resume:
            (context.context as unknown as ResumeJSON | null | undefined) ??
            undefined,
          field,
        },
        {
          provider,
          model: currentModel,
          temperature,
          purpose: "generate_summary",
        }
      );

      onGenerate(result.result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Generation failed";
      logger.error("Field generation failed", { field, error: message });
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const prompt = generateFieldPrompt(field, context);
  const tooltipText = formatPromptForTooltip(prompt);

  return (
    <div className="flex items-center gap-2">
      {/* AI Button */}
      <Button
        onClick={handleGenerate}
        disabled={isLoading}
        size="sm"
        variant="secondary"
        title="Generate with AI"
        className="px-2 py-1"
      >
        {isLoading ? (
          <>
            <Icon name="spinner" className="h-4 w-4 animate-spin" />
          </>
        ) : (
          <>
            <Icon name="sparkles" className="h-4 w-4" />
          </>
        )}
      </Button>

      {/* Model Dropdown */}
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value as Providers)}
        disabled={isLoading}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        title="Select LLM provider"
      >
        {getAvailableProviders().map((p) => (
          <option key={p.type} value={p.type}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Temperature Slider */}
      <div className="flex items-center gap-1">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          disabled={isLoading}
          className="h-1 w-16"
          title="Temperature: 0=focused, 1=creative"
        />
        <span className="w-6 text-xs text-gray-600 dark:text-gray-400">
          {temperature.toFixed(1)}
        </span>
      </div>

      {/* Prompt Preview Tooltip Button */}
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        title="Show prompt"
      >
        ?
      </button>

      {/* Tooltip - Prompt Preview */}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 mt-2 max-w-xs rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-100 dark:bg-gray-950"
        >
          <div className="max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
            {tooltipText}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(tooltipText);
            }}
            className="mt-2 text-xs text-gray-400 hover:text-gray-200"
          >
            Copy prompt
          </button>
        </div>
      )}
    </div>
  );
}
