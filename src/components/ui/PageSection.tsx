import { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface PageSectionProps {
  title: string;
  /** Optional icon shown before the title */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Labelled page-level section with a consistent heading style.
 * Wraps content in a rounded surface-low container.
 *
 * @example
 * <PageSection title="Cloud LLM Providers">
 *   <div className="grid grid-cols-2 gap-4">…</div>
 * </PageSection>
 *
 * @example with icon
 * <PageSection title="Security" icon={<ShieldIcon />}>
 *   …
 * </PageSection>
 */
export function PageSection({
  title,
  icon,
  children,
  className,
}: PageSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <h2 className="text-agent-on-surface flex items-center gap-2 text-base font-semibold">
        {icon && (
          <span className="text-agent-primary flex shrink-0 items-center">
            {icon}
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

interface SurfacePanelProps {
  children: ReactNode;
  className?: string;
  /** Stack children with consistent vertical spacing */
  stack?: boolean;
}

/**
 * Rounded surface-low panel used inside PageSections.
 * A lightweight alternative to Card when you need the softer background.
 *
 * @example
 * <PageSection title="Local LLM">
 *   <SurfacePanel>…</SurfacePanel>
 * </PageSection>
 */
export function SurfacePanel({
  children,
  className,
  stack,
}: SurfacePanelProps) {
  return (
    <div
      className={cn(
        "bg-agent-surface-low rounded-2xl p-5",
        stack && "space-y-5",
        className
      )}
    >
      {children}
    </div>
  );
}
