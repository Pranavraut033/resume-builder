import { TemplateType } from "@/types/customization";

import { ResolvedTemplateConfig, TemplateConfig } from "./types";

/**
 * A "template" is a config object (layout + style tokens), not a
 * ~850-line component. New template = one entry here.
 *
 * Adapted from Resumify (https://github.com/Afif718/Resumify) — each
 * template's column/header/heading/entryStyle/skillStyle/dateStyle/
 * bulletStyle combination is chosen to match that template's Resumify
 * original (or, for the three ids Resumify doesn't ship — compact-modern,
 * two-tone, academic-serif — to give it its own identity). Every pair of
 * templates differs on at least 3 of those axes, so no two collapse
 * visually — enforced by tests/lib/templateDistinctness.test.ts.
 */
export const TEMPLATE_CONFIG: Partial<Record<TemplateType, TemplateConfig>> = {
  "modern-minimal": {
    columns: 2,
    columnRatio: [0.35, 0.65],
    sectionColumn: {
      skills: 0,
      education: 0,
      certifications: 0,
      languages: 0,
      awards: 0,
      hobbies: 0,
      summary: 1,
      experience: 1,
      projects: 1,
      publications: 1,
      volunteer: 1,
      custom: 1,
    },
    header: "plain",
    heading: "plain",
    entryStyle: "standard",
    skillStyle: "chips",
    dateStyle: "badge",
    bulletStyle: "dot",
    photoShape: "circle",
    photoFrame: "ring",
  },
  "tech-sidebar": {
    columns: 2,
    columnRatio: [0.3, 0.7],
    sectionColumn: {
      skills: 0,
      education: 0,
      certifications: 0,
      languages: 0,
      awards: 0,
      hobbies: 0,
      summary: 1,
      experience: 1,
      projects: 1,
      publications: 1,
      volunteer: 1,
      custom: 1,
    },
    header: "plain",
    headerSpan: "main",
    heading: "uppercase",
    entryStyle: "standard",
    skillStyle: "list",
    dateStyle: "plain",
    bulletStyle: "dash",
    sidebarFill: "solid",
    photoShape: "squircle",
    photoFrame: "ring",
  },
  "creative-modern": {
    columns: 2,
    columnRatio: [0.33, 0.67],
    sectionColumn: {
      summary: 1,
      skills: 0,
      education: 0,
      certifications: 0,
      languages: 0,
      awards: 0,
      hobbies: 0,
      experience: 1,
      projects: 1,
      volunteer: 1,
      publications: 1,
      custom: 1,
    },
    header: "gradient",
    heading: "plain",
    headingSidebar: "accent-rule",
    entryStyle: "marker",
    skillStyle: "grid",
    dateStyle: "plain",
    bulletStyle: "dot",
    sidebarSide: "right",
    photoShape: "circle",
    photoFrame: "shadow",
  },
  "bjet-professional": {
    columns: 1,
    header: "boxed",
    heading: "bar",
    entryStyle: "table",
    skillStyle: "table",
    dateStyle: "plain",
    photoShape: "square",
    photoFrame: "ring",
  },
  "two-tone": {
    columns: 2,
    columnRatio: [0.38, 0.62],
    sectionColumn: {
      summary: 1,
      skills: 0,
      education: 0,
      certifications: 0,
      languages: 0,
      awards: 0,
      hobbies: 0,
      experience: 1,
      projects: 1,
      volunteer: 1,
      publications: 1,
      custom: 1,
    },
    header: "split",
    heading: "accent-rule",
    entryStyle: "standard",
    skillStyle: "columns",
    dateStyle: "plain",
    bulletStyle: "disc",
    sidebarFill: "tint",
    photoShape: "squircle",
    photoFrame: "shadow",
  },
  "business-professional": {
    columns: 1,
    header: "underline",
    heading: "uppercase",
    entryStyle: "standard",
    skillStyle: "inline",
    dateStyle: "plain",
    bulletStyle: "disc",
    justifyText: true,
    photoShape: "circle",
    photoFrame: "shadow",
  },
  "compact-modern": {
    columns: 1,
    header: "minimal",
    heading: "uppercase",
    entryStyle: "compact",
    skillStyle: "inline",
    bulletStyle: "dash",
    photoShape: "square",
    photoFrame: "none",
  },
  "academic-serif": {
    columns: 1,
    header: "centered",
    heading: "serif",
    headingSmallCaps: true,
    entryStyle: "standard",
    skillStyle: "inline",
    bulletStyle: "dash",
    justifyText: true,
    sectionDivider: true,
    photoShape: "circle",
    photoFrame: "ring",
  },
  "elegant-timeline": {
    columns: 1,
    header: "centered",
    heading: "plain",
    headingAlign: "center",
    entryStyle: "timeline",
    skillStyle: "columns",
    bulletStyle: "disc",
    nameWeight: "light",
    photoShape: "squircle",
    photoFrame: "ring",
  },
};

const CONFIG_DEFAULTS = {
  header: "underline",
  entryStyle: "standard",
  photoShape: "circle",
  photoFrame: "ring",
  skillStyle: "inline",
  dateStyle: "plain",
  bulletStyle: "disc",
  sidebarSide: "left",
  sidebarFill: "none",
  headerSpan: "full",
  justifyText: false,
  nameWeight: "bold",
  sectionDivider: false,
  headingAlign: "left",
} as const;

/**
 * Applies every `TemplateConfig` default once, in one place, instead of the
 * `config.x ?? "default"` pattern duplicated at each read site across
 * TemplateEngine.tsx and PDFTemplateEngine.tsx (the same drift risk
 * photoFrame.ts's shared primitives avoid for photo shape/frame).
 */
export function resolveTemplateConfig(
  config: TemplateConfig
): ResolvedTemplateConfig {
  return {
    ...config,
    header: config.header ?? CONFIG_DEFAULTS.header,
    entryStyle: config.entryStyle ?? CONFIG_DEFAULTS.entryStyle,
    photoShape: config.photoShape ?? CONFIG_DEFAULTS.photoShape,
    photoFrame: config.photoFrame ?? CONFIG_DEFAULTS.photoFrame,
    skillStyle: config.skillStyle ?? CONFIG_DEFAULTS.skillStyle,
    dateStyle: config.dateStyle ?? CONFIG_DEFAULTS.dateStyle,
    bulletStyle: config.bulletStyle ?? CONFIG_DEFAULTS.bulletStyle,
    sidebarSide: config.sidebarSide ?? CONFIG_DEFAULTS.sidebarSide,
    sidebarFill: config.sidebarFill ?? CONFIG_DEFAULTS.sidebarFill,
    headerSpan: config.headerSpan ?? CONFIG_DEFAULTS.headerSpan,
    justifyText: config.justifyText ?? CONFIG_DEFAULTS.justifyText,
    nameWeight: config.nameWeight ?? CONFIG_DEFAULTS.nameWeight,
    sectionDivider: config.sectionDivider ?? CONFIG_DEFAULTS.sectionDivider,
    headingAlign: config.headingAlign ?? CONFIG_DEFAULTS.headingAlign,
    headingSidebar: config.headingSidebar ?? config.heading,
  };
}
