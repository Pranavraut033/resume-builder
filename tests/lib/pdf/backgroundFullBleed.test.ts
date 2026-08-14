/**
 * Regression coverage for the bug fixed in BackgroundPdf.tsx: react-pdf
 * positions an absolutely-positioned `fixed` child against the `<Page>`'s
 * true border box, NOT a padding-inset content box the way a standard CSS
 * containing block works. A prior version of `BackgroundPdf` shifted its
 * background layer by `-marginPt` to "cancel" the page's own padding —
 * which actually pushed the pattern off-page on the top-left corner and
 * left it exactly `marginPt` short of the bottom/right edges. See the git
 * history of `src/lib/backgrounds/BackgroundPdf.tsx` for the full story.
 *
 * These tests render real PDFs (via `pdf(el).toBuffer()`, not a mock) and
 * inspect the actual drawn geometry with `pdfjs-dist` — the earlier version
 * of this bug looked correct in a React-prop-level test and only showed up
 * in the rendered output, so nothing short of real geometry inspection
 * would have caught it.
 */
import { pdf } from "@react-pdf/renderer";
import React from "react";
import { describe, expect, it } from "vitest";

import { TEMPLATE_CONFIG } from "@/components/job-v2/engine/templates";
import { PDFTemplateEngine } from "@/lib/pdf/PDFTemplateEngine";
import { getPagePt, resolvePDFCustomization } from "@/lib/pdf/resolveStyles";
import { ModernMinimalPDF } from "@/lib/pdf/templates/ModernMinimalPDF";
import { COVER_LETTER_TEMPLATE_MAP } from "@/lib/pdfExport";
import {
  DEFAULT_CUSTOMIZATION,
  SanitizedCustomization,
} from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

import { getFillBBox } from "./pdfGeometry";

const EDGE_TOLERANCE_PT = 1;

const resume: ResumeJSON = {
  header: {
    name: "Pranav Raut",
    email: "pranavraut033@gmail.com",
    phone: "+49 1551 0256211",
    location: "Berlin",
    linkedin: "linkedin.com/in/rautpranav",
    github: "github.com/pranavraut033",
    website: "pranavraut.dev",
    headline: "Full-stack Engineer",
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  publications: [],
  volunteer: [],
  awards: [],
  languages: [],
  interests: [],
  customSections: [],
  sectionOrder: [
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "publications",
    "volunteer",
    "awards",
    "languages",
    "interests",
  ],
  hiddenSections: [],
} as unknown as ResumeJSON;

const coverLetterBody = "<p>Body text for verification.</p>";

// "mesh" is the only background whose first shape is defined (specs.ts) as
// a plain rect from (0,0) to (w,h) — an unambiguous full-bleed control
// shape, so a bounding-box check against it can't be fooled by a pattern
// (like "waves") that legitimately only covers part of the page.
function customizationFor(
  overrides: Partial<SanitizedCustomization>
): SanitizedCustomization {
  return {
    ...DEFAULT_CUSTOMIZATION,
    background: "mesh",
    marginSize: "wide",
    ...overrides,
  } as SanitizedCustomization;
}

async function renderToBBox(el: React.ReactElement) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance = pdf(el as any);
  const buffer = await instance.toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of buffer as unknown as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  return getFillBBox(new Uint8Array(Buffer.concat(chunks)));
}

function expectFullBleed(
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  pageFormat: "A4" | "LETTER"
) {
  const { w, h } = getPagePt(pageFormat);
  expect(bbox.minX).toBeLessThanOrEqual(EDGE_TOLERANCE_PT);
  expect(bbox.minY).toBeLessThanOrEqual(EDGE_TOLERANCE_PT);
  expect(bbox.maxX).toBeGreaterThanOrEqual(w - EDGE_TOLERANCE_PT);
  expect(bbox.maxY).toBeGreaterThanOrEqual(h - EDGE_TOLERANCE_PT);
}

describe("BackgroundPdf positioning contract (control)", () => {
  it("an absolutely-positioned full-page child needs no offset against a padded Page", async () => {
    const { Document, Page, Svg, Rect } = await import("@react-pdf/renderer");
    const el = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "LETTER", style: { padding: 36 } },
        React.createElement(
          Svg,
          {
            width: 612,
            height: 792,
            viewBox: "0 0 612 792",
            style: { position: "absolute", top: 0, left: 0 },
          },
          React.createElement(Rect, {
            x: 0,
            y: 0,
            width: 612,
            height: 792,
            fill: "#4444ff",
          })
        )
      )
    );
    expectFullBleed(await renderToBBox(el), "LETTER");
  });

  it("documents why: shifting by -marginPt (the bug) leaves the far edges short", async () => {
    const { Document, Page, Svg, Rect } = await import("@react-pdf/renderer");
    const el = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "LETTER", style: { padding: 36 } },
        React.createElement(
          Svg,
          {
            width: 612,
            height: 792,
            viewBox: "0 0 612 792",
            style: { position: "absolute", top: -36, left: -36 },
          },
          React.createElement(Rect, {
            x: 0,
            y: 0,
            width: 612,
            height: 792,
            fill: "#4444ff",
          })
        )
      )
    );
    const bbox = await renderToBBox(el);
    // PDF space has a bottom-left origin. Shifting the layer up-left by
    // marginPt (the bug) leaves it flush on top and left — the shifted
    // portion there simply extends past the page edge, which still covers
    // the edge — while falling exactly marginPt short of the bottom and
    // right edges instead. This is the shape the real bug took, and is
    // what a naive "top-left looks fine" check would miss.
    expect(bbox.minY).toBeGreaterThan(30); // short of the bottom edge
    expect(bbox.maxX).toBeLessThan(612 - 30); // short of the right edge
  });
});

describe("Cover letter templates — background reaches all four page edges", () => {
  const entries = Object.entries(COVER_LETTER_TEMPLATE_MAP);
  expect(entries.length).toBeGreaterThan(0);

  it.each(entries)("%s", async (_id, Component) => {
    const customization = customizationFor({
      template: _id,
      pageFormat: "letter",
    });
    const styles = resolvePDFCustomization(customization);
    const el = React.createElement(Component, {
      coverLetter: coverLetterBody,
      resume,
      jobDetails: null,
      styles,
    });
    expectFullBleed(await renderToBBox(el), styles.pageFormat);
  });
});

describe("Resume templates — background reaches all four page edges", () => {
  const templateIds = Object.keys(TEMPLATE_CONFIG);
  expect(templateIds.length).toBeGreaterThan(0);

  it.each(templateIds)("%s (PDFTemplateEngine)", async (templateId) => {
    const customization = customizationFor({
      template: templateId,
      pageFormat: "a4",
    });
    const styles = resolvePDFCustomization(customization);
    const config = TEMPLATE_CONFIG[templateId as keyof typeof TEMPLATE_CONFIG]!;
    const el = React.createElement(PDFTemplateEngine, {
      resume,
      styles,
      config,
    });
    expectFullBleed(await renderToBBox(el), styles.pageFormat);
  });

  it("legacy ModernMinimalPDF fallback (unrecognized template id)", async () => {
    const customization = customizationFor({ pageFormat: "letter" });
    const styles = resolvePDFCustomization(customization);
    const el = React.createElement(ModernMinimalPDF, { resume, styles });
    expectFullBleed(await renderToBBox(el), styles.pageFormat);
  });
});
