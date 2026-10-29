/**
 * An experience entry may break between bullets in the PDF: unit 1 is the
 * entry head + first bullet, then one unit per remaining bullet. A 40-bullet
 * job must therefore start on page 1 and continue on page 2 instead of
 * jumping whole to the next page.
 */
import { pdf } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import React from "react";
import { describe, expect, it } from "vitest";

import { TEMPLATE_CONFIG } from "@/components/job-v2/engine/templates";
import { PDFTemplateEngine } from "@/lib/pdf/PDFTemplateEngine";
import { resolvePDFCustomization } from "@/lib/pdf/resolveStyles";
import {
  DEFAULT_CUSTOMIZATION,
  SanitizedCustomization,
  TemplateType,
} from "@/types/customization";
import type { ResumeJSON } from "@/types/resume";

import { fixture } from "./parityFixture";

const BULLET_COUNT = 40;
const tag = (i: number) => `Splitmark${String(i).padStart(2, "0")}`;

const resume: ResumeJSON = {
  ...fixture,
  summary: "",
  projects: [],
  education: [],
  certifications: [],
  publications: [],
  volunteer: [],
  awards: [],
  languages: [],
  experience: [
    {
      company: "Splitco",
      role: "Principal Splitter",
      startDate: "2020-01",
      endDate: null,
      description: "Owned the splitting platform.",
      achievements: Array.from(
        { length: BULLET_COUNT },
        (_, i) =>
          `${tag(i + 1)} delivered a cross-team initiative with measurable impact on reliability, cost and developer experience across three product lines and several quarters.`
      ),
    },
  ],
} as ResumeJSON;

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

async function renderPdfPages(id: TemplateType): Promise<string[]> {
  const customization = {
    ...DEFAULT_CUSTOMIZATION,
    template: id,
    fontFamily: "Helvetica",
  } as SanitizedCustomization;
  const el = React.createElement(PDFTemplateEngine, {
    resume,
    styles: resolvePDFCustomization(customization),
    config: TEMPLATE_CONFIG[id]!,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await pdf(el as any).toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of buffer as unknown as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  const doc = await getDocument({
    data: new Uint8Array(Buffer.concat(chunks)),
  }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    pages.push(
      norm(
        content.items.map((item) => ("str" in item ? item.str : "")).join(" ")
      )
    );
  }
  await doc.destroy();
  return pages;
}

describe("PDF entries split between bullets", () => {
  it.each(["modern-minimal", "elegant-timeline"] as TemplateType[])(
    "%s",
    { timeout: 180_000 },
    async (id) => {
      expect(TEMPLATE_CONFIG[id], `${id} registered`).toBeDefined();
      const pages = await renderPdfPages(id);
      expect(pages.length).toBeGreaterThanOrEqual(2);

      const first = pages[0];
      // Not necessarily the final page: trailing sections may follow the job.
      const later = pages.slice(1).join(" ");
      expect(first).toContain(norm("Principal Splitter"));
      expect(first).toContain(norm(tag(1)));
      // The entry really split: page 1 holds bullets beyond the first.
      expect(first).toContain(norm(tag(2)));
      expect(first).not.toContain(norm(tag(BULLET_COUNT)));
      expect(later).toContain(norm(tag(BULLET_COUNT)));
    }
  );
});
