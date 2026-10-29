/**
 * DOM <-> PDF parity. The DOM engine (TemplateEngine) and the PDF engine
 * (PDFTemplateEngine) mirror each other by hand, so an axis/branch added to
 * one and forgotten in the other leaves every other test green. This renders
 * the same rich fixture through both for every template and compares the
 * extracted text: section order, experience order, key values, and leaked
 * rich-text markup.
 */
import { pdf } from "@react-pdf/renderer";
import { render } from "@testing-library/react";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import React from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { buildSections } from "@/components/job-v2/engine/buildSections";
import { TemplateEngine } from "@/components/job-v2/engine/TemplateEngine";
import {
  resolveTemplateConfig,
  TEMPLATE_CONFIG,
} from "@/components/job-v2/engine/templates";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { DateFormat, formatMonthYear } from "@/lib/date";
import { PDFTemplateEngine } from "@/lib/pdf/PDFTemplateEngine";
import { resolvePDFCustomization } from "@/lib/pdf/resolveStyles";
import {
  DEFAULT_CUSTOMIZATION,
  SanitizedCustomization,
  TemplateType,
} from "@/types/customization";

import { fixture } from "./parityFixture";

// jsdom has no ResizeObserver; useBlockPaginator only needs the methods to
// exist. See templateDistinctness.test.tsx.
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only global polyfill
  (global as any).ResizeObserver = StubResizeObserver;
});

const TEMPLATE_IDS = Object.keys(TEMPLATE_CONFIG) as TemplateType[];

// Sections the fixture leaves empty: they are in buildSections() but render
// nothing in either engine ("header" is the page header, not a titled section).
const NOT_RENDERED_AS_SECTION = new Set(["header", "hobbies"]);

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const lower = (s: string) => norm(s).toLowerCase();

async function renderPdfPages(
  customization: SanitizedCustomization,
  id: TemplateType
): Promise<string[]> {
  const styles = resolvePDFCustomization(customization);
  const el = React.createElement(PDFTemplateEngine, {
    resume: fixture,
    styles,
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

function renderDomText(
  customization: SanitizedCustomization,
  id: TemplateType
): string {
  const { container, unmount } = render(
    <ToastProvider>
      <TemplateEngine
        resume={fixture}
        customization={customization}
        config={TEMPLATE_CONFIG[id]!}
      />
    </ToastProvider>
  );
  const text = container.textContent ?? "";
  unmount();
  return norm(text);
}

// Letter-spaced headings come out of pdfjs as one item per glyph ("E D U C A T
// I O N"), so order scans ignore whitespace and case entirely.
const compact = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** Index of each needle found by scanning forward; -1 entries mean "not found in order". */
function scanForward(haystack: string, needles: string[], from = 0): number[] {
  const h = compact(haystack);
  const out: number[] = [];
  let cursor = from;
  for (const needle of needles) {
    const n = compact(needle);
    const idx = h.indexOf(n, cursor);
    out.push(idx);
    if (idx >= 0) cursor = idx + n.length;
  }
  return out;
}

/** Walk experience entries in order; returns role/company indexes or -1. */
function scanExperience(haystack: string, from: number) {
  const h = compact(haystack);
  let cursor = from;
  const found: { what: string; idx: number }[] = [];
  for (const exp of fixture.experience ?? []) {
    const role = compact(exp.role);
    const company = compact(exp.company);
    const roleIdx = h.indexOf(role, cursor);
    const compIdx = h.indexOf(company, cursor);
    found.push(
      { what: exp.role, idx: roleIdx },
      { what: exp.company, idx: compIdx }
    );
    if (roleIdx < 0 || compIdx < 0) break;
    cursor = Math.max(roleIdx + role.length, compIdx + company.length);
  }
  return found;
}

describe("DOM <-> PDF template parity", () => {
  it("covers all 13 templates", () => {
    expect(TEMPLATE_IDS).toHaveLength(13);
  });

  it.each(TEMPLATE_IDS)("%s", { timeout: 120_000 }, async (id) => {
    const customization = {
      ...DEFAULT_CUSTOMIZATION,
      template: id,
      fontFamily: "Helvetica",
    } as SanitizedCustomization;

    const pages = await renderPdfPages(customization, id);
    const pdfText = pages.join(" ");
    const domText = renderDomText(customization, id);

    // (a) PDF-only: no leaked rich-text markup / empty-value artefacts.
    for (const leak of ["<p>", "</p>", "<strong>", "<em>", "()"]) {
      expect(pdfText, `PDF leaks "${leak}"`).not.toContain(leak);
    }

    // (b) DOM-vs-PDF: section titles appear in the same order in both, and
    // that order equals buildSections() order for the fixture. Two-column
    // templates lay out column by column (the sidebar side decides which
    // column reads first), so the expected order is grouped by column.
    const config = resolveTemplateConfig(TEMPLATE_CONFIG[id]!);
    const visible = buildSections(fixture, config).filter(
      (s) => !NOT_RENDERED_AS_SECTION.has(s.id)
    );
    const columnOrder = config.sidebarSide === "right" ? [1, 0] : [0, 1];
    const titles = (
      config.columns === 2
        ? columnOrder.flatMap((c) => visible.filter((s) => s.column === c))
        : visible
    ).map((s) => s.title);
    const domTitleIdx = scanForward(domText, titles);
    expect(
      titles.filter((_, i) => domTitleIdx[i] < 0),
      "section titles missing/out of order in DOM"
    ).toEqual([]);
    // The PDF paginates, and text is read page by page, so a column's
    // overflow lands after the other column's first-page content: check
    // the order within each column rather than across them.
    const columnGroups =
      config.columns === 2
        ? columnOrder.map((c) =>
            visible.filter((s) => s.column === c).map((s) => s.title)
          )
        : [titles];
    const pdfTitleIdx = new Map<string, number>();
    for (const group of columnGroups) {
      const idxs = scanForward(pdfText, group);
      group.forEach((t, i) => pdfTitleIdx.set(t, idxs[i]));
      expect(
        group.filter((_, i) => idxs[i] < 0),
        "section titles missing/out of order in PDF"
      ).toEqual([]);
    }

    // (c) DOM-vs-PDF: experience job titles and companies, in order.
    const domExp = scanExperience(
      domText,
      domTitleIdx[titles.indexOf("Experience")]
    );
    const pdfExp = scanExperience(pdfText, pdfTitleIdx.get("Experience")!);
    expect(
      domExp.filter((f) => f.idx < 0).map((f) => f.what),
      "experience entries missing/out of order in DOM"
    ).toEqual([]);
    expect(
      pdfExp.filter((f) => f.idx < 0).map((f) => f.what),
      "experience entries missing/out of order in PDF"
    ).toEqual([]);
    expect(domExp.map((f) => f.what)).toEqual(pdfExp.map((f) => f.what));

    // (d) DOM-vs-PDF: values present in the DOM must be present in the PDF.
    const values = [
      ...(fixture.experience ?? []).map((e) =>
        formatMonthYear(
          e.startDate,
          DEFAULT_CUSTOMIZATION.dateFormat as DateFormat
        )
      ),
      ...(fixture.skills ?? []).map((s) => s.name),
      ...(fixture.languages ?? []).map((l) => l.name),
      ...(fixture.certifications ?? []).map((c) => c.name),
    ];
    const domLower = lower(domText);
    const pdfLower = lower(pdfText);
    const missing = values.filter(
      (v) => domLower.includes(lower(v)) && !pdfLower.includes(lower(v))
    );
    expect(missing, "values in DOM but not in PDF").toEqual([]);

    // (e) PDF-only: bounded page count; page 1 has the name and first title.
    expect(pages.length).toBeLessThanOrEqual(3);
    const first = compact(pages[0]);
    expect(first, "candidate name on page 1").toContain(
      compact(fixture.header.name)
    );
    expect(first, "first section title on page 1").toContain(
      compact(titles[0])
    );
  });
});
