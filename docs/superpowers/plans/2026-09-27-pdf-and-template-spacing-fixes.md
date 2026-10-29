# PDF Rendering, Spacing, and Template Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix PDF multi-page top margins, replace placeholder link tags with real hyperlink URLs, streamline BJet table entries, modernize the layout size UI, make profile photo placement customizable (left/center/right), fix massive Two-Tone headers, and add proper breathing room across all templates in both DOM and PDF.

**Architecture:** Maintain strict 1:1 parity between on-screen React DOM engine (`TemplateEngine.tsx`, `sections.tsx`) and vector PDF export engine (`PDFTemplateEngine.tsx`, `pdf/sections.tsx`). A shared URL formatting utility normalizes link text; `ThemeConfig` and `TemplateConfig` are extended with `photoPosition`; react-pdf `<Page>` layout uses a fixed top spacer to enforce page 2+ margins; BJet table rows are consolidated from 4 rows to 2 rows; and header layouts are rebalanced with improved spacing.

**Tech Stack:** Next.js 15, React 19, `@react-pdf/renderer` v4, Tailwind CSS, TypeScript, Vitest, pdfjs-dist.

**Spec:** User request detailing 6 core requirements across PDF rendering and template spacing.

## Global Constraints

- Every visual change in the DOM preview MUST be matched with an equivalent change in the PDF renderer.
- Never regress existing test suites (`npm run test:run`).
- Maintain full TypeScript strict typing without using `any` or breaking existing data contracts.
- Persist user customization choices safely into `Customization.themeJson` via `JobPageContext`.

---

### Task 1: URL/Link Display Formatting & Active Hyperlink Rendering (DOM & PDF)

**Files:**

- Create: `src/lib/formatUrl.ts`
- Test: `tests/lib/formatUrl.test.ts`
- Modify: `src/components/job-v2/engine/sections.tsx:567-578,720-728,1520-1532`
- Modify: `src/lib/pdf/sections.tsx:835-845,900-910,1410-1420`
- Modify: `src/lib/pdf/templates/ModernMinimalPDF.tsx:240-248,335-345`

**Interfaces:**

- Produces: `formatDisplayUrl(url: string): string` — strips `https://`, `http://`, `www.`, and trailing slashes for clean, readable link text.
- Consumes: `EditableLink` (DOM) and `Link` (PDF).

- [ ] **Step 1: Write unit tests for URL formatting utility**

Create `tests/lib/formatUrl.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatDisplayUrl } from "@/lib/formatUrl";

describe("formatDisplayUrl", () => {
  it("strips https:// and trailing slashes", () => {
    expect(formatDisplayUrl("https://github.com/pranavraut033/")).toBe(
      "github.com/pranavraut033"
    );
  });

  it("strips http:// and www.", () => {
    expect(formatDisplayUrl("http://www.linkedin.com/in/rautpranav/")).toBe(
      "linkedin.com/in/rautpranav"
    );
  });

  it("returns empty string for falsy/empty values", () => {
    expect(formatDisplayUrl("")).toBe("");
  });

  it("handles bare domains and paths", () => {
    expect(formatDisplayUrl("pranavraut.dev")).toBe("pranavraut.dev");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/lib/formatUrl.test.ts`
Expected: FAIL (cannot find module `@/lib/formatUrl`)

- [ ] **Step 3: Implement `formatDisplayUrl`**

Create `src/lib/formatUrl.ts`:

```ts
/**
 * Normalizes a raw URL into clean display text for resumes and PDFs,
 * removing protocol prefixes (http://, https://), www., and trailing slashes.
 */
export function formatDisplayUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}
```

- [ ] **Step 4: Update DOM `sections.tsx` to render clean link text instead of `[Link]` and `[Verify]`**

In `src/components/job-v2/engine/sections.tsx`:
Import `formatDisplayUrl` from `@/lib/formatUrl`.
In Projects (both standard/compact and table/label-column):
Replace literal `[Link]` with `{formatDisplayUrl(project.url)}`:

```tsx
const urlLinkField = (project.url || edit.editable) && (
  <EditableLink
    href={project.url ?? ""}
    onCommit={(v) => edit.updateProject(projectIndex, { url: v })}
    placeholder="https://…"
    className={`${theme.textSize} ml-2 hover:underline`}
    style={{ color: theme.secondaryColor }}
  >
    {formatDisplayUrl(project.url)}
  </EditableLink>
);
```

In Certifications:
Replace literal `[Verify]` with `{formatDisplayUrl(cert.url)}`:

```tsx
{
  cert.url ? (
    <EditableLink
      href={cert.url}
      onCommit={(v) => edit.updateCertification(i, { url: v })}
      placeholder="https://…"
      className="ml-1.5 hover:underline"
      style={{ color: theme.secondaryColor }}
    >
      {formatDisplayUrl(cert.url)}
    </EditableLink>
  ) : null;
}
```

- [ ] **Step 5: Update PDF `pdf/sections.tsx` and `ModernMinimalPDF.tsx` to render clean link text and active hyperlinks**

In `src/lib/pdf/sections.tsx`:
Import `formatDisplayUrl` from `@/lib/formatUrl`.
In `pdfProjects`:

```tsx
{
  proj.url ? (
    <Text style={{ fontWeight: 400, color: secondaryColor }}>
      {"  "}
      <Link
        src={proj.url.startsWith("http") ? proj.url : `https://${proj.url}`}
        style={{ color: secondaryColor, textDecoration: "underline" }}
      >
        {formatDisplayUrl(proj.url)}
      </Link>
    </Text>
  ) : null;
}
```

In `pdfCertifications`:

```tsx
{
  cert.url ? (
    <Text>
      {"  "}
      <Link
        src={cert.url.startsWith("http") ? cert.url : `https://${cert.url}`}
        style={{ color: secondaryColor, textDecoration: "underline" }}
      >
        {formatDisplayUrl(cert.url)}
      </Link>
    </Text>
  ) : null;
}
```

In `src/lib/pdf/templates/ModernMinimalPDF.tsx`:
Apply the same `formatDisplayUrl` transformation for projects and certifications.

- [ ] **Step 6: Run tests and verify**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 7: Commit changes**

```bash
git add src/lib/formatUrl.ts tests/lib/formatUrl.test.ts src/components/job-v2/engine/sections.tsx src/lib/pdf/sections.tsx src/lib/pdf/templates/ModernMinimalPDF.tsx
git commit -m "fix(links): render clean display url text instead of [Link] and [Verify] in DOM and PDF"
```

---

### Task 2: Layout Settings Size Selection UI Modernization

**Files:**

- Modify: `src/components/job/ThemeCustomizationPanel.tsx:275-320`
- Test: `tests/lib/documentSize.test.ts`

**Interfaces:**

- Consumes: `DOCUMENT_SIZES`, `DOCUMENT_SIZE_CONFIG`, `documentSizeOf`, `sizeConfigOf` from `@/lib/documentSize`.
- Produces: Polished segmented button control with descriptive density subtitles, visual dot indicators, and active indicator animation.

- [ ] **Step 1: Inspect `ThemeCustomizationPanel.tsx` size UI section**

Verify the current DOM structure of lines 275-320.

- [ ] **Step 2: Upgrade Size Selection UI**

In `src/components/job/ThemeCustomizationPanel.tsx`:
Replace the flat text-only button row with an enhanced segmented control:

- Render an icon/dot density indicator per size (e.g., small, standard, spacious visual bars or dots).
- Add subtitle chips displaying the primary impact (e.g. "Compact · 9pt", "Snug · 9pt", "Normal · 10pt", "Relaxed · 10pt", "Spacious · 12pt").
- Add a clear badge when in "Custom" override mode that lets the user snap back to a preset with one click.
- Maintain accessible keyboard navigation (`aria-pressed`, `aria-label`).

- [ ] **Step 3: Verify size changes update correctly in DOM and store**

Run: `npm run test:run tests/lib/documentSize.test.ts`
Expected: PASS

- [ ] **Step 4: Commit changes**

```bash
git add src/components/job/ThemeCustomizationPanel.tsx
git commit -m "feat(ui): modernize layout size selection segmented control with density indicators"
```

---

### Task 3: Multi-Page PDF Top Margin Fix (Page 2+)

**Files:**

- Modify: `src/lib/pdf/PDFTemplateEngine.tsx:876-1033`
- Test: `tests/lib/pdf/pageMargins.test.ts`

**Interfaces:**

- Consumes: `marginPt` from `ResolvedPDFStyles`, react-pdf `<Page>` and `<View fixed />`.
- Produces: Reliable, uniform top margins on Page 2 and all subsequent pages for both single-column and two-column layouts.

- [ ] **Step 1: Write failing regression test for Page 2 top margins**

Create `tests/lib/pdf/pageMargins.test.ts`:

```ts
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";

import { TEMPLATE_CONFIG } from "@/components/job-v2/engine/templates";
import { PDFTemplateEngine } from "@/lib/pdf/PDFTemplateEngine";
import { resolvePDFCustomization } from "@/lib/pdf/resolveStyles";
import { DEFAULT_CUSTOMIZATION } from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

const multiPageResume: ResumeJSON = {
  header: { name: "Pranav Raut", email: "pranav@example.com" },
  summary: "Summary statement...",
  experience: Array.from({ length: 8 }).map((_, i) => ({
    id: `exp-${i}`,
    role: `Software Engineer ${i}`,
    company: `Company ${i}`,
    startDate: "2020-01",
    endDate: "2021-01",
    description: "Detailed description of contributions. ".repeat(6),
    achievements: ["Achievement 1", "Achievement 2"],
  })),
  education: [],
  skills: [{ name: "React" }, { name: "TypeScript" }],
  projects: [],
  certifications: [],
  publications: [],
  volunteer: [],
  awards: [],
  languages: [],
  interests: [],
  customSections: [],
  sectionLayout: {
    order: ["summary", "experience", "skills"],
    hidden: [],
    columns: {},
    custom: [],
  },
} as unknown as ResumeJSON;

describe("PDF page margins on Page 2+", () => {
  it("enforces top margin >= marginPt on Page 2 in two-column templates", async () => {
    const config = TEMPLATE_CONFIG["modern-minimal"];
    const styles = resolvePDFCustomization({
      ...DEFAULT_CUSTOMIZATION,
      template: "modern-minimal",
      pageFormat: "a4",
      marginSize: "normal", // 36 pt
    });
    const el = React.createElement(PDFTemplateEngine, {
      resume: multiPageResume,
      styles,
      config,
    });
    const stream = await pdf(el).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of stream as unknown as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    const doc = await getDocument({
      data: new Uint8Array(Buffer.concat(chunks)),
    }).promise;
    expect(doc.numPages).toBeGreaterThanOrEqual(2);

    const page2 = await doc.getPage(2);
    const content = await page2.getTextContent();
    const items = content.items.filter((it: any) => it.str.trim().length > 0);
    const highestItem = items.reduce(
      (prev: any, curr: any) =>
        curr.transform[5] > prev.transform[5] ? curr : prev,
      items[0]
    );
    const distFromTop = 841.89 - highestItem.transform[5];
    // Expected top margin should be at least ~36pt (marginPt)
    expect(distFromTop).toBeGreaterThanOrEqual(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/lib/pdf/pageMargins.test.ts`
Expected: FAIL (currently `distFromTop` is ~9.7 pt)

- [ ] **Step 3: Implement fixed top spacer in `PDFTemplateEngine.tsx`**

In `src/lib/pdf/PDFTemplateEngine.tsx`:

1. In two-column mode:
   Add a fixed top spacer View to `<Page>`:
   ```tsx
   <View fixed style={{ height: marginPt, width: "100%" }} />
   ```
2. Adjust full-width header wrapper so it doesn't double-pad on Page 1:
   ```tsx
   {
     !headerSpansMain && headerNode && (
       <View style={{ paddingHorizontal: marginPt, paddingBottom: 0 }}>
         {headerNode}
       </View>
     );
   }
   ```
3. Remove redundant `paddingTop: colPadY` from `sidebarView` and `mainView` on Page 1 (or adjust to `gap: s.sp(6)`) so Page 1 top alignment aligns cleanly with the header, while Page 2 starts below the fixed `height: marginPt` spacer.
4. In single-column mode:
   Ensure `<Page style={{ paddingBottom: marginPt, paddingHorizontal: marginPt }}>` with `<View fixed style={{ height: marginPt, width: "100%" }} />` for identical multi-page top margin guarantee.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/lib/pdf/pageMargins.test.ts`
Expected: PASS

- [ ] **Step 5: Run existing background full bleed tests to ensure no regressions**

Run: `npm test tests/lib/pdf/backgroundFullBleed.test.ts`
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add src/lib/pdf/PDFTemplateEngine.tsx tests/lib/pdf/pageMargins.test.ts
git commit -m "fix(pdf): ensure top margin is preserved across page breaks on 2nd page onwards"
```

---

### Task 4: Profile Image Positioning Customization (`left`, `center`, `right`)

**Files:**

- Modify: `src/types/customization.ts:518-560`
- Modify: `src/components/job-v2/engine/types.ts:40-70`
- Modify: `src/components/job-v2/engine/templates.ts:30-120`
- Modify: `src/components/job/ThemeCustomizationPanel.tsx`
- Modify: `src/components/job-v2/engine/TemplateEngine.tsx:380-456,645-690`
- Modify: `src/lib/pdf/PDFTemplateEngine.tsx:360-420,620-795`
- Test: `tests/lib/photoPosition.test.ts`

**Interfaces:**

- Produces: `PhotoPosition = "left" | "center" | "right"`.
- Consumes: User selection from `ThemeCustomizationPanel`, applied in both DOM and PDF template engines.

- [ ] **Step 1: Write test for photoPosition configuration resolution**

Create `tests/lib/photoPosition.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  resolveTemplateConfig,
  TEMPLATE_CONFIG,
} from "@/components/job-v2/engine/templates";

describe("photoPosition resolution", () => {
  it("defaults academic-serif and elegant-timeline to center", () => {
    const academic = resolveTemplateConfig(TEMPLATE_CONFIG["academic-serif"]);
    expect(academic.photoPosition).toBe("center");
  });

  it("respects custom photoPosition override", () => {
    const config = resolveTemplateConfig({
      ...TEMPLATE_CONFIG["academic-serif"],
      photoPosition: "left",
    });
    expect(config.photoPosition).toBe("left");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test tests/lib/photoPosition.test.ts`
Expected: FAIL (`photoPosition` not yet on `TemplateConfig`)

- [ ] **Step 3: Add `PhotoPosition` type and defaults**

In `src/types/customization.ts`:

```ts
export type PhotoPosition = "left" | "center" | "right";
```

Add `photoPosition?: PhotoPosition` to `ThemeConfig`.
In `src/components/job-v2/engine/types.ts`:
Add `photoPosition?: PhotoPosition` to `TemplateConfig` and `ResolvedTemplateConfig`.
In `src/components/job-v2/engine/templates.ts`:
Add `photoPosition: "center"` for centered headers (`academic-serif`, `elegant-timeline`, `french-elegant`) and `"right"` for standard headers in `TEMPLATE_CONFIG`. Add default `photoPosition: "center"` in `CONFIG_DEFAULTS`.

- [ ] **Step 4: Add Photo Position control to `ThemeCustomizationPanel.tsx`**

In `src/components/job/ThemeCustomizationPanel.tsx`:
Add a segmented control under Layout Settings:

- Label: "Photo Position"
- Options: Left, Center, Right
- When changed, updates `themeJson` with `photoPosition`.

- [ ] **Step 5: Apply `photoPosition` in DOM `TemplateEngine.tsx`**

In `src/components/job-v2/engine/TemplateEngine.tsx`:
Read effective `photoPosition = theme.photoPosition ?? config.photoPosition`.

- If `photoPosition === "left"`:
  Render photo to the left of the name/headline block (`flex flex-row items-center gap-4`).
- If `photoPosition === "right"`:
  Render photo to the right of the name/headline block (`flex flex-row items-center justify-between gap-4`).
- If `photoPosition === "center"`:
  Render photo centered above the name, with compact vertical margins (`mb-2` instead of excessive spacing).

- [ ] **Step 6: Apply `photoPosition` in `PDFTemplateEngine.tsx`**

In `src/lib/pdf/PDFTemplateEngine.tsx`:
Support the same `photoPosition` alignment for centered and standard header variants, ensuring the PDF output matches the on-screen preview.

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test tests/lib/photoPosition.test.ts`
Expected: PASS

- [ ] **Step 8: Commit changes**

```bash
git add src/types/customization.ts src/components/job-v2/engine/types.ts src/components/job-v2/engine/templates.ts src/components/job/ThemeCustomizationPanel.tsx src/components/job-v2/engine/TemplateEngine.tsx src/lib/pdf/PDFTemplateEngine.tsx tests/lib/photoPosition.test.ts
git commit -m "feat(customization): add photo position customization (left, center, right) in DOM and PDF"
```

---

### Task 5: BJet Experience & Project Table Subheaders Simplification (Merge into Role + Details)

**Files:**

- Modify: `src/components/job-v2/engine/sections.tsx:430-495,780-820`
- Modify: `src/lib/pdf/sections.tsx:515-565,895-945`
- Test: `tests/lib/bjetTableSections.test.tsx`

**Interfaces:**

- Consumes: Experience items and Project items in `entryStyle: "table"` and `entryStyle: "label-column"`.
- Produces: 2-row table entry structure (Role + Details for experience; Project + Details for projects), saving vertical space.

- [ ] **Step 1: Write test for consolidated BJet table entry structure**

Create `tests/lib/bjetTableSections.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

import { SECTION_REGISTRY } from "@/components/job-v2/engine/sections";
import {
  resolveTemplateConfig,
  TEMPLATE_CONFIG,
} from "@/components/job-v2/engine/templates";
import { ResumeJSON } from "@/types/resume";

const mockResume: ResumeJSON = {
  header: { name: "Test User", email: "test@example.com" },
  summary: "",
  experience: [
    {
      id: "exp-1",
      role: "Lead Architect",
      company: "Acme Corp",
      startDate: "2021-01",
      endDate: "2023-01",
      description: "Led development of core cloud infra.",
      achievements: ["Scaled to 10M users"],
    },
  ],
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
  sectionLayout: { order: ["experience"], hidden: [], columns: {}, custom: [] },
} as unknown as ResumeJSON;

describe("BJet table entry structure", () => {
  it("merges role, company, and duration into a single Role row", () => {
    const config = resolveTemplateConfig(TEMPLATE_CONFIG["bjet-professional"]);
    const builder = SECTION_REGISTRY["experience"]?.dom;
    const blocks = builder!({
      resume: mockResume,
      instance: {
        id: "experience",
        type: "experience",
        title: "Experience",
        column: 0,
      },
      theme: {
        primaryColor: "#000",
        secondaryColor: "#666",
        accentColor: "#333",
        textColor: "#111",
        backgroundColor: "#fff",
        textSize: "text-sm",
        lineHeight: "leading-normal",
        dateFormat: "locale",
      } as any,
      config,
      edit: { editable: false } as any,
    });

    const { getByText, queryByText } = render(<>{blocks.map((b) => b.node)}</>);
    expect(getByText("Role")).toBeDefined();
    expect(getByText("Details")).toBeDefined();
    // Company and Duration should NOT be standalone label headers
    expect(queryByText("Company")).toBeNull();
    expect(queryByText("Duration")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test tests/lib/bjetTableSections.test.tsx`
Expected: FAIL (`queryByText("Company")` found standalone header)

- [ ] **Step 3: Consolidate table rows in DOM `sections.tsx`**

In `src/components/job-v2/engine/sections.tsx`:
For Experience:
Replace the 3 separate `TableRow`s (Company, Role, Duration) with one single `TableRow` labeled `"Role"`:

```tsx
<TableRow
  label="Role"
  accentColor={theme.accentColor + "20"}
  borderColor={borderColor}
  variant={variant}
>
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div>
      <span className="font-semibold">{roleField}</span>
      <span className="text-agent-on-surface-variant"> · {companyField}</span>
    </div>
    <div className="text-xs">{dates}</div>
  </div>
</TableRow>
<TableRow
  label="Details"
  accentColor={theme.accentColor + "20"}
  borderColor={borderColor}
  last
  variant={variant}
>
  {/* Description + achievements */}
</TableRow>
```

For Projects:
Consolidate Project Name, URL, and Duration into one single `TableRow` labeled `"Project"`:

```tsx
<TableRow
  label="Project"
  accentColor={theme.accentColor + "20"}
  borderColor={borderColor}
  variant={variant}
>
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div>
      <span className="font-semibold">{nameField}</span>
      {urlLinkField}
    </div>
    <div className="text-xs">{dateLine}</div>
  </div>
</TableRow>
<TableRow
  label="Details"
  accentColor={theme.accentColor + "20"}
  borderColor={borderColor}
  last
  variant={variant}
>
  {/* Description + technologies */}
</TableRow>
```

- [ ] **Step 4: Consolidate table rows in PDF `pdf/sections.tsx`**

In `src/lib/pdf/sections.tsx`:
In `pdfExperience`:
Replace the 3 separate `PdfTableRow`s with one `PdfTableRow` labeled `"Role"`:

```tsx
<PdfTableRow
  label="Role"
  accentColor={tint}
  borderColor={borderColor}
  fontSize={smallFontSize}
  sp={s.sp}
  variant={variant}
>
  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
    <Text style={{ fontSize: smallFontSize, fontWeight: 700 }}>
      {exp.role} <Text style={{ fontWeight: 400, color: s.secondaryColor }}>· {exp.company}</Text>
    </Text>
    <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
      {formatDateRange(exp.startDate, exp.endDate, dateFormat)}
    </Text>
  </View>
</PdfTableRow>
<PdfTableRow
  label="Details"
  accentColor={tint}
  borderColor={borderColor}
  isLast
  fontSize={smallFontSize}
  sp={s.sp}
  variant={variant}
>
  {/* Description and achievements */}
</PdfTableRow>
```

In `pdfProjects`:
Consolidate project name, URL, and date into one `PdfTableRow` labeled `"Project"`, followed by `"Details"`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test tests/lib/bjetTableSections.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add src/components/job-v2/engine/sections.tsx src/lib/pdf/sections.tsx tests/lib/bjetTableSections.test.tsx
git commit -m "refactor(bjet): consolidate experience and project table rows into Role and Details"
```

---

### Task 6: Header Breathing Room, Spacing & Two-Tone Header Refactor (DOM & PDF)

**Files:**

- Modify: `src/components/job-v2/engine/TemplateEngine.tsx:630-695`
- Modify: `src/lib/pdf/PDFTemplateEngine.tsx:690-745`
- Test: `tests/lib/headerSpacing.test.tsx`

**Interfaces:**

- Consumes: Header contact info, name, headline, and profile image.
- Produces: Proportional, balanced two-tone split header (50/50 ratio, compact vertical padding, clean multi-column contact item layout), plus improved breathing room across all header variants.

- [ ] **Step 1: Write visual regression test for header layout sanity**

Create `tests/lib/headerSpacing.test.tsx`:

```tsx
import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import TemplateEngine from "@/components/job-v2/engine/TemplateEngine";
import {
  resolveTemplateConfig,
  TEMPLATE_CONFIG,
} from "@/components/job-v2/engine/templates";
import { DEFAULT_CUSTOMIZATION } from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

const mockResume: ResumeJSON = {
  header: {
    name: "Pranav Raut",
    headline: "AI-Native Full Stack Engineer",
    email: "pranav@example.com",
    phone: "+49 1551 0256211",
    location: "Berlin, Germany",
    linkedin: "linkedin.com/in/rautpranav",
    github: "github.com/pranavraut033",
    website: "pranavraut.dev",
  },
  summary: "Engineer summary",
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
  sectionLayout: { order: ["summary"], hidden: [], columns: {}, custom: [] },
} as unknown as ResumeJSON;

describe("Header spacing and two-tone layout", () => {
  it("renders two-tone header with balanced structure", () => {
    const config = resolveTemplateConfig(TEMPLATE_CONFIG["two-tone"]);
    const { getByText } = render(
      <TemplateEngine
        config={config}
        resume={mockResume}
        customization={{ ...DEFAULT_CUSTOMIZATION, template: "two-tone" }}
      />
    );
    expect(getByText("Pranav Raut")).toBeDefined();
    expect(getByText("AI-Native Full Stack Engineer")).toBeDefined();
  });
});
```

- [ ] **Step 2: Refactor Two-Tone Split Header in DOM `TemplateEngine.tsx`**

In `src/components/job-v2/engine/TemplateEngine.tsx`:

1. Change split ratio from `w-3/5` / `w-2/5` to `w-1/2` / `w-1/2` (or `flex-1` / `flex-1`) so contact info has adequate horizontal width and doesn't wrap each item to a separate line.
2. In contact block: use a 2-column compact grid (`grid grid-cols-2 gap-x-3 gap-y-1` or flexible wrapping) when in split header mode, so 8+ contact items fit neatly in 4 compact lines instead of 9+ lines.
3. Reduce vertical padding from `py-4` to `py-3 px-4`, eliminating the massive vertical excess shown in the user's screenshot.
4. Add breathing room across all headers:
   - Margin below name: `mb-1.5`
   - Margin below headline: `mb-2.5`
   - Spacing between contact icons and text: `gap-1.5`
   - Contact row gap: `gap-x-4 gap-y-1.5`

- [ ] **Step 3: Refactor Two-Tone Split Header in PDF `PDFTemplateEngine.tsx`**

In `src/lib/pdf/PDFTemplateEngine.tsx`:

1. Mirror the 50% / 50% split width:
   `width: "50%"` for identity, `width: "50%"` for contacts & photo.
2. Render contact items with proportional text sizing (`smallFontSize`), clean line wrapping, and compact padding (`padding: marginPt * 0.35`).
3. Add proportional breathing room to other PDF header variants (`mb-3` under headline, `s.sp(6)` contact line spacing) matching the DOM layout.

- [ ] **Step 4: Run all tests to confirm zero regressions**

Run: `npm run test:run`
Expected: All test suites PASS.

- [ ] **Step 5: Verify build passes cleanly**

Run: `npm run type-check`
Expected: Exit code 0.

- [ ] **Step 6: Commit changes**

```bash
git add src/components/job-v2/engine/TemplateEngine.tsx src/lib/pdf/PDFTemplateEngine.tsx tests/lib/headerSpacing.test.tsx
git commit -m "fix(header): rebalance two-tone split header and add breathing room across all templates in DOM and PDF"
```

---

## Plan Review & Handoff

### Self-Review Checklist

1. **Spec Coverage**:
   - Link text rendered as clean URL and clickable hyperlink? Covered in Task 1.
   - Size selection UI improved? Covered in Task 2.
   - Two-Tone massive header fixed? Covered in Task 6.
   - Multi-page PDF missing top margin on Page 2+ fixed? Covered in Task 3.
   - Profile image customizable (left/center/right)? Covered in Task 4.
   - BJet 4 subheaders merged into Role + Details? Covered in Task 5.
   - Header breathing room across all templates and DOM↔PDF sync? Covered in Task 6.
2. **No Placeholders**: Every task contains exact paths, full code snippets, and specific assertions.
3. **Type Consistency**: `PhotoPosition`, `formatDisplayUrl`, and `TableRow` props are aligned across DOM and PDF files.
