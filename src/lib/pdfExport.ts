import React from "react";

import { SanitizedCustomization } from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

import {
  ResolvedPDFStyles,
  resolvePDFCustomization,
} from "./pdf/resolveStyles";
import { BJetProfessionalPDF } from "./pdf/templates/BJetProfessionalPDF";
import { BusinessProfessionalPDF } from "./pdf/templates/BusinessProfessionalPDF";
import { CreativeModernPDF } from "./pdf/templates/CreativeModernPDF";
import { ElegantTimelinePDF } from "./pdf/templates/ElegantTimelinePDF";
import { ModernMinimalPDF } from "./pdf/templates/ModernMinimalPDF";
import { TechSidebarPDF } from "./pdf/templates/TechSidebarPDF";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TEMPLATE_MAP: Record<string, React.ComponentType<any>> = {
  "modern-minimal": ModernMinimalPDF,
  "business-professional": BusinessProfessionalPDF,
  "tech-sidebar": TechSidebarPDF,
  "creative-modern": CreativeModernPDF,
  "elegant-timeline": ElegantTimelinePDF,
  "bjet-professional": BJetProfessionalPDF,
};

/**
 * Generates a template-specific vector PDF via @react-pdf/renderer and triggers
 * a browser download. Must be called from a client context (browser / Tauri).
 */
export async function generateResumePDF(
  resume: ResumeJSON,
  customization: SanitizedCustomization,
  filename: string
): Promise<void> {
  // Dynamic import keeps the heavy react-pdf bundle out of the server bundle
  const { pdf } = await import("@react-pdf/renderer");

  const styles = resolvePDFCustomization(customization);
  const TemplateComponent =
    TEMPLATE_MAP[customization.template] ?? ModernMinimalPDF;

  const renderBlob = (pdfStyles: ResolvedPDFStyles): Promise<Blob> => {
    const el = React.createElement(TemplateComponent, {
      resume,
      styles: pdfStyles,
    });
    return pdf(el).toBlob();
  };

  let blob: Blob;
  try {
    blob = await renderBlob(styles);
  } catch (err) {
    if (err instanceof RangeError) {
      // A RangeError from fontkit means the registered font URL failed to load
      // or contains a glyph outside the loaded subset. Retry with the built-in
      // Helvetica which needs no network fetch.
      blob = await renderBlob({ ...styles, fontFamily: "Helvetica" });
    } else {
      throw err;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
