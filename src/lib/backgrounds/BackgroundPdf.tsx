import {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Svg,
} from "@react-pdf/renderer";
import React from "react";

import { buildBackground } from "./specs";
import { GradientDef, Shape } from "./types";
import { getPagePt, ResolvedPDFStyles } from "../pdf/resolveStyles";

function renderGradient(def: GradientDef) {
  const stops = def.stops.map((s, i) => (
    <Stop
      key={i}
      offset={`${Math.round(s.offset * 100)}%`}
      stopColor={s.color}
      stopOpacity={s.opacity ?? 1}
    />
  ));
  if (def.kind === "linear") {
    return (
      <LinearGradient
        key={def.id}
        id={def.id}
        x1={def.x1}
        y1={def.y1}
        x2={def.x2}
        y2={def.y2}
        gradientUnits="userSpaceOnUse"
      >
        {stops}
      </LinearGradient>
    );
  }
  return (
    <RadialGradient
      key={def.id}
      id={def.id}
      cx={def.cx}
      cy={def.cy}
      r={def.r}
      fx={def.cx}
      fy={def.cy}
      gradientUnits="userSpaceOnUse"
    >
      {stops}
    </RadialGradient>
  );
}

function renderShape(shape: Shape, key: number) {
  switch (shape.kind) {
    case "rect":
      return (
        <Rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          fillOpacity={shape.opacity ?? 1}
        />
      );
    case "circle":
      return (
        <Circle
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          fill={shape.fill}
          fillOpacity={shape.opacity ?? 1}
        />
      );
    case "line":
      return (
        <Line
          key={key}
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          strokeOpacity={shape.opacity ?? 1}
        />
      );
    case "path":
      return (
        <Path
          key={key}
          d={shape.d}
          fill={shape.fill ?? "none"}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          fillOpacity={shape.opacity ?? 1}
        />
      );
  }
}

/**
 * Full-bleed, theme-coloured background layer for the PDF export. Render it as
 * the FIRST child of a `<Page>` so react-pdf paints it behind the content. The
 * negative offsets cancel the page padding so the pattern reaches the edges.
 */
export const BackgroundPdf: React.FC<{ styles: ResolvedPDFStyles }> = ({
  styles,
}) => {
  const { background, colorsTuple, marginPt, pageFormat } = styles;
  if (!background || background === "none") return null;

  const { w, h } = getPagePt(pageFormat);
  const drawing = buildBackground(background, colorsTuple, w, h);
  if (drawing.shapes.length === 0) return null;

  return (
    <Svg
      fixed
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", top: -marginPt, left: -marginPt }}
    >
      {drawing.defs.length > 0 && (
        <Defs>{drawing.defs.map(renderGradient)}</Defs>
      )}
      <G>{drawing.shapes.map(renderShape)}</G>
    </Svg>
  );
};

export default BackgroundPdf;
