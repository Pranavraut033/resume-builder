"use client";

import { useCallback } from "react";

import { Icon } from "@/components/ui/Icon";
import cn from "@/lib/cn";
import { V2SectionId } from "@/types/customization";

interface OutlineItem {
  id: V2SectionId;
  label: string;
  icon: React.ComponentProps<typeof Icon>["name"];
}

const OUTLINE_ITEMS: OutlineItem[] = [
  { id: "personal", label: "Personal Info", icon: "user" },
  { id: "summary", label: "Summary", icon: "fileText" },
  { id: "experience", label: "Experience", icon: "Briefcase" },
  { id: "education", label: "Education", icon: "GraduationCap" },
  { id: "skills", label: "Skills", icon: "Tag" },
  { id: "projects", label: "Projects", icon: "Code2" },
  { id: "certifications", label: "Certifications", icon: "Award" },
];

interface SectionOutlinePanelProps {
  activeSection: V2SectionId | null;
  hiddenSections?: V2SectionId[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSectionClick: (id: V2SectionId) => void;
}

export function SectionOutlinePanel({
  activeSection,
  hiddenSections = [],
  collapsed,
  onToggleCollapse,
  onSectionClick,
}: SectionOutlinePanelProps) {
  const handleSectionClick = useCallback(
    (id: V2SectionId) => {
      onSectionClick(id);
      // Scroll the document canvas section into view
      const el = document.getElementById(`v2-section-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [onSectionClick]
  );

  return (
    <aside
      className={cn(
        "border-agent-outline-variant bg-agent-surface-lowest flex shrink-0 flex-col overflow-hidden border-r transition-all duration-200",
        collapsed ? "w-12" : "w-52"
      )}
    >
      {/* Toggle button */}
      <div className="border-agent-outline-variant flex h-10 shrink-0 items-center border-b px-2">
        <button
          onClick={onToggleCollapse}
          className="text-agent-on-surface-variant hover:bg-agent-surface-container flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          title={collapsed ? "Expand outline" : "Collapse outline"}
          aria-label={collapsed ? "Expand outline" : "Collapse outline"}
        >
          <Icon
            name={collapsed ? "panelLeftOpen" : "panelLeftClose"}
            className="h-4 w-4"
          />
        </button>
        {!collapsed && (
          <span className="text-agent-on-surface-variant ml-2 text-xs font-medium tracking-wide uppercase opacity-70">
            Sections
          </span>
        )}
      </div>

      {/* Section list */}
      <nav
        className="flex flex-1 flex-col overflow-y-auto py-1.5"
        role="navigation"
        aria-label="Document sections"
      >
        {OUTLINE_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          const isHidden = hiddenSections.includes(item.id);

          return (
            <button
              key={item.id}
              onClick={() => handleSectionClick(item.id)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={cn(
                "flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm transition-all duration-100",
                collapsed ? "justify-center" : "",
                isActive
                  ? "bg-agent-primary-container text-agent-on-primary-container"
                  : isHidden
                    ? "text-agent-on-surface-variant opacity-40 hover:opacity-70"
                    : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
              )}
            >
              <Icon
                name={item.icon}
                className="h-4 w-4 shrink-0"
                color={
                  isActive
                    ? "var(--color-agent-on-primary-container)"
                    : isHidden
                      ? "var(--color-agent-on-surface-variant)"
                      : "var(--color-agent-on-surface-variant)"
                }
              />
              {!collapsed && (
                <>
                  <span className="flex-1 font-medium">{item.label}</span>
                  {isHidden && (
                    <Icon
                      name="eyeOff"
                      className="h-3 w-3 shrink-0 opacity-60"
                    />
                  )}
                  {isActive && !isHidden && (
                    <Icon
                      name="ChevronRight"
                      className="h-3.5 w-3.5 shrink-0"
                      color="var(--color-agent-on-primary-container)"
                    />
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
