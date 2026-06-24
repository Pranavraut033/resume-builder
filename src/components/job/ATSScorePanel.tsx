/**
 * ATS Score Panel Component
 * Displays ATS analysis results including score breakdown, suggestions, and warnings
 */

"use client";

import { ATSAnalysisResult } from "@pranavraut033/ats-checker";

import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

interface ATSScorePanelProps {
  analysis: ATSAnalysisResult | null;
  isLoading?: boolean;
}

export function ATSScorePanel({
  analysis,
  isLoading = false,
}: ATSScorePanelProps) {
  if (isLoading) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
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

  // Determine score color based on value
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
            Overall Score
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
                className="rounded bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300"
              >
                {keyword}
              </span>
            ))}
            {analysis.matchedKeywords.length > 8 && (
              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
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
                className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
              >
                {keyword}
              </span>
            ))}
            {analysis.missingKeywords.length > 8 && (
              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                +{analysis.missingKeywords.length - 8} more
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Overused Keywords */}
      {analysis.overusedKeywords && analysis.overusedKeywords.length > 0 && (
        <Card>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Icon name="alert" className="h-4 w-4 text-red-600" />
            Overused Keywords ({analysis.overusedKeywords.length})
          </h4>
          <div className="flex flex-wrap gap-1">
            {analysis.overusedKeywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded bg-red-100 px-2 py-1 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-300"
              >
                {keyword}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Achievement Strength */}
      {analysis.achievementStrength &&
        analysis.achievementStrength.strong +
          analysis.achievementStrength.weak >
          0 && (
          <Card>
            <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              Achievement Strength
            </h4>
            <div className="flex gap-4 text-xs">
              <span className="text-green-700 dark:text-green-400">
                {analysis.achievementStrength.strong} strong
              </span>
              <span className="text-yellow-700 dark:text-yellow-400">
                {analysis.achievementStrength.weak} weak
              </span>
            </div>
          </Card>
        )}

      {/* Languages */}
      {(analysis.matchedLanguages?.length > 0 ||
        analysis.missingLanguages?.length > 0) && (
        <Card>
          <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
            Languages
          </h4>
          <div className="flex flex-wrap gap-1">
            {analysis.matchedLanguages?.map((lang) => (
              <span
                key={lang.name}
                className="rounded bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300"
              >
                {lang.name}
              </span>
            ))}
            {analysis.missingLanguages?.map((lang) => (
              <span
                key={lang.name}
                className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
              >
                {lang.name}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Suggestions */}
      {analysis.suggestions && analysis.suggestions.length > 0 && (
        <Card>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Icon name="info" className="h-4 w-4 text-blue-600" />
            Suggestions ({analysis.suggestions.length})
          </h4>
          <ul className="space-y-2">
            {analysis.suggestions.map((suggestion, idx) => (
              <li
                key={idx}
                className="flex gap-2 text-xs text-gray-700 dark:text-gray-300"
              >
                <span className="mt-1 shrink-0 text-blue-500">•</span>
                <span className="min-w-0 break-words">{suggestion}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Warnings */}
      {analysis.warnings && analysis.warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800/50 dark:bg-yellow-900/10">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Icon name="alert" className="h-4 w-4 text-yellow-600" />
            Warnings ({analysis.warnings.length})
          </h4>
          <ul className="space-y-1">
            {analysis.warnings.slice(0, 3).map((warning, idx) => (
              <li
                key={idx}
                className="flex gap-2 text-xs text-yellow-800 dark:text-yellow-300"
              >
                <span className="shrink-0">⚠</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/**
 * Individual score breakdown item
 */
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
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full ${getColor(score)} transition-all`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
        <span className="w-8 text-right text-xs font-semibold text-gray-900 dark:text-white">
          {Math.round(score)}%
        </span>
      </div>
    </div>
  );
}
