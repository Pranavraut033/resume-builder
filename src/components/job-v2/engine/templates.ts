import { TemplateType } from "@/types/customization";

import { TemplateConfig } from "./types";

/**
 * A "template" is now a config object (layout + style tokens), not a
 * ~850-line component. New template = one entry here.
 *
 * Each template is a distinct combination of columns/header/heading/entryStyle
 * so no two collapse visually (font comes from AVAILABLE_TEMPLATES via the
 * TemplatePicker, kept in sync with this table — see customization.ts).
 */
export const TEMPLATE_CONFIG: Partial<Record<TemplateType, TemplateConfig>> = {
  "modern-minimal": {
    columns: 1,
    header: "underline",
    heading: "underline",
    entryStyle: "standard",
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
    header: "underline",
    heading: "uppercase",
    entryStyle: "standard",
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
    header: "band",
    heading: "uppercase",
    entryStyle: "standard",
  },
  "bjet-professional": {
    columns: 1,
    header: "left-accent",
    heading: "bar",
    entryStyle: "standard",
  },
  "two-tone": {
    columns: 2,
    columnRatio: [0.38, 0.62],
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
    header: "band",
    heading: "underline",
    entryStyle: "standard",
  },
  "business-professional": {
    columns: 1,
    header: "centered",
    heading: "underline",
    entryStyle: "standard",
  },
  "compact-modern": {
    columns: 1,
    header: "minimal",
    heading: "uppercase",
    entryStyle: "compact",
  },
  "academic-serif": {
    columns: 1,
    header: "centered",
    heading: "serif",
    headingSmallCaps: true,
    entryStyle: "standard",
  },
  "elegant-timeline": {
    columns: 1,
    header: "underline",
    heading: "bar",
    entryStyle: "timeline",
  },
};
