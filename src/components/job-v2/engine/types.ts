import type { useInlineEdit } from "@/components/job-v2/resume/InlineEditContext";
import type useResolveCustomizationFn from "@/hooks/useResolveCustomization";
import type {
  EntryStyle,
  HeaderStyle,
  HeadingStyle,
  ThemeConfig,
} from "@/types/customization";
import type { ResumeJSON, SectionLayout } from "@/types/resume";
import type { ReactNode } from "react";

/** A measured/paginated unit of content, same shape every template used internally. */
export type Block = {
  node: ReactNode;
  sectionKey: string;
  /** For list-section entries: the index within that section's array. */
  itemIndex?: number;
};

/** Resolved Tailwind-class/color bag a section builder needs to render. */
export type ResolvedTheme = ReturnType<typeof useResolveCustomizationFn>;

export type EditApi = ReturnType<typeof useInlineEdit>;

/** One resolved section, ready to hand to a registry builder. */
export type SectionInstance = {
  /** Built-in section id (BuiltinSectionId) or a custom section's uuid. */
  id: string;
  /** Registry key — for custom sections this is always "custom". */
  type: string;
  title: string;
  column: 0 | 1;
};

export type DomSectionBuilder = (args: {
  resume: ResumeJSON;
  instance: SectionInstance;
  theme: ResolvedTheme;
  edit: EditApi;
  entryStyle?: EntryStyle;
}) => Block[];

export type TxtSectionBuilder = (args: {
  resume: ResumeJSON;
  instance: SectionInstance;
}) => string;

export type SectionRegistryEntry = {
  dom: DomSectionBuilder;
  txt: TxtSectionBuilder;
};

export type TemplateConfig = {
  columns: 1 | 2;
  /** e.g. [0.35, 0.65] for a sidebar layout. Ignored when columns === 1. */
  columnRatio?: [number, number];
  /** Which column a section type defaults to in 2-column templates. */
  sectionColumn?: Partial<Record<string, 0 | 1>>;
  heading: HeadingStyle;
  /** Optional: apply small-caps to section headings (for Academic Serif template). */
  headingSmallCaps?: boolean;
  /** Header block layout. Defaults to "underline" when unset. */
  header?: HeaderStyle;
  /** How dated entries (experience/education/projects/volunteer) render. Defaults to "standard". */
  entryStyle?: EntryStyle;
};

export type { ThemeConfig, SectionLayout };
