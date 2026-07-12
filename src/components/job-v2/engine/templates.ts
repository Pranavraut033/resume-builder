import { TemplateType } from "@/types/customization";

import { TemplateConfig } from "./types";

/**
 * A "template" is now a config object (layout + style tokens), not a
 * ~850-line component. New template = one entry here.
 */
export const TEMPLATE_CONFIG: Partial<Record<TemplateType, TemplateConfig>> = {
  "modern-minimal": {
    columns: 1,
    heading: "underline",
    defaultFont: "Poppins",
  },
  "tech-sidebar": {
    columns: 2,
    columnRatio: [0.35, 0.65],
    sectionColumn: {
      skills: 0,
      education: 0,
      certifications: 0,
      languages: 0,
      awards: 0,
      summary: 1,
      experience: 1,
      projects: 1,
      publications: 1,
      volunteer: 1,
      custom: 1,
    },
    heading: "uppercase",
    defaultFont: "Inter",
  },
  "creative-modern": {
    columns: 2,
    columnRatio: [0.4, 0.6],
    sectionColumn: {
      summary: 0,
      skills: 0,
      education: 0,
      certifications: 0,
      languages: 0,
      awards: 0,
      experience: 1,
      projects: 1,
      volunteer: 1,
      publications: 1,
      custom: 1,
    },
    heading: "underline",
    defaultFont: "Inter",
  },
  "bjet-professional": {
    columns: 1,
    heading: "underline",
    defaultFont: "Georgia",
  },
  "two-tone": {
    columns: 2,
    columnRatio: [0.4, 0.6],
    sectionColumn: {
      summary: 0,
      skills: 0,
      education: 0,
      certifications: 0,
      languages: 0,
      awards: 0,
      experience: 1,
      projects: 1,
      volunteer: 1,
      publications: 1,
      custom: 1,
    },
    heading: "underline",
    defaultFont: "Inter",
  },
  "business-professional": {
    columns: 1,
    heading: "underline",
    defaultFont: "Georgia",
  },
  "compact-modern": {
    columns: 1,
    heading: "uppercase",
    defaultFont: "Inter",
  },
  "academic-serif": {
    columns: 1,
    heading: "serif",
    headingSmallCaps: true,
    defaultFont: "Georgia",
  },
  "elegant-timeline": {
    columns: 1,
    heading: "uppercase",
    defaultFont: "Poppins",
  },
};
