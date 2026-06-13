"use client";

import { useRef, useState, useEffect } from "react";

import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";
import cn from "@/lib/cn";
import { AVAILABLE_TEMPLATES, TemplateType } from "@/types/customization";

/**
 * TemplatePicker — compact toolbar popover listing all available templates.
 * Selecting one immediately calls updateCustomizationState (font + template).
 */
export function TemplatePicker() {
  const { customization, updateCustomizationState } = useJobPageContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentTemplate = AVAILABLE_TEMPLATES.find(
    (t) => t.id === customization.template
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
          open
            ? "bg-agent-primary text-agent-on-primary"
            : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
        )}
        aria-label="Switch template"
        aria-expanded={open}
      >
        <Icon name="layout" className="h-3.5 w-3.5" />
        <span>{currentTemplate?.name ?? "Template"}</span>
        <Icon name={open ? "chevronUp" : "chevronDown"} className="h-3 w-3" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full right-0 z-50 mt-1.5 w-72",
            "border-agent-outline-variant bg-agent-surface-lowest shadow-agent-modal rounded-xl border",
            "animate-in fade-in slide-in-from-top-1 duration-150"
          )}
        >
          <div className="border-agent-outline-variant border-b px-3 py-2">
            <p className="text-agent-on-surface text-xs font-semibold">
              Choose a template
            </p>
          </div>
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto p-2">
            {AVAILABLE_TEMPLATES.map((template) => {
              const isActive = customization.template === template.id;
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    updateCustomizationState({
                      template: template.id as TemplateType,
                      fontFamily: template.fontFamily,
                    });
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-all",
                    isActive
                      ? "bg-agent-primary-container text-agent-on-primary-container"
                      : "hover:bg-agent-surface-container text-agent-on-surface-variant hover:text-agent-on-surface"
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="text-sm font-medium">{template.name}</span>
                    {isActive && (
                      <Icon
                        name="check"
                        className="ml-auto h-3.5 w-3.5 shrink-0"
                      />
                    )}
                  </div>
                  <span className="line-clamp-1 text-xs opacity-70">
                    {template.description}
                  </span>
                  <span className="mt-0.5 text-[10px] opacity-50">
                    Best for: {template.bestFor}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
