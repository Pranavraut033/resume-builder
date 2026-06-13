"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";

import cn from "@/lib/cn";

type FieldType = "text" | "textarea" | "bullet";

interface InlineFieldProps {
  value: string;
  onChange: (value: string) => void;
  fieldType?: FieldType;
  placeholder?: string;
  className?: string;
  /** Extra classes applied only to the rendered (non-edit) display */
  displayClassName?: string;
  /** Render-prop for custom display (useful for styled spans) */
  renderDisplay?: (value: string) => React.ReactNode;
  disabled?: boolean;
}

/**
 * InlineField — click-to-edit wrapper.
 *
 * When unfocused it renders exactly as the surrounding template styles it.
 * When focused it overlays an <input> or <textarea> with identical sizing.
 * Blur or Enter commits; Escape cancels.
 */
export function InlineField({
  value,
  onChange,
  fieldType = "text",
  placeholder = "Click to edit…",
  className,
  displayClassName,
  renderDisplay,
  disabled = false,
}: InlineFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const startEdit = useCallback(() => {
    if (disabled) return;
    setDraft(value);
    setIsEditing(true);
  }, [disabled, value]);

  const commit = useCallback(() => {
    setIsEditing(false);
    if (draft !== value) onChange(draft);
  }, [draft, onChange, value]);

  const cancel = useCallback(() => {
    setIsEditing(false);
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      // Move cursor to end
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.selectionStart = inputRef.current.value.length;
        inputRef.current.selectionEnd = inputRef.current.value.length;
      }
    }
  }, [isEditing]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
      if (e.key === "Enter" && fieldType !== "textarea") {
        e.preventDefault();
        commit();
      }
    },
    [cancel, commit, fieldType]
  );

  const sharedEditClasses =
    "w-full bg-transparent outline-none ring-1 ring-agent-primary rounded-sm px-0.5 -mx-0.5 resize-none";

  if (isEditing) {
    if (fieldType === "textarea" || fieldType === "bullet") {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={Math.max(2, draft.split("\n").length)}
          className={cn(sharedEditClasses, className)}
          style={{ minHeight: "1.5em", lineHeight: "inherit", font: "inherit" }}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(sharedEditClasses, className)}
        style={{ font: "inherit" }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={startEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") startEdit();
      }}
      title={disabled ? undefined : "Click to edit"}
      aria-label={disabled ? undefined : `Edit: ${value || placeholder}`}
      className={cn(
        // Render as plain inline text so it flows exactly like the value it
        // replaces — inline-block here collapses to min-width inside the
        // templates' block layout and breaks wrapping.
        "box-decoration-clone cursor-text rounded-sm transition-all duration-100",
        !disabled &&
          "hover:ring-agent-primary/40 hover:bg-agent-primary/5 hover:ring-1",
        !value && "text-agent-on-surface-variant opacity-50",
        className,
        displayClassName
      )}
    >
      {renderDisplay
        ? renderDisplay(value)
        : value || <span className="italic opacity-50">{placeholder}</span>}
    </span>
  );
}
