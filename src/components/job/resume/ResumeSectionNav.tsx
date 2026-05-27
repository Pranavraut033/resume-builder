"use client";

import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";

export type SectionId =
  | "personal"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications";

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ComponentProps<typeof Icon>["name"];
}

const NAV_ITEMS: NavItem[] = [
  { id: "personal", label: "Personal Info", icon: "user" },
  { id: "summary", label: "Summary", icon: "fileText" },
  { id: "experience", label: "Experience", icon: "Briefcase" },
  { id: "education", label: "Education", icon: "GraduationCap" },
  { id: "skills", label: "Skills", icon: "Tag" },
  { id: "projects", label: "Projects", icon: "Code2" },
  { id: "certifications", label: "Certifications", icon: "Award" },
];

interface ResumeSectionNavProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}

export function ResumeSectionNav({
  activeSection,
  onSectionChange,
}: ResumeSectionNavProps) {
  const { resumeMeta } = useJobPageContext();
  return (
    <nav
      className="flex w-56 shrink-0 flex-col border-r"
      style={{
        background: "var(--color-agent-surface-lowest)",
        borderColor: "var(--color-agent-outline-variant)",
      }}
    >
      {/* Header */}
      <div
        className="border-agent-outline-variant flex items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--color-agent-outline-variant)" }}
      >
        <Icon name="fileText" className="h-4 w-4" />
        <div>
          <p
            className="text-xs"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Last edited: {resumeMeta.updatedAt.toLocaleString()}
          </p>
        </div>
      </div>
      {/* Section list */}
      <div className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
              style={
                isActive
                  ? {
                      background: "var(--color-agent-primary-container)",
                      color: "var(--color-agent-on-primary-container)",
                    }
                  : {
                      color: "var(--color-agent-on-surface-variant)",
                    }
              }
            >
              <Icon
                name={item.icon}
                className="h-4 w-4 shrink-0"
                color={
                  isActive
                    ? "var(--color-agent-on-primary-container)"
                    : "var(--color-agent-on-surface-variant)"
                }
              />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <Icon
                  name="ChevronRight"
                  className="ml-auto h-3.5 w-3.5 shrink-0"
                  color="var(--color-agent-on-primary-container)"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer actions */}
      <div
        className="space-y-1 border-t px-4 py-3"
        style={{ borderColor: "var(--color-agent-outline-variant)" }}
      >
        <button
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-(--color-agent-surface-container)"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          Add Section
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-(--color-agent-surface-container)"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          <Icon name="HelpCircle" className="h-3.5 w-3.5" />
          Help Center
        </button>
      </div>
    </nav>
  );
}
