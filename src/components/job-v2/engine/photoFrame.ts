import type { PhotoFrame, PhotoShape } from "@/types/customization";
import type { CSSProperties } from "react";

/** Corner radius for a given shape, as a fraction of the photo's box size. */
const SHAPE_RADIUS_RATIO: Record<PhotoShape, number> = {
  circle: 0.5,
  squircle: 0.28,
  square: 0.06,
};

export function photoRadius(shape: PhotoShape, sizePx: number): number {
  return sizePx * SHAPE_RADIUS_RATIO[shape];
}

/** DOM: Tailwind `object-cover` box + inline style for radius/frame. */
export function photoDomStyle(
  shape: PhotoShape,
  frame: PhotoFrame,
  sizePx: number,
  frameColor: string
): CSSProperties {
  return {
    borderRadius: photoRadius(shape, sizePx),
    ...(frame === "ring" && { border: `2px solid ${frameColor}` }),
    ...(frame === "shadow" && {
      boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
    }),
  };
}
