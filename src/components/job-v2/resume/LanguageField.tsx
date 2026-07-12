"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Language } from "@/types/resume";

import { useInlineEdit } from "./InlineEditContext";
import { InlineField } from "./InlineField";

const LEVELS = [
  "Native",
  "Fluent",
  "Advanced",
  "Intermediate",
  "Conversational",
  "Basic",
];

interface LanguageFieldProps {
  language: Language;
  onUpdate: (patch: Partial<Language>) => void;
  onRemove: () => void;
}

const hoverClass =
  "cursor-text rounded-sm transition-all duration-100 px-0.5 -mx-0.5 " +
  "hover:ring-1 hover:ring-agent-primary/40 hover:bg-agent-primary/5";

const editClass =
  "bg-transparent outline-none ring-1 ring-agent-primary rounded-sm px-0.5 -mx-0.5";

/** Proficiency: shows text until clicked, then shows a select or free-text input. */
function ProficiencyField({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [customMode, setCustomMode] = useState(
    value !== "" && !LEVELS.includes(value)
  );
  const [draft, setDraft] = useState(value);
  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      customMode ? inputRef.current?.focus() : selectRef.current?.focus();
    }
  }, [editing, customMode]);

  const commit = useCallback(
    (v: string) => {
      setEditing(false);
      if (v !== value) onCommit(v);
    },
    [onCommit, value]
  );

  if (editing) {
    if (customMode) {
      return (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
          placeholder="Level"
          style={{
            font: "inherit",
            width: `${Math.max(draft.length, 5)}ch`,
          }}
          className={editClass}
        />
      );
    }

    return (
      <select
        ref={selectRef}
        value={LEVELS.includes(value) ? value : ""}
        onChange={(e) => {
          if (e.target.value === "__custom__") {
            setCustomMode(true);
            setDraft("");
            onCommit("");
          } else {
            commit(e.target.value);
          }
        }}
        onBlur={() => setEditing(false)}
        style={{ font: "inherit" }}
        className="cursor-pointer bg-transparent outline-none"
      >
        <option value="" disabled>
          Select…
        </option>
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
        <option value="__custom__">Custom…</option>
      </select>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setDraft(value);
          setEditing(true);
        }
      }}
      className={hoverClass}
    >
      {value || <span className="italic opacity-40">Level</span>}
    </span>
  );
}

export function LanguageField({
  language,
  onUpdate,
  onRemove,
}: LanguageFieldProps) {
  const { editable } = useInlineEdit();

  if (!editable) {
    return (
      <span>
        {language.name}
        {language.proficiency ? ` (${language.proficiency})` : ""}
      </span>
    );
  }

  return (
    <span className="group/lang inline-flex items-baseline gap-0">
      <InlineField
        value={language.name}
        onChange={(v) => onUpdate({ name: v })}
        placeholder="Language"
      />
      <span className="opacity-50 select-none">{" ("}</span>
      <ProficiencyField
        value={language.proficiency}
        onCommit={(v) => onUpdate({ proficiency: v })}
      />
      <span className="opacity-50 select-none">{")"}</span>
      <button
        type="button"
        onClick={onRemove}
        title="Remove"
        className="text-agent-on-surface-variant ml-0.5 leading-none opacity-0 transition-opacity group-hover/lang:opacity-40 hover:text-red-500 hover:!opacity-100"
      >
        ×
      </button>
    </span>
  );
}
