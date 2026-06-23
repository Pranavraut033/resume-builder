"use client";

import { useRef, useState, useCallback, useLayoutEffect } from "react";

import cn from "@/lib/cn";

interface BulletListFieldProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  className?: string;
}

/**
 * BulletListField — notion-style bullet editor.
 * Each bullet is an individual text input that looks like a <p>.
 * Enter → new bullet below. Backspace at col 0 → merge with prev or delete.
 * Delete at end → merge with next. Commits on structural changes and blur.
 */
export function BulletListField({
  items,
  onChange,
  placeholder = "Add a bullet point…",
  className,
}: BulletListFieldProps) {
  const [bullets, setBullets] = useState<string[]>(
    items.length > 0 ? [...items] : [""]
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    inputRefs.current.forEach((el) => el && resize(el));
  }, [bullets]);

  const commit = useCallback(
    (next: string[]) => onChange(next.filter(Boolean)),
    [onChange]
  );

  const focus = (index: number, atEnd = true) => {
    setTimeout(() => {
      const el = inputRefs.current[index];
      if (!el) return;
      el.focus();
      const pos = atEnd ? el.value.length : 0;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleChange = (i: number, value: string) => {
    const next = [...bullets];
    next[i] = value;
    setBullets(next);
    // ponytail: defer commit to blur/structural ops — avoids thrashing parent on every keystroke
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      commit(bullets);
    }
  };

  // const insertAfter = (i: number, value = "") => {
  //   const next = [...bullets];
  //   next.splice(i + 1, 0, value);
  //   setBullets(next);
  //   commit(next);
  //   focus(i + 1, false);
  // };

  const removeAt = (i: number, focusPrev: boolean) => {
    if (bullets.length === 1) {
      setBullets([""]);
      commit([]);
      return;
    }
    const next = bullets.filter((_, idx) => idx !== i);
    setBullets(next);
    commit(next);
    focus(focusPrev ? Math.max(0, i - 1) : Math.min(next.length - 1, i));
  };

  const mergeUp = (i: number) => {
    if (i === 0) return;
    const caretPos = bullets[i - 1].length;
    const next = [...bullets];
    next[i - 1] = bullets[i - 1] + bullets[i];
    next.splice(i, 1);
    setBullets(next);
    commit(next);
    setTimeout(() => {
      const el = inputRefs.current[i - 1];
      if (!el) return;
      el.focus();
      el.setSelectionRange(caretPos, caretPos);
    }, 0);
  };

  const mergeDown = (i: number) => {
    if (i >= bullets.length - 1) return;
    const caretPos = bullets[i].length;
    const next = [...bullets];
    next[i] = bullets[i] + bullets[i + 1];
    next.splice(i + 1, 1);
    setBullets(next);
    commit(next);
    setTimeout(() => {
      const el = inputRefs.current[i];
      if (!el) return;
      el.focus();
      el.setSelectionRange(caretPos, caretPos);
    }, 0);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    i: number
  ) => {
    const el = e.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd =
      el.selectionStart === el.value.length &&
      el.selectionEnd === el.value.length;

    if (e.key === "Enter") {
      e.preventDefault();
      // Split the current bullet at cursor
      const before = el.value.slice(0, el.selectionStart ?? el.value.length);
      const after = el.value.slice(el.selectionEnd ?? el.value.length);
      const next = [...bullets];
      next[i] = before;
      next.splice(i + 1, 0, after);
      setBullets(next);
      commit(next);
      focus(i + 1, false);
    } else if (e.key === "Backspace" && atStart) {
      e.preventDefault();
      if (bullets[i] === "") {
        removeAt(i, true);
      } else {
        mergeUp(i);
      }
    } else if (e.key === "Delete" && atEnd) {
      e.preventDefault();
      mergeDown(i);
    } else if (e.key === "Escape") {
      el.blur();
    }
  };

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      className={cn(
        "group/bullets rounded-sm ring-1 ring-transparent transition-all duration-100",
        "focus-within:ring-agent-primary hover:ring-agent-primary/40",
        className
      )}
    >
      {bullets.map((bullet, i) => (
        <div key={i} className="flex items-baseline gap-1.5 px-0.5">
          <span
            className="text-agent-on-surface-variant shrink-0 select-none"
            style={{ font: "inherit" }}
          >
            •
          </span>
          <textarea
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            rows={1}
            value={bullet}
            placeholder={i === 0 && bullets.length === 1 ? placeholder : ""}
            onChange={(e) => {
              handleChange(i, e.target.value);
              resize(e.target);
            }}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className="w-full resize-none bg-transparent outline-none"
            style={{ font: "inherit", overflowY: "hidden" }}
          />
        </div>
      ))}
    </div>
  );
}
