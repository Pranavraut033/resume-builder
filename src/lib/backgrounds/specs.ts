import {
  BackgroundDrawing,
  BackgroundId,
  GradientDef,
  Shape,
  ThemeColors,
} from "./types";

/**
 * Builds the renderer-agnostic drawing for a background pattern in a coordinate
 * space of `w` x `h` (CSS px for the preview, PDF points for export). All
 * patterns are intentionally subtle (low opacity) so they never compete with
 * the resume text. Colours are derived from the theme tuple, except `pride`
 * which uses a fixed rainbow palette by design.
 */

const EMPTY: BackgroundDrawing = { defs: [], shapes: [] };

const PRIDE_PALETTE = [
  "#e40303", // red
  "#ff8c00", // orange
  "#ffed00", // yellow
  "#008026", // green
  "#004dff", // blue
  "#750787", // violet
];

function lines(primary: string, w: number, h: number): BackgroundDrawing {
  const spacing = 40;
  const shapes: Shape[] = [];
  // 45° parallel lines sweeping across the whole page.
  for (let x = -h; x < w; x += spacing) {
    shapes.push({
      kind: "line",
      x1: x,
      y1: h,
      x2: x + h,
      y2: 0,
      stroke: primary,
      strokeWidth: 1,
      opacity: 0.05,
    });
  }
  return { defs: [], shapes };
}

function dots(primary: string, w: number, h: number): BackgroundDrawing {
  const spacing = 42;
  const r = 1.6;
  const shapes: Shape[] = [];
  for (let y = spacing / 2; y < h; y += spacing) {
    for (let x = spacing / 2; x < w; x += spacing) {
      shapes.push({
        kind: "circle",
        cx: x,
        cy: y,
        r,
        fill: primary,
        opacity: 0.07,
      });
    }
  }
  return { defs: [], shapes };
}

function curves(
  primary: string,
  accent: string,
  w: number,
  h: number
): BackgroundDrawing {
  const shapes: Shape[] = [];
  // A soft band sweeping across the top…
  shapes.push({
    kind: "path",
    d: `M0 0 L${w} 0 L${w} ${h * 0.12} C ${w * 0.7} ${h * 0.2}, ${w * 0.3} ${h * 0.04}, 0 ${h * 0.16} Z`,
    fill: primary,
    opacity: 0.05,
  });
  // …and a mirrored one across the bottom.
  shapes.push({
    kind: "path",
    d: `M0 ${h} L${w} ${h} L${w} ${h * 0.84} C ${w * 0.65} ${h * 0.96}, ${w * 0.35} ${h * 0.8}, 0 ${h * 0.9} Z`,
    fill: accent,
    opacity: 0.05,
  });
  return { defs: [], shapes };
}

function waves(
  primary: string,
  accent: string,
  w: number,
  h: number
): BackgroundDrawing {
  const shapes: Shape[] = [];
  const colors = [primary, accent, primary];
  const baseY = [0.78, 0.86, 0.94];
  const amp = h * 0.04;
  for (let i = 0; i < 3; i++) {
    const y = h * baseY[i];
    shapes.push({
      kind: "path",
      d: `M0 ${y} C ${w * 0.25} ${y - amp}, ${w * 0.5} ${y + amp}, ${w * 0.75} ${y - amp * 0.6} S ${w} ${y - amp * 0.2}, ${w} ${y} L${w} ${h} L0 ${h} Z`,
      fill: colors[i],
      opacity: 0.05,
    });
  }
  return { defs: [], shapes };
}

function blobs(
  primary: string,
  accent: string,
  w: number,
  h: number
): BackgroundDrawing {
  const shapes: Shape[] = [
    {
      kind: "circle",
      cx: w * 1.02,
      cy: -h * 0.04,
      r: w * 0.4,
      fill: primary,
      opacity: 0.05,
    },
    {
      kind: "circle",
      cx: -w * 0.06,
      cy: h * 1.05,
      r: w * 0.38,
      fill: accent,
      opacity: 0.05,
    },
    {
      kind: "circle",
      cx: w * 0.12,
      cy: h * 0.08,
      r: w * 0.16,
      fill: accent,
      opacity: 0.04,
    },
  ];
  return { defs: [], shapes };
}

function mesh(
  primary: string,
  accent: string,
  w: number,
  h: number
): BackgroundDrawing {
  const defs: GradientDef[] = [
    {
      id: "bg-mesh-linear",
      kind: "linear",
      x1: 0,
      y1: 0,
      x2: w,
      y2: h,
      stops: [
        { offset: 0, color: primary, opacity: 0.08 },
        { offset: 1, color: accent, opacity: 0.06 },
      ],
    },
    {
      id: "bg-mesh-radial",
      kind: "radial",
      cx: w * 0.85,
      cy: h * 0.15,
      r: w * 0.6,
      stops: [
        { offset: 0, color: accent, opacity: 0.1 },
        { offset: 1, color: accent, opacity: 0 },
      ],
    },
  ];
  const shapes: Shape[] = [
    {
      kind: "rect",
      x: 0,
      y: 0,
      width: w,
      height: h,
      fill: "url(#bg-mesh-linear)",
    },
    {
      kind: "rect",
      x: 0,
      y: 0,
      width: w,
      height: h,
      fill: "url(#bg-mesh-radial)",
    },
  ];
  return { defs, shapes };
}

function pride(w: number, h: number): BackgroundDrawing {
  // A thin vertical rainbow band hugging the left edge — present but quiet.
  const stripeW = 7;
  const shapes: Shape[] = PRIDE_PALETTE.map((color, i) => ({
    kind: "rect" as const,
    x: i * stripeW,
    y: 0,
    width: stripeW,
    height: h,
    fill: color,
    opacity: 0.18,
  }));
  return { defs: [], shapes };
}

/**
 * Prefixes gradient ids (and the `url(#id)` references that point at them) so
 * multiple background instances can coexist in one DOM without id collisions.
 */
export function namespaceDrawing(
  drawing: BackgroundDrawing,
  prefix: string
): BackgroundDrawing {
  if (drawing.defs.length === 0) return drawing;
  const map = new Map(drawing.defs.map((d) => [d.id, `${prefix}-${d.id}`]));
  const repl = (fill?: string): string | undefined => {
    if (!fill) return fill;
    const m = /^url\(#(.+)\)$/.exec(fill);
    if (m && map.has(m[1])) return `url(#${map.get(m[1])})`;
    return fill;
  };
  const defs = drawing.defs.map((d) => ({ ...d, id: map.get(d.id) as string }));
  const shapes = drawing.shapes.map((s) =>
    s.kind === "rect" || s.kind === "circle"
      ? { ...s, fill: repl(s.fill) as string }
      : s.kind === "path"
        ? { ...s, fill: repl(s.fill) }
        : s
  );
  return { defs, shapes };
}

export function buildBackground(
  id: BackgroundId,
  colors: ThemeColors,
  w: number,
  h: number
): BackgroundDrawing {
  const [primary, , accent] = colors;
  switch (id) {
    case "lines":
      return lines(primary, w, h);
    case "dots":
      return dots(primary, w, h);
    case "curves":
      return curves(primary, accent, w, h);
    case "waves":
      return waves(primary, accent, w, h);
    case "blobs":
      return blobs(primary, accent, w, h);
    case "mesh":
      return mesh(primary, accent, w, h);
    case "pride":
      return pride(w, h);
    case "none":
    default:
      return EMPTY;
  }
}
