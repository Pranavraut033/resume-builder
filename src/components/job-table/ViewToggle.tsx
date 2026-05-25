"use client";

import React from "react";

import { Icon } from "@/components/ui/Icon";

import type { ViewMode } from "./types";

export default function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  const options: Array<{
    value: ViewMode;
    label: string;
    icon: "grid" | "list";
  }> = [
    { value: "card", label: "Card", icon: "grid" },
    { value: "table", label: "Table", icon: "list" },
  ];

  return (
    <div
      className="inline-flex rounded-2xl p-1 shadow-sm"
      style={{
        background: "var(--color-agent-surface-low)",
        border: "1px solid var(--color-agent-outline-variant)",
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all"
          style={
            value === option.value
              ? {
                  background:
                    "linear-gradient(135deg, var(--color-agent-primary), var(--color-agent-primary-container))",
                  color: "var(--color-agent-on-primary)",
                }
              : {
                  color: "var(--color-agent-on-surface-variant)",
                }
          }
          aria-pressed={value === option.value}
        >
          <Icon name={option.icon} size={16} />
          {option.label}
        </button>
      ))}
    </div>
  );
}
