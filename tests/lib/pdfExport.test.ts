import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TemplateConfig } from "@/components/job-v2/engine/types";
import type {
  TemplateType,
  SanitizedCustomization,
} from "@/types/customization";
import type { ResumeJSON } from "@/types/resume";

const toBlob = vi.fn();
const pdf = vi.fn((_el?: unknown) => ({ toBlob }));

vi.mock("@react-pdf/renderer", () => ({ pdf }));

vi.mock("@/lib/pdf/resolveStyles", () => ({
  resolvePDFCustomization: vi.fn(() => ({ fontFamily: "Inter" })),
}));

const mockTemplateConfig: Partial<Record<TemplateType, TemplateConfig>> = {
  "modern-minimal": { columns: 1, heading: "underline" },
};
vi.mock("@/components/job-v2/engine/templates", () => ({
  TEMPLATE_CONFIG: mockTemplateConfig,
}));

function markerComponent(name: string) {
  const Component = () => null;
  Component.displayName = name;
  return Component;
}

vi.mock("@/lib/pdf/PDFTemplateEngine", () => ({
  PDFTemplateEngine: markerComponent("PDFTemplateEngine"),
}));
vi.mock("@/lib/pdf/templates/ModernMinimalPDF", () => ({
  ModernMinimalPDF: markerComponent("ModernMinimalPDF"),
}));
vi.mock("@/lib/pdf/templates/ModernMinimalCoverLetterPDF", () => ({
  ModernMinimalCoverLetterPDF: markerComponent("ModernMinimalCoverLetterPDF"),
}));
vi.mock("@/lib/pdf/templates/TechSidebarCoverLetterPDF", () => ({
  TechSidebarCoverLetterPDF: markerComponent("TechSidebarCoverLetterPDF"),
}));
vi.mock("@/lib/pdf/templates/AcademicSerifCoverLetterPDF", () => ({
  AcademicSerifCoverLetterPDF: markerComponent("AcademicSerifCoverLetterPDF"),
}));
vi.mock("@/lib/pdf/templates/BJetProfessionalCoverLetterPDF", () => ({
  BJetProfessionalCoverLetterPDF: markerComponent(
    "BJetProfessionalCoverLetterPDF"
  ),
}));
vi.mock("@/lib/pdf/templates/BusinessProfessionalCoverLetterPDF", () => ({
  BusinessProfessionalCoverLetterPDF: markerComponent(
    "BusinessProfessionalCoverLetterPDF"
  ),
}));
vi.mock("@/lib/pdf/templates/CompactModernCoverLetterPDF", () => ({
  CompactModernCoverLetterPDF: markerComponent("CompactModernCoverLetterPDF"),
}));
vi.mock("@/lib/pdf/templates/CreativeModernCoverLetterPDF", () => ({
  CreativeModernCoverLetterPDF: markerComponent("CreativeModernCoverLetterPDF"),
}));
vi.mock("@/lib/pdf/templates/ElegantTimelineCoverLetterPDF", () => ({
  ElegantTimelineCoverLetterPDF: markerComponent(
    "ElegantTimelineCoverLetterPDF"
  ),
}));
vi.mock("@/lib/pdf/templates/TwoToneCoverLetterPDF", () => ({
  TwoToneCoverLetterPDF: markerComponent("TwoToneCoverLetterPDF"),
}));

const { generateCoverLetterPDF, generateResumePDF } =
  await import("@/lib/pdfExport");
const { PDFTemplateEngine } = await import("@/lib/pdf/PDFTemplateEngine");
const { ModernMinimalPDF } =
  await import("@/lib/pdf/templates/ModernMinimalPDF");
const { ModernMinimalCoverLetterPDF } =
  await import("@/lib/pdf/templates/ModernMinimalCoverLetterPDF");
const { TechSidebarCoverLetterPDF } =
  await import("@/lib/pdf/templates/TechSidebarCoverLetterPDF");

const resume = {} as ResumeJSON;
const blob = new Blob(["fake"]);

function customization(template: string) {
  return { template } as unknown as SanitizedCustomization;
}

beforeEach(() => {
  vi.clearAllMocks();
  toBlob.mockResolvedValue(blob);
  pdf.mockImplementation(() => ({ toBlob }));
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

describe("generateResumePDF", () => {
  it("renders via PDFTemplateEngine for a template with a config and triggers a download", async () => {
    await generateResumePDF(resume, customization("modern-minimal"), "r.pdf");

    const el = pdf.mock.calls[0][0] as {
      type: unknown;
      props: { styles: { fontFamily: string } };
    };
    expect(el.type).toBe(PDFTemplateEngine);
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  it("falls back to ModernMinimalPDF for a template missing from TEMPLATE_CONFIG", async () => {
    await generateResumePDF(resume, customization("not-a-template"), "r.pdf");

    const el = pdf.mock.calls[0][0] as {
      type: unknown;
      props: { styles: { fontFamily: string } };
    };
    expect(el.type).toBe(ModernMinimalPDF);
  });

  it("retries with Helvetica when the first render throws a RangeError", async () => {
    toBlob
      .mockRejectedValueOnce(new RangeError("bad font subset"))
      .mockResolvedValueOnce(blob);

    await generateResumePDF(resume, customization("modern-minimal"), "r.pdf");

    expect(toBlob).toHaveBeenCalledTimes(2);
    const secondEl = pdf.mock.calls[1][0] as {
      type: unknown;
      props: { styles: { fontFamily: string } };
    };
    expect(secondEl.props.styles.fontFamily).toBe("Helvetica");
  });

  it("propagates a non-RangeError without retrying", async () => {
    toBlob.mockRejectedValueOnce(new Error("network down"));

    await expect(
      generateResumePDF(resume, customization("modern-minimal"), "r.pdf")
    ).rejects.toThrow("network down");
    expect(toBlob).toHaveBeenCalledTimes(1);
  });
});

describe("generateCoverLetterPDF", () => {
  it("uses the template-specific cover letter component", async () => {
    await generateCoverLetterPDF(
      "cover letter text",
      resume,
      customization("tech-sidebar"),
      "c.pdf"
    );

    const el = pdf.mock.calls[0][0] as {
      type: unknown;
      props: { styles: { fontFamily: string } };
    };
    expect(el.type).toBe(TechSidebarCoverLetterPDF);
  });

  it("falls back to ModernMinimalCoverLetterPDF for an unmapped template", async () => {
    await generateCoverLetterPDF(
      "cover letter text",
      resume,
      customization("not-a-template"),
      "c.pdf"
    );

    const el = pdf.mock.calls[0][0] as {
      type: unknown;
      props: { styles: { fontFamily: string } };
    };
    expect(el.type).toBe(ModernMinimalCoverLetterPDF);
  });

  it("retries with Helvetica when the first render throws a RangeError", async () => {
    toBlob
      .mockRejectedValueOnce(new RangeError("bad font subset"))
      .mockResolvedValueOnce(blob);

    await generateCoverLetterPDF(
      "cover letter text",
      resume,
      customization("tech-sidebar"),
      "c.pdf"
    );

    expect(toBlob).toHaveBeenCalledTimes(2);
    const secondEl = pdf.mock.calls[1][0] as {
      type: unknown;
      props: { styles: { fontFamily: string } };
    };
    expect(secondEl.props.styles.fontFamily).toBe("Helvetica");
  });

  it("propagates a non-RangeError without retrying", async () => {
    toBlob.mockRejectedValueOnce(new Error("network down"));

    await expect(
      generateCoverLetterPDF(
        "cover letter text",
        resume,
        customization("tech-sidebar"),
        "c.pdf"
      )
    ).rejects.toThrow("network down");
    expect(toBlob).toHaveBeenCalledTimes(1);
  });
});
