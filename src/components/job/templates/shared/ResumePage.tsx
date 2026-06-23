import React from "react";

import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { BackgroundId, ThemeColors } from "@/lib/backgrounds/types";

/** A fixed-size page box that matches the physical page dimensions. */
const ResumePage: React.FC<{
  widthPx: number;
  heightPx: number;
  children: React.ReactNode;
  /** 0-based page index. Provide together with pageCount to show a page label. */
  pageIndex?: number;
  /** Total number of pages. */
  pageCount?: number;
  /** Optional theme-coloured background pattern rendered behind the content. */
  background?: BackgroundId;
  colors?: ThemeColors;
}> = ({
  widthPx,
  heightPx,
  children,
  pageIndex,
  pageCount,
  background,
  colors,
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      flexShrink: 0,
      marginBottom: 32,
    }}
  >
    <div
      data-resume-page
      style={{
        width: widthPx,
        height: heightPx,
        overflow: "hidden",
        background: "white",
        position: "relative",
        boxShadow:
          "0 4px 6px -1px rgba(0,0,0,0.10), 0 10px 32px -4px rgba(0,0,0,0.14)",
        borderRadius: 2,
      }}
    >
      {background && background !== "none" && colors && (
        <BackgroundSvg
          background={background}
          colors={colors}
          width={widthPx}
          height={heightPx}
        />
      )}
      <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
        {children}
      </div>
    </div>

    {pageIndex !== undefined && pageCount !== undefined && pageCount > 1 && (
      <div
        aria-hidden
        data-no-pdf
        style={{
          marginTop: 8,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--color-agent-on-surface-variant, #6b7280)",
          userSelect: "none",
        }}
      >
        Page {pageIndex + 1} of {pageCount}
      </div>
    )}
  </div>
);

export default ResumePage;
