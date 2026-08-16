import { ThemeColors } from "@/types/customization";

/**
 * Subtle, theme-coloured page backgrounds shared by the HTML preview and the
 * @react-pdf/renderer PDF export. The pattern geometry is defined once here as
 * renderer-agnostic primitives so both renderers stay in sync.
 */
export type BackgroundId =
  | "none"
  | "lines"
  | "dots"
  | "curves"
  | "waves"
  | "blobs"
  | "mesh"
  | "pride"
  | "corner-dots"
  | "world-map";

export type BackgroundMeta = {
  id: BackgroundId;
  name: string;
  description: string;
};

export const AVAILABLE_BACKGROUNDS: BackgroundMeta[] = [
  { id: "none", name: "None", description: "Plain background" },
  { id: "lines", name: "Lines", description: "Fine diagonal line texture" },
  { id: "dots", name: "Dots", description: "Light dotted grid" },
  { id: "curves", name: "Curves", description: "Soft flowing curved bands" },
  { id: "waves", name: "Waves", description: "Layered waves along the edge" },
  {
    id: "blobs",
    name: "Abstract",
    description: "Organic blobs in the corners",
  },
  { id: "mesh", name: "Mesh", description: "Soft gradient wash" },
  { id: "pride", name: "Pride", description: "Subtle rainbow accent" },
  {
    id: "corner-dots",
    name: "Corner Dots",
    description: "Faded dot cluster in the top-right corner",
  },
  {
    id: "world-map",
    name: "World Map",
    description: "Dotted world map silhouette in the top-right corner",
  },
];

export const VALID_BACKGROUND_IDS = new Set<BackgroundId>(
  AVAILABLE_BACKGROUNDS.map((b) => b.id)
);

export function isBackgroundId(value: string): value is BackgroundId {
  return VALID_BACKGROUND_IDS.has(value as BackgroundId);
}

// ── Renderer-agnostic drawing primitives ─────────────────────────────────────

export type GradientStop = { offset: number; color: string; opacity?: number };

export type GradientDef =
  | {
      id: string;
      kind: "linear";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stops: GradientStop[];
    }
  | {
      id: string;
      kind: "radial";
      cx: number;
      cy: number;
      r: number;
      stops: GradientStop[];
    };

export type Shape =
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
      opacity?: number;
    }
  | {
      kind: "circle";
      cx: number;
      cy: number;
      r: number;
      fill: string;
      opacity?: number;
    }
  | {
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      strokeWidth: number;
      opacity?: number;
    }
  | {
      kind: "path";
      d: string;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
    };

export type BackgroundDrawing = { defs: GradientDef[]; shapes: Shape[] };

export type { ThemeColors };
