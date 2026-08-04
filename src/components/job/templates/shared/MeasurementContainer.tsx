import React from "react";

/**
 * Off-screen container used by templates to measure block heights.
 * Rendered at the exact pixel width of the real column/content area it
 * mirrors (matching padding must be applied by the caller) so
 * getBoundingClientRect returns accurate values without affecting visible
 * layout.
 */
const MeasurementContainer: React.FC<{
  widthPx: number;
  children: React.ReactNode;
}> = ({ widthPx, children }) => (
  <div
    aria-hidden
    style={{
      position: "fixed",
      top: -9999,
      left: 0,
      width: `${widthPx}px`,
      visibility: "hidden",
      pointerEvents: "none",
      zIndex: -1,
    }}
  >
    {children}
  </div>
);

export default MeasurementContainer;
