"use client";

import { useState, useEffect } from "react";

import { FontSelector } from "@/components/FontSelector";
import { Card } from "@/components/ui/Card";
import {
  AVAILABLE_TEMPLATES,
  COLOR_PRESETS,
  SanitizedCustomization,
  TemplateType,
} from "@/types/customization";

import DownloadButton from "./DownloadButton";
import PreviewViewport from "./PreviewViewport";

interface FinalReviewExportLayoutProps {
  customization: SanitizedCustomization;
  onCustomizationChange: (updates: Partial<SanitizedCustomization>) => void;
  onPDFExport: () => void;
  onTXTExport: () => void;
  onCopyText: () => void;
  previewContent: React.ReactNode;
  isExportingPdf: boolean;
  isExportingTxt: boolean;
  minimalUI?: boolean;
}

export function FinalReviewExportLayout({
  customization,
  onCustomizationChange,
  onCopyText,
  previewContent,
}: FinalReviewExportLayoutProps) {
  const [margins, setMargins] = useState<"narrow" | "default" | "wide">(
    "default"
  );
  const [typographySize, setTypographySize] = useState<"compact" | "readable">(
    "readable"
  );
  const [rerender, setRerender] = useState(0);

  useEffect(() => {
    // Trigger re-measurement of content height when customization changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRerender((prev) => prev + 1);
  }, [customization, previewContent]);

  return (
    <div
      className="flex min-h-0 flex-1 overflow-hidden"
      style={{ background: "var(--color-agent-surface-lowest)" }}
    >
      {/* Left: Full resume preview */}
      <PreviewViewport
        previewContent={previewContent}
        onCopyText={onCopyText}
        rerender={rerender}
      />

      {/* Right: Settings & export */}
      <aside
        className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto p-4"
        style={{ background: "var(--color-agent-surface-low)" }}
      >
        {/* Finalize & Export */}

        {/* Template selection */}
        <Card>
          <h3
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Template
          </h3>
          <p
            className="mb-3 text-xs"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Pick a template style before exporting.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() =>
                  onCustomizationChange({ template: t.id as TemplateType })
                }
                className="rounded-lg border px-3 py-2 text-left text-xs transition-all"
                style={
                  customization.template === t.id
                    ? {
                        background: "var(--color-agent-primary-container)",
                        borderColor: "var(--color-agent-primary)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : {
                        background: "var(--color-agent-surface-container)",
                        borderColor: "var(--color-agent-outline-variant)",
                        color: "var(--color-agent-on-surface)",
                      }
                }
              >
                <span className="font-medium">{t.name}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Layout settings */}
        <Card>
          <h3
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Layout Settings
          </h3>

          <div className="mb-4">
            <p
              className="mb-2 text-xs font-medium"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Margins
            </p>
            <div
              className="flex rounded-lg p-0.5"
              style={{ background: "var(--color-agent-surface-container)" }}
            >
              {(["narrow", "default", "wide"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMargins(m)}
                  className="flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all"
                  style={
                    margins === m
                      ? {
                          background: "var(--color-agent-primary-container)",
                          color: "var(--color-agent-on-primary-container)",
                        }
                      : { color: "var(--color-agent-on-surface-variant)" }
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p
              className="mb-2 text-xs font-medium"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Typography Size
            </p>
            <div
              className="flex rounded-lg p-0.5"
              style={{ background: "var(--color-agent-surface-container)" }}
            >
              {(["compact", "readable"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setTypographySize(size)}
                  className="flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all"
                  style={
                    typographySize === size
                      ? {
                          background: "var(--color-agent-primary-container)",
                          color: "var(--color-agent-on-primary-container)",
                        }
                      : { color: "var(--color-agent-on-surface-variant)" }
                  }
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color accent */}
          <div className="mb-4">
            <p
              className="mb-2 text-xs font-medium"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Color Accent
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  title={preset.name}
                  onClick={() =>
                    onCustomizationChange({ colors: preset.colors.join(",") })
                  }
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: preset.hex,
                    borderColor:
                      customization.colors[1] === preset.colors[1]
                        ? "var(--color-agent-on-surface)"
                        : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <p
              className="mb-2 text-xs font-medium"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Font
            </p>
            <FontSelector
              value={customization.fontFamily ?? "Inter"}
              onChange={(font) => onCustomizationChange({ fontFamily: font })}
            />
          </div>
        </Card>
        <Card>
          <h3
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Finalize &amp; Export
          </h3>
          <div className="flex flex-col gap-2">
            <DownloadButton />
          </div>
        </Card>
      </aside>
    </div>
  );
}
