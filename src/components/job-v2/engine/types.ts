import type { useInlineEdit } from "@/components/job-v2/resume/InlineEditContext";
import type useResolveCustomizationFn from "@/hooks/useResolveCustomization";
import type {
  BulletStyle,
  DateStyle,
  EntryStyle,
  HeaderStyle,
  HeadingStyle,
  PhotoFrame,
  PhotoShape,
  SkillStyle,
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
  /** Suppresses the block wrapper's bottom margin — for `entryStyle: "timeline"`
   * entries, whose own `pb-3`/left-rail need to butt directly against the next
   * entry so the rail reads as one continuous line. */
  tight?: boolean;
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
  config: ResolvedTemplateConfig;
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
  /** Section-heading text alignment. Defaults to "left". */
  headingAlign?: "left" | "center";
  /** Heading style override for column-0 (sidebar) sections in 2-column templates. Defaults to `heading`. */
  headingSidebar?: HeadingStyle;
  /** Header block layout. Defaults to "underline" when unset. */
  header?: HeaderStyle;
  /** How dated entries (experience/education/projects/volunteer) render. Defaults to "standard". */
  entryStyle?: EntryStyle;
  /** Profile photo corner treatment. Defaults to "circle". */
  photoShape?: PhotoShape;
  /** Profile photo border/elevation treatment. Defaults to "ring". */
  photoFrame?: PhotoFrame;
  /** How the skills section renders. Defaults to "inline". */
  skillStyle?: SkillStyle;
  /** Whether entry date ranges render as a tinted pill badge. Defaults to "plain". */
  dateStyle?: DateStyle;
  /** Bullet glyph for achievements/custom-section lists. Defaults to "disc". */
  bulletStyle?: BulletStyle;
  /** Which physical side the 2-column sidebar renders on. Defaults to "left". */
  sidebarSide?: "left" | "right";
  /** How the 2-column sidebar's background is filled: no fill, a light tint, or a
   * solid `primaryColor` fill (text/headings inside are forced to
   * `theme.backgroundColor`). Defaults to "none". */
  sidebarFill?: "none" | "tint" | "solid";
  /** Whether the header spans the full page width or only the main (non-sidebar)
   * column — "main" lets a `sidebarFill: "solid"` sidebar run full page height
   * uninterrupted by the header. Defaults to "full". Ignored for 1-column templates. */
  headerSpan?: "full" | "main";
  /** Whether body paragraphs (summary/descriptions) render text-justified. Defaults to false. */
  justifyText?: boolean;
  /** Header name font weight. Defaults to "bold". */
  nameWeight?: "light" | "normal" | "bold";
  /** Whether a rule renders between consecutive sections (single-column only). Defaults to false. */
  sectionDivider?: boolean;
};

/** Fields every template needs a concrete value for — see `resolveTemplateConfig()`. */
type ResolvedFields =
  | "header"
  | "entryStyle"
  | "photoShape"
  | "photoFrame"
  | "skillStyle"
  | "dateStyle"
  | "bulletStyle"
  | "sidebarSide"
  | "sidebarFill"
  | "headerSpan"
  | "justifyText"
  | "nameWeight"
  | "sectionDivider"
  | "headingAlign"
  | "headingSidebar";

/** `TemplateConfig` with every knob that has a default resolved to a concrete value — see `resolveTemplateConfig()` in `templates.ts`. */
export type ResolvedTemplateConfig = TemplateConfig &
  Required<Pick<TemplateConfig, ResolvedFields>>;

export type { ThemeConfig, SectionLayout };
