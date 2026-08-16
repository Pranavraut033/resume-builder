import React from "react";

import { TEMPLATE_CONFIG } from "@/components/job-v2/engine/templates";
import cn from "@/lib/cn";
import { AVAILABLE_TEMPLATES, TemplateType } from "@/types/customization";

interface TemplateThumbnailProps {
  templateId: TemplateType;
  className?: string;
}

/**
 * Config-driven CSS skeleton preview of a template — a decorative hint of its
 * layout (sidebar side/ratio/fill, header shape, heading rule, entry lines),
 * not a pixel-perfect render. Deliberately cheap: no `TemplateEngine`/
 * `useBlockPaginator` instances, so a full grid of these stays fast.
 */
export function TemplateThumbnail({
  templateId,
  className,
}: TemplateThumbnailProps) {
  const config = TEMPLATE_CONFIG[templateId];
  const accent = AVAILABLE_TEMPLATES.find((t) => t.id === templateId)
    ?.colors?.[0];

  if (!config) return null;

  const isTwoColumn = config.columns === 2;
  const sidebarSide = config.sidebarSide ?? "left";
  const sidebarRatio = config.columnRatio?.[0] ?? 0.33;
  const sidebarFill = config.sidebarFill ?? "none";

  const accentStyle = accent ? { backgroundColor: accent } : undefined;
  const accentBorderStyle = accent ? { borderColor: accent } : undefined;

  const sidebarBlock = (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-sm p-1",
        sidebarFill === "solid"
          ? "bg-agent-outline"
          : sidebarFill === "tint"
            ? "bg-agent-surface-container"
            : "bg-agent-surface-lowest"
      )}
      style={{ width: `${sidebarRatio * 100}%` }}
    >
      <div
        className="bg-agent-outline-variant h-2 w-2 shrink-0 rounded-full"
        style={accentStyle}
      />
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-agent-outline-variant h-0.5 w-full rounded-full"
        />
      ))}
    </div>
  );

  const mainBlock = (
    <div className="flex flex-1 flex-col gap-1.5 p-1">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          <div
            className="bg-agent-outline h-0.5 w-1/3 rounded-full"
            style={accentStyle}
          />
          <div className="bg-agent-outline-variant h-0.5 w-full rounded-full" />
          <div className="bg-agent-outline-variant h-0.5 w-4/5 rounded-full" />
        </div>
      ))}
    </div>
  );

  const renderHeader = () => {
    switch (config.header) {
      case "centered":
        return (
          <div className="flex flex-col items-center gap-0.5 py-1">
            <div
              className="bg-agent-outline-variant h-1.5 w-1.5 rounded-full"
              style={accentStyle}
            />
            <div className="bg-agent-outline h-0.5 w-1/3 rounded-full" />
          </div>
        );
      case "band":
      case "gradient":
        return (
          <div
            className="bg-agent-outline h-2 w-full rounded-sm"
            style={accentStyle}
          />
        );
      case "split":
        return (
          <div className="flex w-full gap-1 py-1">
            <div
              className="bg-agent-outline h-1 w-1/2 rounded-full"
              style={accentStyle}
            />
            <div className="bg-agent-outline-variant h-1 w-1/2 rounded-full" />
          </div>
        );
      case "overline":
        return (
          <div className="flex flex-col gap-0.5 py-1">
            <div
              className="bg-agent-outline h-px w-1/4 rounded-full"
              style={accentStyle}
            />
            <div className="bg-agent-outline h-1 w-2/5 rounded-full" />
          </div>
        );
      default:
        return (
          <div className="flex flex-col gap-0.5 py-1">
            <div className="bg-agent-outline h-1 w-2/5 rounded-full" />
            <div className="bg-agent-outline-variant h-0.5 w-1/4 rounded-full" />
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "border-agent-outline-variant bg-agent-surface-lowest flex aspect-[3/4] w-full flex-col overflow-hidden rounded-md border p-1.5",
        className
      )}
    >
      {renderHeader()}
      <div className="mt-1 flex flex-1 gap-1">
        {isTwoColumn && sidebarSide === "left" && sidebarBlock}
        {mainBlock}
        {isTwoColumn && sidebarSide === "right" && sidebarBlock}
      </div>
      {config.heading === "boxed" && (
        <div
          className="mt-1 h-1 w-full rounded-sm border"
          style={accentBorderStyle}
        />
      )}
    </div>
  );
}
