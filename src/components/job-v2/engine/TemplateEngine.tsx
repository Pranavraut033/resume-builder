"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  CalendarDays,
  Flag,
  Github,
  Globe,
  IdCard,
  Linkedin,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import MeasurementContainer from "@/components/job/templates/shared/MeasurementContainer";
import ResumePage from "@/components/job/templates/shared/ResumePage";
import { TemplateRendererProps } from "@/components/job/templates/TemplateRenderer";
import { EditableItem } from "@/components/job-v2/resume/EditableItem";
import { EditableLink } from "@/components/job-v2/resume/EditableLink";
import { EditableText } from "@/components/job-v2/resume/EditableText";
import { useInlineEdit } from "@/components/job-v2/resume/InlineEditContext";
import { useBlockPaginator } from "@/hooks/useBlockPaginator";
import useResolveCustomization from "@/hooks/useResolveCustomization";
import { getPageDimensions } from "@/lib/pageDimensions";
import { setFitScale } from "@/lib/pdf/fitScale";
import { legacyToTheme } from "@/lib/theme/legacyToTheme";
import { HeadingStyle } from "@/types/customization";
import { getSectionLayout } from "@/types/resume";

import { buildSections } from "./buildSections";
import { photoDomStyle, photoRadius } from "./photoFrame";
import { isListSection, SECTION_REGISTRY } from "./sections";
import { resolveTemplateConfig } from "./templates";
import {
  Block,
  ResolvedTemplateConfig,
  SectionInstance,
  TemplateConfig,
} from "./types";

// Not a hook — just loops over registry builders. Named without a `use`
// prefix to avoid tripping react-hooks/rules-of-hooks despite the conditional
// call site below (2-column templates only build column 1 when present).
function buildColumnBlocks(
  instances: SectionInstance[],
  resume: TemplateEngineProps["resume"],
  theme: ReturnType<typeof useResolveCustomization>,
  edit: ReturnType<typeof useInlineEdit>,
  config: ResolvedTemplateConfig
): Block[] {
  const blocks: Block[] = [];
  for (const instance of instances) {
    const entry = SECTION_REGISTRY[instance.type];
    if (!entry) continue;
    blocks.push(...entry.dom({ resume, instance, theme, edit, config }));
  }
  return blocks;
}

interface TemplateEngineProps extends TemplateRendererProps {
  config: TemplateConfig;
}

/**
 * Replaces the 9 hand-coded DOM template components. A template is now just
 * a TemplateConfig (column layout + heading style); content comes from
 * buildSections() + SECTION_REGISTRY so every section type renders
 * identically across templates.
 */
export const TemplateEngine: React.FC<TemplateEngineProps> = ({
  resume,
  customization,
  config: rawConfig,
}) => {
  const config = resolveTemplateConfig(rawConfig);
  const theme = useResolveCustomization(customization);
  const {
    primaryColor,
    secondaryColor,
    textSize,
    fontFamily,
    lineHeight,
    headingSize,
    nameSize,
    background,
    colorsTuple,
  } = theme;

  const { widthPx, heightPx, marginPx, contentHeightPx } = getPageDimensions(
    customization.pageFormat,
    customization.marginSize
  );

  // ── Column geometry ──────────────────────────────────────────────────────
  // Single source of truth for both the off-screen measurement containers
  // and the real rendered columns below — they must agree exactly, or
  // measured heights don't match what actually renders (see plan 1a).
  const outerPadX = marginPx; // page edge → column text
  const gutterX = marginPx * 0.6; // between the two columns
  const colPadY = marginPx * 0.7; // column top/bottom padding
  const colWidthPx = (ratio: number) => ratio * widthPx;
  const [ratio0, ratio1] = config.columnRatio ?? [0.35, 0.65];

  const edit = useInlineEdit();
  const sectionLayout = getSectionLayout(resume);
  const headerHidden = sectionLayout.hidden.includes("header");

  const instances = buildSections(resume, config);
  const col0Instances = instances.filter((s) => s.column === 0);
  const col1Instances = instances.filter((s) => s.column === 1);

  // Per-section heading-style overrides — see ThemeCustomizationPanel's
  // "Heading Style" control. Layered on top of the scalar-resolved `theme`
  // above rather than rearchitecting theme resolution onto ThemeConfig.
  const perSectionTheme = legacyToTheme(customization).perSection;

  const headingClassFor = (style: HeadingStyle) => {
    switch (style) {
      case "uppercase":
        return "uppercase tracking-wide";
      case "bar":
        return "border-l-4 pl-2";
      case "serif":
        return "font-serif italic";
      case "plain":
        return "";
      case "accent-rule":
        return "border-b-2 pb-1";
      default:
        return "border-b pb-1";
    }
  };

  const headingStyle: React.CSSProperties = config.headingSmallCaps
    ? { fontVariant: "small-caps" }
    : {};

  const isHeadingCentered = config.headingAlign === "center";

  // `columnIndex` picks `headingSidebar` over `heading` for column-0
  // sections of a 2-column template (e.g. creative-modern's bordered
  // sidebar headings vs. its plain main-column headings).
  const sectionHeadingNode = (
    instance: SectionInstance | undefined,
    columnIndex: 0 | 1
  ) => {
    if (!instance) return null;
    const override = perSectionTheme?.[instance.id];
    const canAdd = edit.editable && isListSection(instance.id);
    // A `sidebarFill: "solid"` sidebar (tech-sidebar) forces its heading text/
    // border to `theme.backgroundColor` so it reads light-on-dark instead of
    // the usual primary/secondary colors, which would be illegible.
    const isSolidSidebarColumn =
      config.columns === 2 &&
      columnIndex === 0 &&
      config.sidebarFill === "solid";
    const baseStyle =
      config.columns === 2 && columnIndex === 0
        ? config.headingSidebar
        : config.heading;
    const resolvedStyle = override?.headingStyle ?? baseStyle;
    const borderColor = isSolidSidebarColumn
      ? theme.backgroundColor + "60"
      : resolvedStyle === "accent-rule"
        ? theme.accentColor
        : (override?.color ?? secondaryColor);
    return (
      <h2
        className={`${headingSize} group/heading mb-1.5 flex items-center gap-2 font-semibold ${isHeadingCentered ? "justify-center text-center" : "justify-between"} ${headingClassFor(resolvedStyle)}`}
        style={{
          color: isSolidSidebarColumn
            ? theme.backgroundColor
            : (override?.color ?? primaryColor),
          borderColor,
          ...headingStyle,
        }}
      >
        <span>{instance.title}</span>
        {canAdd && (
          <button
            onClick={() =>
              isListSection(instance.id) && edit.addItem(instance.id)
            }
            aria-label={`Add ${instance.title} entry`}
            className="text-agent-on-surface-variant hover:bg-agent-primary-container hover:text-agent-on-primary-container -my-1 rounded-full px-2 py-1 text-xs font-medium opacity-0 transition-all duration-150 group-hover/heading:opacity-100"
          >
            + Add
          </button>
        )}
      </h2>
    );
  };

  // A `sidebarFill: "solid"` sidebar (tech-sidebar) inverts to light-on-dark
  // via `color: sidebarTextColor` on the column's own div below, which only
  // covers text that inherits color. Section builders that set `secondaryColor`/
  // `accentColor` explicitly (category labels, degree/institution, bullet
  // glyphs, dates) override that inheritance and render their normal
  // light-background colors on the dark fill instead — illegible. Since every
  // builder reads color off the `theme` object passed in, substituting a
  // theme with those fields mapped to `backgroundColor` for column 0 fixes
  // every builder at once, mirroring the PDF engine's `sidebarStyles`.
  const sidebarTheme =
    config.sidebarFill === "solid"
      ? {
          ...theme,
          secondaryColor: theme.backgroundColor,
          accentColor: theme.backgroundColor,
          textColor: theme.backgroundColor,
        }
      : theme;

  const col0Blocks = buildColumnBlocks(
    col0Instances,
    resume,
    sidebarTheme,
    edit,
    config
  );
  const col1Blocks =
    config.columns === 2
      ? buildColumnBlocks(col1Instances, resume, theme, edit, config)
      : [];

  const instanceFor = (sectionKey: string, list: SectionInstance[]) =>
    list.find((i) => i.id === sectionKey);

  // ── Header measurement ───────────────────────────────────────────────────
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) =>
      setHeaderHeight(e.contentRect.height)
    );
    obs.observe(el);
    setHeaderHeight(el.getBoundingClientRect().height);
    return () => obs.disconnect();
  }, []);

  // ── Per-page height budget ───────────────────────────────────────────────
  // Must match the *actual* usable height of the page box (see plan 1b) —
  // page 0 additionally loses the header + its own margin/padding, later
  // pages don't. `pageContentHeight` below is the page-N value (what every
  // page after the first can hold); `firstPageReserved` is how much less
  // page 0 can hold on top of that.
  const columnPageContentHeight =
    config.columns === 2 ? heightPx - 2 * colPadY : contentHeightPx;
  const columnFirstPageReserved =
    config.columns === 2 ? marginPx + headerHeight : headerHeight;

  // ── "Fit to one page" ────────────────────────────────────────────────────
  // `fitScaleForBudget` lags one render behind (like `headerHeight` above):
  // it's derived from the *previous* commit's measured column totals and fed
  // into this render's paginator budget below, which is what actually lets
  // the paginator bin every block onto page 1. `fitScale` (the value used for
  // the zoom style + PDF store) is computed synchronously from this render's
  // freshly measured totals, so the visible zoom updates as soon as possible.
  const fitToPage = Boolean(customization.fitToPage);
  const [fitScaleForBudget, setFitScaleForBudget] = useState(1);

  const col0 = useBlockPaginator({
    count: col0Blocks.length,
    pageContentHeight: columnPageContentHeight / fitScaleForBudget,
    firstPageReserved: columnFirstPageReserved,
    gapPx: 12,
  });
  const col1 = useBlockPaginator({
    count: col1Blocks.length,
    pageContentHeight: columnPageContentHeight / fitScaleForBudget,
    firstPageReserved: columnFirstPageReserved,
    gapPx: 12,
  });

  const page0Budget = columnPageContentHeight - columnFirstPageReserved;
  const measuredTotalHeight = Math.max(col0.totalHeight, col1.totalHeight);
  const fitScale =
    fitToPage && col0.measured && col1.measured && measuredTotalHeight > 0
      ? Math.max(0.6, Math.min(1, page0Budget / measuredTotalHeight))
      : 1;

  useEffect(() => {
    setFitScaleForBudget(fitScale);
  }, [fitScale]);

  useEffect(() => {
    setFitScale(fitScale);
  }, [fitScale]);

  const sortableIds = [...col0Blocks, ...col1Blocks]
    .filter((b) => isListSection(b.sectionKey) && b.itemIndex !== undefined)
    .map((b) => `${b.sectionKey}-${b.itemIndex}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const parse = (raw: string | number) => {
      const s = String(raw);
      const dash = s.lastIndexOf("-");
      return { section: s.slice(0, dash), index: Number(s.slice(dash + 1)) };
    };
    const from = parse(active.id);
    const to = parse(over.id);
    if (from.section !== to.section || !isListSection(from.section)) return;
    edit.moveItem(from.section, from.index, to.index);
  };

  // ── Header style branch ──────────────────────────────────────────────────
  // "band"/"gradient" fill the header with color and put text in
  // backgroundColor (colour-block header); "split" fills only its left
  // (name/headline) block the same way, its right (contact) block stays
  // tinted-not-filled; the others vary border/alignment only — content
  // structure stays identical.
  const headerVariant = config.header;
  const isBand = headerVariant === "band";
  const isGradient = headerVariant === "gradient";
  const isCentered = headerVariant === "centered";
  const isLeftAccent = headerVariant === "left-accent";
  const isMinimal = headerVariant === "minimal";
  const isPlain = headerVariant === "plain";
  const isBoxed = headerVariant === "boxed";
  const isSplit = headerVariant === "split";
  const isFilled = isBand || isGradient;

  const headerNameColor =
    isFilled || isSplit ? theme.backgroundColor : primaryColor;
  const headerHeadlineColor =
    isFilled || isSplit ? theme.backgroundColor : theme.accentColor;
  const headerContactColor = isFilled ? theme.backgroundColor : secondaryColor;
  const headerLinkColor = isFilled ? theme.backgroundColor : theme.accentColor;

  const headerWrapperClassName = [
    isMinimal ? "mb-3 pb-1.5" : "mb-5 pb-3",
    isCentered && "text-center",
    isFilled && "px-6 pt-6 rounded-md",
    isLeftAccent && "border-l-4 pl-4",
    isBoxed && "rounded-md border p-4",
    isSplit && "overflow-hidden rounded-md",
    !isFilled &&
      !isLeftAccent &&
      !isPlain &&
      !isBoxed &&
      !isSplit &&
      !isMinimal &&
      "border-b-2",
  ]
    .filter(Boolean)
    .join(" ");

  const nameWeightClass =
    config.nameWeight === "light"
      ? "font-light"
      : config.nameWeight === "normal"
        ? "font-normal"
        : "font-bold";

  const photoDataUrl = resume.header.photoDataUrl;
  const photoShape = config.photoShape;
  const photoFrameStyle = config.photoFrame;
  const photoSizePx = 80;
  const photoFrameColor = isFilled ? theme.backgroundColor : primaryColor;
  const photoStyle = photoDomStyle(
    photoShape,
    photoFrameStyle,
    photoSizePx,
    photoFrameColor
  );
  const photoNode = (photoDataUrl || edit.editable) && (
    <div className={`relative shrink-0 ${isCentered ? "mb-3" : ""}`}>
      {photoDataUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- ponytail: photoDataUrl is a base64 data: URL, not a next/image-optimizable remote asset */}
          <img
            src={photoDataUrl}
            alt=""
            className="h-20 w-20 object-cover"
            style={photoStyle}
          />
          {edit.editable && (
            <button
              onClick={() => edit.updateHeader({ photoDataUrl: null })}
              aria-label="Remove photo"
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs leading-none text-white"
            >
              ×
            </button>
          )}
        </>
      ) : (
        <label
          className="text-agent-on-surface-variant hover:bg-agent-primary-container flex h-20 w-20 cursor-pointer items-center justify-center border border-dashed text-center text-xs"
          style={{ borderRadius: photoRadius(photoShape, photoSizePx) }}
        >
          + Photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () =>
                edit.updateHeader({ photoDataUrl: reader.result as string });
              reader.readAsDataURL(file);
            }}
          />
        </label>
      )}
    </div>
  );

  const contactIconClass = "h-3.5 w-3.5 shrink-0";

  // Factored so "split" (two-tone) can compose them into two side-by-side
  // blocks instead of the single name/headline/contact stack every other
  // header variant uses — same EditableText/EditableLink fields either way,
  // just rearranged, so editability parity holds across variants.
  const nameNode = (
    <h1
      className={`mb-1 ${nameSize} ${nameWeightClass}`}
      style={{ color: headerNameColor }}
    >
      <EditableText
        value={resume.header.name}
        onCommit={(v) => edit.updateHeader({ name: v })}
        placeholder="Your Name"
      />
    </h1>
  );

  const headlineNode = (resume.header.headline || edit.editable) && (
    <div
      className={`${textSize} ${lineHeight} mb-1 font-medium`}
      style={{ color: headerHeadlineColor }}
    >
      <EditableText
        value={resume.header.headline || ""}
        onCommit={(v) => edit.updateHeader({ headline: v })}
        placeholder="Professional headline"
      />
    </div>
  );

  const contactBlockNode = (
    <div
      className={`${textSize} ${lineHeight} space-y-0.5`}
      style={{ color: headerContactColor }}
    >
      <div
        className={`flex flex-wrap gap-x-4 gap-y-0.5 ${isCentered ? "justify-center" : ""}`}
      >
        {(resume.header.email || edit.editable) && (
          <span className="inline-flex items-center gap-1.5">
            <Mail
              className={contactIconClass}
              style={{ color: headerContactColor }}
            />
            <EditableText
              value={resume.header.email}
              onCommit={(v) => edit.updateHeader({ email: v })}
              placeholder="email@example.com"
            />
          </span>
        )}
        {(resume.header.phone || edit.editable) && (
          <span className="inline-flex items-center gap-1.5">
            <Phone
              className={contactIconClass}
              style={{ color: headerContactColor }}
            />
            <EditableText
              value={resume.header.phone || ""}
              onCommit={(v) => edit.updateHeader({ phone: v })}
              placeholder="Phone"
            />
          </span>
        )}
        {(resume.header.location || edit.editable) && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin
              className={contactIconClass}
              style={{ color: headerContactColor }}
            />
            <EditableText
              value={resume.header.location || ""}
              onCommit={(v) => edit.updateHeader({ location: v })}
              placeholder="Location"
            />
          </span>
        )}
        {(resume.header.workAuthorization || edit.editable) && (
          <span className="inline-flex items-center gap-1.5">
            <IdCard
              className={contactIconClass}
              style={{ color: headerContactColor }}
            />
            <EditableText
              value={resume.header.workAuthorization || ""}
              onCommit={(v) => edit.updateHeader({ workAuthorization: v })}
              placeholder="Work authorization"
            />
          </span>
        )}
        {(resume.header.nationality || edit.editable) && (
          <span className="inline-flex items-center gap-1.5">
            <Flag
              className={contactIconClass}
              style={{ color: headerContactColor }}
            />
            <EditableText
              value={resume.header.nationality || ""}
              onCommit={(v) => edit.updateHeader({ nationality: v })}
              placeholder="Nationality"
            />
          </span>
        )}
        {(resume.header.dateOfBirth || edit.editable) && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays
              className={contactIconClass}
              style={{ color: headerContactColor }}
            />
            <EditableText
              value={resume.header.dateOfBirth || ""}
              onCommit={(v) => edit.updateHeader({ dateOfBirth: v })}
              placeholder="Date of birth"
            />
          </span>
        )}
      </div>
      <div
        className={`flex flex-wrap gap-x-4 gap-y-0.5 ${isCentered ? "justify-center" : ""}`}
      >
        {(resume.header.linkedin || edit.editable) && (
          <span className="inline-flex items-center gap-1.5">
            <Linkedin
              className={contactIconClass}
              style={{ color: headerLinkColor }}
            />
            <EditableLink
              href={resume.header.linkedin ?? ""}
              onCommit={(v) => edit.updateHeader({ linkedin: v })}
              placeholder="LinkedIn URL"
              className="hover:underline"
              style={{ color: headerLinkColor }}
            />
          </span>
        )}
        {(resume.header.github || edit.editable) && (
          <span className="inline-flex items-center gap-1.5">
            <Github
              className={contactIconClass}
              style={{ color: headerLinkColor }}
            />
            <EditableLink
              href={resume.header.github ?? ""}
              onCommit={(v) => edit.updateHeader({ github: v })}
              placeholder="GitHub URL"
              className="hover:underline"
              style={{ color: headerLinkColor }}
            />
          </span>
        )}
        {(resume.header.website || edit.editable) && (
          <span className="inline-flex items-center gap-1.5">
            <Globe
              className={contactIconClass}
              style={{ color: headerLinkColor }}
            />
            <EditableLink
              href={resume.header.website ?? ""}
              onCommit={(v) => edit.updateHeader({ website: v })}
              placeholder="Website URL"
              className="hover:underline"
              style={{ color: headerLinkColor }}
            />
          </span>
        )}
      </div>
    </div>
  );

  const headerNode = headerHidden ? null : (
    <header
      className={headerWrapperClassName}
      style={{
        borderColor: isLeftAccent
          ? theme.accentColor
          : isBoxed
            ? secondaryColor + "40"
            : primaryColor,
        ...(isBand ? { backgroundColor: primaryColor } : {}),
        ...(isGradient
          ? {
              background: `linear-gradient(135deg, ${primaryColor}, ${theme.accentColor})`,
            }
          : {}),
      }}
    >
      {isSplit ? (
        <div className="flex flex-wrap">
          <div
            className="flex w-3/5 flex-col justify-center px-5 py-4"
            style={{ backgroundColor: primaryColor }}
          >
            {nameNode}
            {headlineNode}
          </div>
          <div
            className="flex w-2/5 items-center gap-4 px-5 py-4"
            style={{ backgroundColor: theme.accentColor + "1a" }}
          >
            <div className="min-w-0 flex-1">{contactBlockNode}</div>
            {photoNode}
          </div>
        </div>
      ) : (
        <div
          className={`flex gap-4 ${isCentered ? "flex-col items-center" : "items-start justify-between"}`}
        >
          {isCentered && photoNode}
          <div className="min-w-0 flex-1">
            {nameNode}
            {headlineNode}
            {isBoxed && (
              <hr
                className="my-2"
                style={{ borderColor: secondaryColor + "40" }}
              />
            )}
            {contactBlockNode}
          </div>
          {!isCentered && photoNode}
        </div>
      )}
    </header>
  );

  const renderColumnBlocks = (
    blocks: Block[],
    instances: SectionInstance[],
    indices: number[],
    prevLastSection: string,
    columnIndex: 0 | 1
  ) => {
    let currentSection = prevLastSection;
    return indices.map((idx, i) => {
      const block = blocks[idx];
      if (!block) return null; // stale index while blocks rebuild after an edit
      const isNewSection = block.sectionKey !== currentSection;
      currentSection = block.sectionKey;
      const reorderable =
        edit.editable &&
        isListSection(block.sectionKey) &&
        block.itemIndex !== undefined;
      // Rule between consecutive sections (academic-serif) — never above the
      // first heading rendered on a page, so pages never open with a stray line.
      const showDivider = config.sectionDivider && isNewSection && i !== 0;

      return (
        <div key={idx} className={block.tight ? "" : "mb-3"}>
          {showDivider && (
            <hr
              className="mb-4"
              style={{ borderColor: secondaryColor + "30" }}
            />
          )}
          {isNewSection &&
            sectionHeadingNode(
              instanceFor(block.sectionKey, instances),
              columnIndex
            )}
          {reorderable ? (
            <EditableItem
              id={`${block.sectionKey}-${block.itemIndex}`}
              label={
                instanceFor(block.sectionKey, instances)?.title ??
                block.sectionKey
              }
              onDelete={() =>
                edit.removeItem(
                  block.sectionKey as Parameters<typeof edit.removeItem>[0],
                  block.itemIndex as number
                )
              }
            >
              {block.node}
            </EditableItem>
          ) : (
            block.node
          )}
        </div>
      );
    });
  };

  const justifyClass = config.justifyText ? "text-justify" : undefined;

  // Header always measures at full page width — it renders full-width on the
  // page regardless of column count, so this must not use the col0 width.
  const headerMeasurement = (
    <MeasurementContainer widthPx={widthPx}>
      <div style={{ padding: marginPx, paddingBottom: 0 }}>
        <div ref={headerRef}>{headerNode}</div>
      </div>
    </MeasurementContainer>
  );

  const measurement = (
    <MeasurementContainer
      widthPx={config.columns === 2 ? colWidthPx(ratio0) : widthPx}
    >
      <div
        className={justifyClass}
        style={
          config.columns === 2
            ? { paddingLeft: outerPadX, paddingRight: gutterX }
            : { paddingLeft: outerPadX, paddingRight: outerPadX }
        }
      >
        {col0Blocks.map((block, i) => (
          <div key={i} ref={col0.setRef(i)}>
            {(i === 0 || col0Blocks[i - 1].sectionKey !== block.sectionKey) &&
              sectionHeadingNode(
                instanceFor(block.sectionKey, col0Instances),
                0
              )}
            {block.node}
          </div>
        ))}
      </div>
    </MeasurementContainer>
  );

  const measurementCol1 =
    config.columns === 2 ? (
      <MeasurementContainer widthPx={colWidthPx(ratio1)}>
        <div
          className={justifyClass}
          style={{ paddingLeft: gutterX, paddingRight: outerPadX }}
        >
          {col1Blocks.map((block, i) => (
            <div key={i} ref={col1.setRef(i)}>
              {(i === 0 || col1Blocks[i - 1].sectionKey !== block.sectionKey) &&
                sectionHeadingNode(
                  instanceFor(block.sectionKey, col1Instances),
                  1
                )}
              {block.node}
            </div>
          ))}
        </div>
      </MeasurementContainer>
    ) : null;

  const pageCount =
    config.columns === 2
      ? Math.max(col0.pageGroups.length, col1.pageGroups.length)
      : col0.pageGroups.length;

  const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
    const group0 = col0.pageGroups[pageIndex] ?? [];
    const prevGroup0 = col0.pageGroups[pageIndex - 1] ?? [];
    const prevSection0 =
      pageIndex === 0
        ? ""
        : (col0Blocks[prevGroup0[prevGroup0.length - 1]]?.sectionKey ?? "");

    if (config.columns === 1) {
      return (
        <ResumePage
          key={pageIndex}
          widthPx={widthPx}
          heightPx={heightPx}
          pageIndex={pageIndex}
          pageCount={pageCount}
          background={background}
          colors={colorsTuple}
        >
          <div
            className={justifyClass}
            style={{
              padding: marginPx,
              height: "100%",
              boxSizing: "border-box",
              zoom: fitScale,
            }}
          >
            {pageIndex === 0 && headerNode}
            {renderColumnBlocks(
              col0Blocks,
              col0Instances,
              group0,
              prevSection0,
              0
            )}
          </div>
        </ResumePage>
      );
    }

    const group1 = col1.pageGroups[pageIndex] ?? [];
    const prevGroup1 = col1.pageGroups[pageIndex - 1] ?? [];
    const prevSection1 =
      pageIndex === 0
        ? ""
        : (col1Blocks[prevGroup1[prevGroup1.length - 1]]?.sectionKey ?? "");

    // `sidebarSide: "right"` swaps which physical side (not which logical
    // column — col0 stays the sidebar's content, col1 stays the main
    // column's) the sidebar renders on; `headerSpan: "main"` renders the
    // header inside the main column instead of full page width, so a
    // `sidebarFill: "solid"` sidebar (tech-sidebar) can run full page height
    // uninterrupted by it. Note: `headerHeight` below is still measured at
    // full page width (see `headerMeasurement`) even when the header
    // actually renders inside the narrower main column for `headerSpan:
    // "main"` — that's an intentionally conservative reserve (see report),
    // not a pagination/measurement change, which is Cluster 1's file.
    const sidebarRight = config.sidebarSide === "right";
    const headerSpansMain = config.headerSpan === "main";
    const sidebarFillColor =
      config.sidebarFill === "solid"
        ? primaryColor
        : config.sidebarFill === "tint"
          ? secondaryColor + "10"
          : undefined;
    const sidebarTextColor =
      config.sidebarFill === "solid" ? theme.backgroundColor : undefined;

    const sidebarDiv = (
      <div
        key="sidebar"
        className={justifyClass}
        style={{
          width: `${ratio0 * 100}%`,
          paddingTop: colPadY,
          paddingBottom: colPadY,
          paddingLeft: sidebarRight ? gutterX : outerPadX,
          paddingRight: sidebarRight ? outerPadX : gutterX,
          backgroundColor: sidebarFillColor,
          color: sidebarTextColor,
          overflowY: "hidden",
          zoom: fitScale,
        }}
      >
        {renderColumnBlocks(col0Blocks, col0Instances, group0, prevSection0, 0)}
      </div>
    );

    const mainDiv = (
      <div
        key="main"
        className={justifyClass}
        style={{
          width: `${ratio1 * 100}%`,
          paddingTop: colPadY,
          paddingBottom: colPadY,
          paddingLeft: sidebarRight ? outerPadX : gutterX,
          paddingRight: sidebarRight ? gutterX : outerPadX,
          overflowY: "hidden",
          zoom: fitScale,
        }}
      >
        {headerSpansMain && pageIndex === 0 && headerNode}
        {renderColumnBlocks(col1Blocks, col1Instances, group1, prevSection1, 1)}
      </div>
    );

    return (
      <ResumePage
        key={pageIndex}
        widthPx={widthPx}
        heightPx={heightPx}
        pageIndex={pageIndex}
        pageCount={pageCount}
        background={background}
        colors={colorsTuple}
      >
        {!headerSpansMain && pageIndex === 0 && (
          <div style={{ padding: marginPx, paddingBottom: 0 }}>
            {headerNode}
          </div>
        )}
        <div
          className="flex"
          style={{
            height:
              !headerSpansMain && pageIndex === 0
                ? `calc(100% - ${headerHeight + marginPx}px)`
                : "100%",
          }}
        >
          {sidebarRight ? [mainDiv, sidebarDiv] : [sidebarDiv, mainDiv]}
        </div>
      </ResumePage>
    );
  });

  const body = (
    <div
      style={{
        fontFamily,
        color: theme.textColor,
        backgroundColor: theme.backgroundColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      {headerMeasurement}
      {measurement}
      {measurementCol1}
      {pages}
    </div>
  );

  if (!edit.editable) return body;

  return (
    <DndContext
      id="template-engine"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleItemDragEnd}
    >
      <SortableContext
        items={sortableIds}
        strategy={verticalListSortingStrategy}
      >
        {body}
      </SortableContext>
    </DndContext>
  );
};
