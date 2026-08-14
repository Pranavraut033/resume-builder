/**
 * Extracts the drawn-content bounding box from a rendered PDF, in PDF user
 * space (points, origin bottom-left) — used to assert a background layer
 * actually reaches the page edges instead of eyeballing a screenshot.
 *
 * Uses `pdfjs-dist`'s operator list (no rasterization, no `canvas` native
 * dependency, no external binary) so this runs anywhere `npm test` runs,
 * including CI.
 */
import { OPS, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

type Matrix = [number, number, number, number, number, number];

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Bounding box (in PDF points) of every filled path/rectangle drawn on page
 * 1, with the current transformation matrix applied — i.e. the box's real
 * position on the page, not the shape's local coordinates. Ignores stroke
 * width, text, and clipping (a shape drawn outside the page's own bounds
 * still contributes its true coordinates, which is what makes this catch a
 * mispositioned full-bleed layer that CSS-style clipping would otherwise
 * hide from a naive screenshot check).
 */
export async function getFillBBox(pdfBytes: Uint8Array): Promise<BBox> {
  const doc = await getDocument({ data: pdfBytes }).promise;
  const page = await doc.getPage(1);
  const opList = await page.getOperatorList();

  const ctmStack: Matrix[] = [[1, 0, 0, 1, 0, 0]];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const extend = (x: number, y: number) => {
    const ctm = ctmStack[ctmStack.length - 1];
    const [tx, ty] = apply(ctm, x, y);
    minX = Math.min(minX, tx);
    maxX = Math.max(maxX, tx);
    minY = Math.min(minY, ty);
    maxY = Math.max(maxY, ty);
  };

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];

    if (fn === OPS.save) {
      ctmStack.push(ctmStack[ctmStack.length - 1]);
    } else if (fn === OPS.restore) {
      ctmStack.pop();
    } else if (fn === OPS.transform) {
      const top = ctmStack[ctmStack.length - 1];
      ctmStack[ctmStack.length - 1] = multiply(top, args as Matrix);
    } else if (fn === OPS.rectangle) {
      const [x, y, w, h] = args as number[];
      extend(x, y);
      extend(x + w, y);
      extend(x, y + h);
      extend(x + w, y + h);
    } else if (fn === OPS.constructPath) {
      const [, coords] = args as [unknown, number[]];
      for (let j = 0; j < coords.length; j += 2) {
        extend(coords[j], coords[j + 1]);
      }
    }
  }

  await doc.destroy();
  return { minX, minY, maxX, maxY };
}
