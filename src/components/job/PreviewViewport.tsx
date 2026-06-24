"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useJobPageContext } from "@/contexts/JobPageContext";
import { getPageDimensions } from "@/lib/pageDimensions";
import { AVAILABLE_TEMPLATES, TemplateType } from "@/types/customization";

import { Button, Icon, Select } from "../ui";

type Props = {
  previewContent: React.ReactNode;
  showTemplateSelector?: boolean;
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;
const PAGE_GAP = 24;

function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

const PreviewViewport: React.FC<Props> = ({
  previewContent,
  showTemplateSelector = false,
}) => {
  const { customization, updateCustomizationState: updateCustomization } =
    useJobPageContext();

  const { widthPx: PAGE_WIDTH_PX, heightPx: PAGE_HEIGHT_PX } =
    getPageDimensions(customization.pageFormat, customization.marginSize);

  const [zoomScale, setZoomScale] = useState(1);
  const [isFitMode, setIsFitMode] = useState(true);
  const [pageCount, setPageCount] = useState(1);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const contentContainerRef = useRef<HTMLDivElement | null>(null);

  // Detect page count by watching for [data-resume-page] elements
  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) return;

    const countPages = () => {
      setPageCount(
        Math.max(1, container.querySelectorAll("[data-resume-page]").length)
      );
    };

    countPages();

    const observer = new MutationObserver(countPages);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    return () => observer.disconnect();
  }, [previewContent]);

  const zoomPercent = Math.round(zoomScale * 100);
  const scaledWidthPx = PAGE_WIDTH_PX * zoomScale;
  const totalUnscaledHeight =
    pageCount * PAGE_HEIGHT_PX + (pageCount - 1) * PAGE_GAP;

  const recalculateFitZoom = useCallback(() => {
    const viewportEl = previewViewportRef.current;
    if (!viewportEl) return;

    const horizontalPadding = 48;
    const availableWidth = Math.max(
      0,
      viewportEl.clientWidth - horizontalPadding
    );
    const nextZoom = clampZoom(availableWidth / PAGE_WIDTH_PX);
    setZoomScale(nextZoom);
  }, [PAGE_WIDTH_PX]);

  useEffect(() => {
    if (!isFitMode) return;

    recalculateFitZoom();

    const viewportEl = previewViewportRef.current;
    if (!viewportEl) return;

    const observer = new ResizeObserver(() => {
      recalculateFitZoom();
    });
    observer.observe(viewportEl);

    return () => observer.disconnect();
  }, [isFitMode, recalculateFitZoom]);

  return (
    <div className="flex h-[88vh] flex-1 flex-col space-y-2 overflow-hidden p-2">
      {showTemplateSelector && (
        <Select
          value={customization.template}
          options={AVAILABLE_TEMPLATES.map((t) => t.id)}
          onChange={(value) =>
            updateCustomization({ template: value as TemplateType })
          }
        />
      )}

      <div className="bg-agent-inverse-on-surface border-agent-outline-variant flex-1 overflow-hidden rounded-xl border shadow-md">
        <div ref={previewViewportRef} className="h-full overflow-auto p-6">
          {/* Scale container: clips to scaled page size */}
          <div
            style={{
              width: scaledWidthPx,
              height: totalUnscaledHeight * zoomScale,
              margin: "0 auto",
              position: "relative",
            }}
          >
            {/* Inner unscaled content */}
            <div
              ref={contentContainerRef}
              style={{
                transformOrigin: "top left",
                transform: `scale(${zoomScale})`,
                width: PAGE_WIDTH_PX,
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              {previewContent}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant={isFitMode ? "primary" : "secondary"}
          size="sm"
          className="h-7 px-2"
          onClick={() => {
            setIsFitMode(true);
            recalculateFitZoom();
          }}
        >
          Fit
        </Button>
        <Button
          variant={!isFitMode && zoomPercent === 100 ? "primary" : "secondary"}
          size="sm"
          className="h-7 px-2"
          onClick={() => {
            setIsFitMode(false);
            setZoomScale(1);
          }}
        >
          100%
        </Button>
        <div className="bg-agent-surface border-agent-outline-variant flex items-center gap-1 rounded-lg border px-1 py-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2"
            onClick={() => {
              setIsFitMode(false);
              setZoomScale((current) => clampZoom(current - ZOOM_STEP));
            }}
            aria-label="Zoom out"
          >
            <Icon name="minus" className="h-4 w-4" />
          </Button>
          <span className="text-agent-on-surface w-12 text-center text-xs font-semibold tabular-nums">
            {zoomPercent}%
          </span>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2"
            onClick={() => {
              setIsFitMode(false);
              setZoomScale((current) => clampZoom(current + ZOOM_STEP));
            }}
            aria-label="Zoom in"
          >
            <Icon name="plus" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreviewViewport;
