/**
 * Enhanced ATS Panel with LLM-Powered Suggestions
 * Analyzes resume for ATS compatibility and provides AI-powered improvements
 *
 * Features:
 * - Local ATS analysis
 * - Optional LLM-based detailed recommendations
 * - Model selection for LLM analysis
 * - Token tracking
 */

"use client";

import { ATSAnalysisResult } from "@pranavraut033/ats-checker";
import { useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import LLMService from "@/lib/llmService";
import { useModelStore } from "@/store/modelStore";

interface EnhancedATSPanelProps {
  analysis: ATSAnalysisResult | null;
  isLoading?: boolean;
  resumeText?: string;
  jobDescription?: string;
}

export function EnhancedATSPanel({
  analysis,
  isLoading = false,
  resumeText,
  jobDescription,
}: EnhancedATSPanelProps) {
  const store = useModelStore();
  const selectedProvider = store.selectedProvider as unknown;
  const selectedModel =
    store.selectedModelsByProvider[store.selectedProvider]?.[0];

  const [showLLMOptions, setShowLLMOptions] = useState(false);
  const [llmSuggestions, setLLMSuggestions] = useState<string | null>(null);
  const [isGeneratingLLMSuggestions, setIsGeneratingLLMSuggestions] =
    useState(false);
  const [llmError, setLLMError] = useState<string | null>(null);

  const handleGenerateLLMSuggestions = async () => {
    if (!resumeText || !selectedProvider || !selectedModel) {
      setLLMError("Missing resume text, provider, or model");
      return;
    }

    setIsGeneratingLLMSuggestions(true);
    setLLMError(null);

    try {
      const result = await LLMService.analyzeATS(resumeText, jobDescription, {
        provider: selectedProvider,
        model: selectedModel,
        temperature: 0.5, // Lower temp for more focused recommendations
        purpose: "analyze_ats",
      });

      setLLMSuggestions(result.result);
      setShowLLMOptions(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate suggestions";
      setLLMError(errorMessage);
    } finally {
      setIsGeneratingLLMSuggestions(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center justify-center py-6">
          <Icon name="spinner" className="h-8 w-8 animate-spin text-blue-500" />
        </div>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Analyzing resume...
        </p>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-50 dark:bg-green-900/20";
    if (score >= 60) return "bg-yellow-50 dark:bg-yellow-900/20";
    return "bg-red-50 dark:bg-red-900/20";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className={`${getScoreBgColor(analysis.score)} border-2`}>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Overall ATS Score
          </h4>
          <span
            className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}
          >
            {Math.round(analysis.score)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`${getProgressColor(analysis.score)} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(analysis.score, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          {analysis.score >= 80
            ? "Great! Your resume is highly ATS-optimized."
            : analysis.score >= 60
              ? "Good. Some improvements recommended for better ATS compatibility."
              : "Consider optimizing your resume for ATS systems."}
        </p>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Score Breakdown
        </h4>
        <div className="space-y-2">
          <ScoreBreakdownItem
            label="Skills"
            score={analysis.breakdown.skills}
          />
          <ScoreBreakdownItem
            label="Experience"
            score={analysis.breakdown.experience}
          />
          <ScoreBreakdownItem
            label="Keywords"
            score={analysis.breakdown.keywords}
          />
          <ScoreBreakdownItem
            label="Education"
            score={analysis.breakdown.education}
          />
        </div>
      </Card>

      {/* Matched Keywords */}
      {analysis.matchedKeywords && analysis.matchedKeywords.length > 0 && (
        <Card>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Icon name="check" className="h-4 w-4 text-green-600" />
            Matched Keywords ({analysis.matchedKeywords.length})
          </h4>
          <div className="flex flex-wrap gap-1">
            {analysis.matchedKeywords.slice(0, 8).map((keyword) => (
              <span
                key={keyword}
                className="inline-block rounded bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300"
              >
                {keyword}
              </span>
            ))}
            {analysis.matchedKeywords.length > 8 && (
              <span className="inline-block rounded bg-gray-200 px-2 py-1 text-xs text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                +{analysis.matchedKeywords.length - 8} more
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Missing Keywords */}
      {analysis.missingKeywords && analysis.missingKeywords.length > 0 && (
        <Card>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Icon name="alert" className="h-4 w-4 text-yellow-600" />
            Missing Keywords ({analysis.missingKeywords.length})
          </h4>
          <div className="flex flex-wrap gap-1">
            {analysis.missingKeywords.slice(0, 8).map((keyword) => (
              <span
                key={keyword}
                className="inline-block rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
              >
                {keyword}
              </span>
            ))}
            {analysis.missingKeywords.length > 8 && (
              <span className="inline-block rounded bg-gray-200 px-2 py-1 text-xs text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                +{analysis.missingKeywords.length - 8} more
              </span>
            )}
          </div>
        </Card>
      )}

      {/* LLM-Powered Recommendations */}
      {resumeText && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Icon
                  name="sparkles"
                  className="h-4 w-4 text-blue-600 dark:text-blue-400"
                />
                AI-Powered Recommendations
              </h4>
              {!showLLMOptions && !llmSuggestions && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowLLMOptions(true)}
                >
                  Generate
                </Button>
              )}
            </div>

            {/* LLM Configuration Section */}
            {showLLMOptions && !llmSuggestions && (
              <div className="space-y-3 border-t border-gray-200 pt-2 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Get detailed AI-powered recommendations to improve your ATS
                  score.
                </p>
                <ModelSelector
                  compact
                  showLabel={false}
                  showTemperature={true}
                />

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowLLMOptions(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleGenerateLLMSuggestions}
                    disabled={
                      isGeneratingLLMSuggestions ||
                      !selectedProvider ||
                      !selectedModel
                    }
                    className="flex-1"
                  >
                    {isGeneratingLLMSuggestions ? (
                      <>
                        <Icon
                          name="spinner"
                          className="mr-1 h-3 w-3 animate-spin"
                        />
                        Generating...
                      </>
                    ) : (
                      "Generate Suggestions"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* LLM Error */}
            {llmError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-xs text-red-900 dark:text-red-300">
                  {llmError}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowLLMOptions(true);
                    setLLMError(null);
                  }}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* LLM Suggestions Display */}
            {llmSuggestions && (
              <div className="space-y-2">
                <div className="max-h-48 overflow-y-auto rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                  <pre className="font-sans text-xs wrap-break-word whitespace-pre-wrap text-blue-900 dark:text-blue-300">
                    {llmSuggestions}
                  </pre>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setLLMSuggestions(null);
                    setShowLLMOptions(false);
                  }}
                  className="w-full"
                >
                  Generate New Suggestions
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Suggestions & Warnings */}
      {analysis.suggestions && analysis.suggestions.length > 0 && (
        <Card>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Icon name="info" className="h-4 w-4 text-blue-600" />
            Suggestions ({analysis.suggestions.length})
          </h4>
          <ul className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
            {analysis.suggestions.slice(0, 5).map((suggestion, index) => (
              <li key={index} className="flex gap-2">
                <span className="shrink-0 text-blue-600 dark:text-blue-400">
                  •
                </span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ScoreBreakdownItem({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const getColor = (score: number) => {
    if (score >= 80) return "bg-green-200 dark:bg-green-900";
    if (score >= 60) return "bg-yellow-200 dark:bg-yellow-900";
    return "bg-red-200 dark:bg-red-900";
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`${getColor(score)} h-2 rounded-full transition-all`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
        <span className="w-8 text-right text-sm font-semibold text-gray-900 dark:text-white">
          {Math.round(score)}
        </span>
      </div>
    </div>
  );
}
