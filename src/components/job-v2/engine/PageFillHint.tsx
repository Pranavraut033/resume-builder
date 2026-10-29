"use client";

import React from "react";

import { useJobPageContext } from "@/contexts/JobPageContext";
import {
  DOCUMENT_SIZE_CONFIG,
  DOCUMENT_SIZES,
  effectiveDocumentSize,
} from "@/lib/documentSize";

/**
 * Editor-only nudge under the last page when it is nearly empty. Rendered by
 * TemplateEngine only on the editable canvas, which always sits inside
 * JobPageProvider (DocumentCanvas).
 */
const PageFillHint: React.FC<{ pageNumber: number; fill: number }> = ({
  pageNumber,
  fill,
}) => {
  const { customization, updateCustomizationState } = useJobPageContext();
  const current = DOCUMENT_SIZES.indexOf(effectiveDocumentSize(customization));
  const smaller = current > 0 ? DOCUMENT_SIZES[current - 1] : null;

  const button =
    "text-agent-primary rounded-full px-2 py-0.5 font-semibold hover:bg-agent-primary-container";

  return (
    <div
      data-no-pdf
      className="text-agent-on-surface-variant mt-2 flex flex-wrap items-center justify-center gap-1 text-xs"
    >
      <span>
        Page {pageNumber} is only {Math.max(1, Math.round(fill * 100))}% full.
      </span>
      {smaller && (
        <button
          type="button"
          className={button}
          onClick={() => {
            const preset = DOCUMENT_SIZE_CONFIG[smaller];
            updateCustomizationState({
              fontSize: preset.fontSize,
              marginSize: preset.marginSize,
              lineHeight: preset.lineHeight,
            });
          }}
        >
          Use {smaller} size
        </button>
      )}
      {pageNumber === 2 && (
        <button
          type="button"
          className={button}
          onClick={() => updateCustomizationState({ fitToPage: true })}
        >
          Fit to one page
        </button>
      )}
    </div>
  );
};

export default PageFillHint;
