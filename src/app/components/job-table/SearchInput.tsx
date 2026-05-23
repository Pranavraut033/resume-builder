"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";

export default function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className="flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-sm transition-all focus-within:ring-2"
      style={{
        background: "var(--color-agent-surface-low)",
        border: "1px solid var(--color-agent-outline-variant)",
      }}
    >
      <Icon
        name="search"
        size={18}
        className="shrink-0"
        color="var(--color-agent-on-surface-variant)"
      />
      <span className="sr-only">Search jobs</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search company, role, or status"
        className="flex-1 border-none bg-transparent text-sm focus:outline-none"
        style={{
          color: "var(--color-agent-on-surface)",
        }}
      />
    </label>
  );
}
