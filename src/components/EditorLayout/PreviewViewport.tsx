import { useCallback, useEffect, useRef, useState } from "react";

import {
  AVAILABLE_TEMPLATES,
  SanitizedCustomization,
  TemplateType,
} from "@/types/customization";

import { Button, Icon, Select } from "../ui";

type Props = {
  previewContent: React.ReactNode;
  onCopyText: () => void;
  rerender?: number | string; // Used to trigger re-measurement when content changes
  customization?: SanitizedCustomization; // Include customization in dependencies to trigger re-measurement when it changes
  updateCustomization?: (updates: Partial<SanitizedCustomization>) => void; // Include in dependencies if it can change
};

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const CSS_PIXELS_PER_MM = 96 / 25.4;
const A4_WIDTH_PX = A4_WIDTH_MM * CSS_PIXELS_PER_MM;
const A4_HEIGHT_PX = A4_HEIGHT_MM * CSS_PIXELS_PER_MM;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

const PreviewViewport: React.FC<Props> = ({
  previewContent,
  onCopyText,
  rerender,
  customization, // Include customization in dependencies to trigger re-measurement when it changes
  updateCustomization,
}) => {
  const [zoomScale, setZoomScale] = useState(1);
  const [isFitMode, setIsFitMode] = useState(true);
  const [renderHeightPx, setRenderHeightPx] = useState(A4_HEIGHT_PX);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const previewPageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const pageEl = previewPageRef.current;
    if (!pageEl) return;

    const measureHeight = () => {
      const measured = pageEl.scrollHeight;
      setRenderHeightPx(Math.max(A4_HEIGHT_PX, measured));
    };

    measureHeight();

    const observer = new ResizeObserver(measureHeight);
    observer.observe(pageEl);
    return () => observer.disconnect();
  }, [rerender]);

  const zoomPercent = Math.round(zoomScale * 100);
  const scaledWidthPx = A4_WIDTH_PX * zoomScale;
  const scaledHeightPx = renderHeightPx * zoomScale;
  const pageBreakPositions = Array.from(
    { length: Math.max(0, Math.floor((renderHeightPx - 1) / A4_HEIGHT_PX)) },
    (_, index) => (index + 1) * A4_HEIGHT_PX
  );

  const recalculateFitZoom = useCallback(() => {
    const viewportEl = previewViewportRef.current;
    if (!viewportEl) return;

    const horizontalPadding = 48;
    const availableWidth = Math.max(
      0,
      viewportEl.clientWidth - horizontalPadding
    );
    const nextZoom = clampZoom(availableWidth / A4_WIDTH_PX);
    setZoomScale(nextZoom);
  }, []);

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
    <div
      className="flex min-w-0 flex-1 flex-col overflow-y-auto border-r p-6"
      style={{ borderColor: "var(--color-agent-outline-variant)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {customization && updateCustomization && (
            <Select
              value={customization.template}
              options={AVAILABLE_TEMPLATES.map((t) => t.id)}
              onChange={(value) =>
                updateCustomization({ template: value as TemplateType })
              }
            ></Select>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => {
              setIsFitMode(true);
              recalculateFitZoom();
            }}
            style={
              isFitMode
                ? {
                    background: "var(--color-agent-primary-container)",
                    color: "var(--color-agent-on-primary-container)",
                  }
                : undefined
            }
          >
            Fit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => {
              setIsFitMode(false);
              setZoomScale(1);
            }}
            style={
              !isFitMode && zoomPercent === 100
                ? {
                    background: "var(--color-agent-primary-container)",
                    color: "var(--color-agent-on-primary-container)",
                  }
                : undefined
            }
          >
            100%
          </Button>
          <div
            className="flex items-center gap-1 rounded-lg border px-2 py-1"
            style={{
              borderColor: "var(--color-agent-outline-variant)",
              background: "var(--color-agent-surface)",
            }}
          >
            <Button
              variant="ghost"
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
            <span
              className="w-14 text-center text-xs font-semibold tabular-nums"
              style={{ color: "var(--color-agent-on-surface)" }}
            >
              {zoomPercent}%
            </span>
            <Button
              variant="ghost"
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

          {!(customization || updateCustomization) && (
            <Button variant="secondary" onClick={onCopyText}>
              <Icon name="Copy" className="mr-1.5 h-4 w-4" />
              Copy Text
            </Button>
          )}
        </div>
      </div>

      <div className="bg-agent-inverse-on-surface border-agent-outline-variant overflow-hidden rounded-xl border shadow-md">
        <div ref={previewViewportRef} className="h-full overflow-auto p-6">
          <div
            className="relative mx-auto"
            style={{ width: scaledWidthPx, minHeight: scaledHeightPx }}
          >
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{
                transform: `scale(${zoomScale})`,
                width: `${A4_WIDTH_MM}mm`,
              }}
            >
              <div
                ref={previewPageRef}
                className="bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                style={{
                  width: `${A4_WIDTH_MM}mm`,
                  minHeight: `${A4_HEIGHT_MM}mm`,
                  breakAfter: "page",
                }}
              >
                {previewContent}
              </div>
            </div>

            {/* Page breaks */}
            {pageBreakPositions.map((breakPosition, index) => (
              <div
                key={`${breakPosition}-${index}`}
                className="pointer-events-none absolute right-0 left-0"
                style={{ top: breakPosition * zoomScale }}
              >
                <div
                  className="flex h-7 items-center gap-3 px-3"
                  style={{
                    transform: "translateY(-50%)",
                    background: "var(--color-agent-surface-lowest)",
                  }}
                >
                  <div
                    className="h-px flex-1"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, var(--color-agent-outline), transparent)",
                    }}
                  />
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                    style={{
                      color: "var(--color-agent-on-surface-variant)",
                      background: "var(--color-agent-surface-container)",
                    }}
                  >
                    Page Break
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, var(--color-agent-outline), transparent)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewViewport;
