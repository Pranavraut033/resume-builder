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
import React, { useEffect, useRef, useState } from "react";

import { EditableItem } from "@/components/job-v2/resume/EditableItem";
import { EditableLink } from "@/components/job-v2/resume/EditableLink";
import { EditableText } from "@/components/job-v2/resume/EditableText";
import { useInlineEdit } from "@/components/job-v2/resume/InlineEditContext";
import MeasurementContainer from "@/components/job/templates/shared/MeasurementContainer";
import ResumePage from "@/components/job/templates/shared/ResumePage";
import { TemplateRendererProps } from "@/components/job/templates/TemplateRenderer";
import { useBlockPaginator } from "@/hooks/useBlockPaginator";
import useResolveCustomization from "@/hooks/useResolveCustomization";
import { legacyToTheme } from "@/lib/theme/legacyToTheme";
import { getPageDimensions } from "@/lib/pageDimensions";
import { HeadingStyle } from "@/types/customization";
import { getSectionLayout } from "@/types/resume";

import { buildSections } from "./buildSections";
import { isListSection, SECTION_REGISTRY } from "./sections";
import { Block, SectionInstance, TemplateConfig } from "./types";

// Not a hook — just loops over registry builders. Named without a `use`
// prefix to avoid tripping react-hooks/rules-of-hooks despite the conditional
// call site below (2-column templates only build column 1 when present).
function buildColumnBlocks(
  instances: SectionInstance[],
  resume: TemplateEngineProps["resume"],
  theme: ReturnType<typeof useResolveCustomization>,
  edit: ReturnType<typeof useInlineEdit>
): Block[] {
  const blocks: Block[] = [];
  for (const instance of instances) {
    const entry = SECTION_REGISTRY[instance.type];
    if (!entry) continue;
    blocks.push(...entry.dom({ resume, instance, theme, edit }));
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
  config,
}) => {
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

  const { widthMm, widthPx, heightPx, marginPx, contentHeightPx } =
    getPageDimensions(customization.pageFormat, customization.marginSize);

  const edit = useInlineEdit();
  const sectionLayout = getSectionLayout(resume);
  const headerHidden = sectionLayout.hidden.includes("header");

  const instances = buildSections(resume, config);
  const col0Instances = instances.filter((s) => s.column === 0);
  const col1Instances = instances.filter((s) => s.column === 1);

  // Per-section style overrides (color/heading) — see CustomizationDrawer's
  // SectionThemeOverrides. Layered on top of the scalar-resolved `theme`
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
      default:
        return "border-b pb-1";
    }
  };

  const headingStyle: React.CSSProperties = config.headingSmallCaps
    ? { fontVariant: "small-caps" }
    : {};

  const sectionHeadingNode = (instance: SectionInstance | undefined) => {
    if (!instance) return null;
    const override = perSectionTheme?.[instance.id];
    const canAdd = edit.editable && isListSection(instance.id);
    return (
      <h2
        className={`${headingSize} group/heading mb-3 flex items-center justify-between gap-2 font-semibold ${headingClassFor(override?.headingStyle ?? config.heading)}`}
        style={{
          color: override?.color ?? primaryColor,
          borderColor: override?.color ?? secondaryColor,
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

  const col0Blocks = buildColumnBlocks(col0Instances, resume, theme, edit);
  const col1Blocks =
    config.columns === 2
      ? buildColumnBlocks(col1Instances, resume, theme, edit)
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

  const col0 = useBlockPaginator({
    count: col0Blocks.length,
    pageContentHeight: contentHeightPx,
    firstPageReserved: headerHeight,
    gapPx: 16,
  });
  const col1 = useBlockPaginator({
    count: col1Blocks.length,
    pageContentHeight: contentHeightPx,
    firstPageReserved: headerHeight,
    gapPx: 16,
  });

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

  const headerNode = headerHidden ? null : (
    <header
      className="mb-8 border-b-2 pb-4"
      style={{ borderColor: primaryColor }}
    >
      <h1
        className={`mb-2 ${nameSize} font-bold`}
        style={{ color: primaryColor }}
      >
        <EditableText
          value={resume.header.name}
          onCommit={(v) => edit.updateHeader({ name: v })}
          placeholder="Your Name"
        />
      </h1>
      {(resume.header.headline || edit.editable) && (
        <div
          className={`${textSize} ${lineHeight} mb-2 font-medium`}
          style={{ color: theme.accentColor }}
        >
          <EditableText
            value={resume.header.headline || ""}
            onCommit={(v) => edit.updateHeader({ headline: v })}
            placeholder="Professional headline"
          />
        </div>
      )}
      <div
        className={`${textSize} ${lineHeight} space-y-1`}
        style={{ color: secondaryColor }}
      >
        <div className="flex flex-wrap gap-4">
          {(resume.header.email || edit.editable) && (
            <span>
              ✉{" "}
              <EditableText
                value={resume.header.email}
                onCommit={(v) => edit.updateHeader({ email: v })}
                placeholder="email@example.com"
              />
            </span>
          )}
          {(resume.header.phone || edit.editable) && (
            <span>
              📞{" "}
              <EditableText
                value={resume.header.phone || ""}
                onCommit={(v) => edit.updateHeader({ phone: v })}
                placeholder="Phone"
              />
            </span>
          )}
          {(resume.header.location || edit.editable) && (
            <span>
              📍{" "}
              <EditableText
                value={resume.header.location || ""}
                onCommit={(v) => edit.updateHeader({ location: v })}
                placeholder="Location"
              />
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          {(resume.header.linkedin || edit.editable) && (
            <EditableLink
              href={resume.header.linkedin ?? ""}
              onCommit={(v) => edit.updateHeader({ linkedin: v })}
              placeholder="LinkedIn URL"
              className="hover:underline"
              style={{ color: theme.accentColor }}
            />
          )}
          {(resume.header.github || edit.editable) && (
            <EditableLink
              href={resume.header.github ?? ""}
              onCommit={(v) => edit.updateHeader({ github: v })}
              placeholder="GitHub URL"
              className="hover:underline"
              style={{ color: theme.accentColor }}
            />
          )}
          {(resume.header.website || edit.editable) && (
            <EditableLink
              href={resume.header.website ?? ""}
              onCommit={(v) => edit.updateHeader({ website: v })}
              placeholder="Website URL"
              className="hover:underline"
              style={{ color: theme.accentColor }}
            />
          )}
        </div>
      </div>
    </header>
  );

  const renderColumnBlocks = (
    blocks: Block[],
    instances: SectionInstance[],
    indices: number[],
    prevLastSection: string
  ) => {
    let currentSection = prevLastSection;
    return indices.map((idx) => {
      const block = blocks[idx];
      if (!block) return null; // stale index while blocks rebuild after an edit
      const isNewSection = block.sectionKey !== currentSection;
      currentSection = block.sectionKey;
      const reorderable =
        edit.editable &&
        isListSection(block.sectionKey) &&
        block.itemIndex !== undefined;

      return (
        <div key={idx} className="mb-4">
          {isNewSection && (
            <div className="mb-2">
              {sectionHeadingNode(instanceFor(block.sectionKey, instances))}
            </div>
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

  const measurement = (
    <MeasurementContainer
      widthMm={
        config.columns === 2
          ? widthMm * (config.columnRatio?.[0] ?? 0.35)
          : widthMm
      }
    >
      <div style={{ padding: marginPx, paddingBottom: 0 }}>
        <div ref={headerRef}>{headerNode}</div>
      </div>
      <div style={{ paddingLeft: marginPx, paddingRight: marginPx }}>
        {col0Blocks.map((block, i) => (
          <div key={i} ref={col0.setRef(i)}>
            {(i === 0 || col0Blocks[i - 1].sectionKey !== block.sectionKey) && (
              <div className="mb-2">
                {sectionHeadingNode(
                  instanceFor(block.sectionKey, col0Instances)
                )}
              </div>
            )}
            {block.node}
          </div>
        ))}
      </div>
    </MeasurementContainer>
  );

  const measurementCol1 =
    config.columns === 2 ? (
      <MeasurementContainer
        widthMm={widthMm * (config.columnRatio?.[1] ?? 0.65)}
      >
        <div style={{ paddingLeft: marginPx, paddingRight: marginPx }}>
          {col1Blocks.map((block, i) => (
            <div key={i} ref={col1.setRef(i)}>
              {(i === 0 ||
                col1Blocks[i - 1].sectionKey !== block.sectionKey) && (
                <div className="mb-2">
                  {sectionHeadingNode(
                    instanceFor(block.sectionKey, col1Instances)
                  )}
                </div>
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
            style={{
              padding: marginPx,
              height: "100%",
              boxSizing: "border-box",
            }}
          >
            {pageIndex === 0 && headerNode}
            {renderColumnBlocks(
              col0Blocks,
              col0Instances,
              group0,
              prevSection0
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
    const [ratio0, ratio1] = config.columnRatio ?? [0.35, 0.65];

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
        {pageIndex === 0 && headerNode}
        <div
          className="flex"
          style={{
            height: pageIndex === 0 ? `calc(100% - ${headerHeight}px)` : "100%",
          }}
        >
          <div
            style={{
              width: `${ratio0 * 100}%`,
              padding: "24px",
              backgroundColor: secondaryColor + "10",
              overflowY: "hidden",
            }}
          >
            {renderColumnBlocks(
              col0Blocks,
              col0Instances,
              group0,
              prevSection0
            )}
          </div>
          <div
            style={{
              width: `${ratio1 * 100}%`,
              padding: "24px",
              overflowY: "hidden",
            }}
          >
            {renderColumnBlocks(
              col1Blocks,
              col1Instances,
              group1,
              prevSection1
            )}
          </div>
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
