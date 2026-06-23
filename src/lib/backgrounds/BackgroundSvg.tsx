"use client";

import React from "react";

import { buildBackground, namespaceDrawing } from "./specs";
import { BackgroundId, GradientDef, Shape, ThemeColors } from "./types";

type Props = {
  background: BackgroundId | undefined;
  colors: ThemeColors;
  /** Coordinate space (CSS px). The svg stretches to fill its container. */
  width: number;
  height: number;
};

function renderGradient(def: GradientDef) {
  const stops = def.stops.map((s, i) => (
    <stop
      key={i}
      offset={s.offset}
      stopColor={s.color}
      stopOpacity={s.opacity ?? 1}
    />
  ));
  if (def.kind === "linear") {
    return (
      <linearGradient
        key={def.id}
        id={def.id}
        gradientUnits="userSpaceOnUse"
        x1={def.x1}
        y1={def.y1}
        x2={def.x2}
        y2={def.y2}
      >
        {stops}
      </linearGradient>
    );
  }
  return (
    <radialGradient
      key={def.id}
      id={def.id}
      gradientUnits="userSpaceOnUse"
      cx={def.cx}
      cy={def.cy}
      r={def.r}
    >
      {stops}
    </radialGradient>
  );
}

function renderShape(shape: Shape, key: number) {
  switch (shape.kind) {
    case "rect":
      return (
        <rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          opacity={shape.opacity ?? 1}
        />
      );
    case "circle":
      return (
        <circle
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          fill={shape.fill}
          opacity={shape.opacity ?? 1}
        />
      );
    case "line":
      return (
        <line
          key={key}
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          opacity={shape.opacity ?? 1}
        />
      );
    case "path":
      return (
        <path
          key={key}
          d={shape.d}
          fill={shape.fill ?? "none"}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          opacity={shape.opacity ?? 1}
        />
      );
  }
}

/**
 * Absolutely-positioned, theme-coloured background layer for the HTML preview.
 * Render it as the first child of a `position: relative` page container; keep
 * the page content above it (e.g. wrapped in a `relative z-[1]` element).
 */
export const BackgroundSvg: React.FC<Props> = ({
  background,
  colors,
  width,
  height,
}) => {
  const uid = React.useId().replace(/:/g, "");
  if (!background || background === "none") return null;

  const drawing = namespaceDrawing(
    buildBackground(background, colors, width, height),
    uid
  );
  if (drawing.shapes.length === 0) return null;

  return (
    <svg
      aria-hidden
      data-resume-bg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {drawing.defs.length > 0 && (
        <defs>{drawing.defs.map(renderGradient)}</defs>
      )}
      {drawing.shapes.map(renderShape)}
    </svg>
  );
};

export default BackgroundSvg;
