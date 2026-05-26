import React from "react";

/**
 * Off-screen container used by templates to measure block heights.
 * Rendered at the correct page width so getBoundingClientRect returns accurate
 * values without affecting visible layout.
 */
const MeasurementContainer: React.FC<{
  widthMm: number;
  children: React.ReactNode;
}> = ({ widthMm, children }) => (
  <div
    aria-hidden
    style={{
      position: "fixed",
      top: -9999,
      left: 0,
      width: `${widthMm}mm`,
      visibility: "hidden",
      pointerEvents: "none",
      zIndex: -1,
    }}
  >
    {children}
  </div>
);

export default MeasurementContainer;
