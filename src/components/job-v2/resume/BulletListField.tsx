"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import cn from "@/lib/cn";

interface BulletListFieldProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  className?: string;
  /** Identifies one logical bullet list shown as several slices (one per
   * paginator block). Lets the caret follow a bullet into another slice. */
  focusKey?: string;
  /** `[start, end)` — render only these bullets of `items` (the FULL list).
   * Edits still operate on the whole list, so Enter/Backspace/Delete work
   * across slice boundaries. */
  window?: [number, number];
}

type Caret = number | "start" | "end";

/** Caret request that outlives the field that made it: after a structural
 * edit the target bullet may be rendered by another slice's field (which
 * remounts with the committed list). */
let pendingFocus: { key: string; index: number; caret: Caret } | null = null;
const setPendingFocus = (next: typeof pendingFocus) => {
  pendingFocus = next;
};

const placeCaret = (el: HTMLTextAreaElement, caret: Caret) => {
  el.focus();
  const pos = caret === "end" ? el.value.length : caret === "start" ? 0 : caret;
  el.setSelectionRange(pos, pos);
};

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
  focusKey,
  window: range,
}: BulletListFieldProps) {
  const [bullets, setBullets] = useState<string[]>(
    items.length > 0 ? [...items] : [""]
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const inWindow = (i: number) => !range || (i >= range[0] && i < range[1]);

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    inputRefs.current.forEach((el) => el && resize(el));
  }, [bullets]);

  // Re-measure when the column width or web font changes after mount —
  // otherwise a wrapped bullet stays one row tall and its last line is
  // clipped from the preview.
  useEffect(() => {
    const resizeAll = () => inputRefs.current.forEach((el) => el && resize(el));
    const ro = new ResizeObserver(resizeAll);
    if (containerRef.current) ro.observe(containerRef.current);
    // The resume font is injected by fontLoader after first paint, so
    // `fonts.ready` alone resolves too early.
    document.fonts?.ready.then(resizeAll);
    document.fonts?.addEventListener("loadingdone", resizeAll);
    return () => {
      ro.disconnect();
      document.fonts?.removeEventListener("loadingdone", resizeAll);
    };
  }, []);

  // A sliced list keeps a new empty bullet in the data until blur, so the
  // slice that will render it exists; blur drops empties.
  const commit = useCallback(
    (next: string[], final = false) =>
      onChange(range && !final ? next : next.filter(Boolean)),
    [onChange, range]
  );

  const focus = (index: number, caret: Caret) => {
    if (focusKey) setPendingFocus({ key: focusKey, index, caret });
    setTimeout(() => {
      const el = inputRefs.current[index];
      if (!el || !el.isConnected) return;
      placeCaret(el, caret);
      setPendingFocus(null);
    }, 0);
  };

  // Take a caret request made by a sibling slice (or by this field before it
  // remounted). Skip hidden measurement copies, which render the same field.
  useEffect(() => {
    if (!focusKey || pendingFocus?.key !== focusKey) return;
    const el = inputRefs.current[pendingFocus.index];
    if (!el || el.closest("[aria-hidden]")) return;
    placeCaret(el, pendingFocus.caret);
    setPendingFocus(null);
  });

  const handleChange = (i: number, value: string) => {
    const next = [...bullets];
    next[i] = value;
    setBullets(next);
    // ponytail: defer commit to blur/structural ops — avoids thrashing parent on every keystroke
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      commit(bullets, true);
    }
  };

  const removeAt = (i: number, focusPrev: boolean) => {
    if (bullets.length === 1) {
      setBullets([""]);
      commit([], true);
      return;
    }
    const next = bullets.filter((_, idx) => idx !== i);
    setBullets(next);
    commit(next);
    focus(focusPrev ? Math.max(0, i - 1) : Math.min(next.length - 1, i), "end");
  };

  const mergeUp = (i: number) => {
    if (i === 0) return;
    const caretPos = bullets[i - 1].length;
    const next = [...bullets];
    next[i - 1] = bullets[i - 1] + bullets[i];
    next.splice(i, 1);
    setBullets(next);
    commit(next);
    focus(i - 1, caretPos);
  };

  const mergeDown = (i: number) => {
    if (i >= bullets.length - 1) return;
    const caretPos = bullets[i].length;
    const next = [...bullets];
    next[i] = bullets[i] + bullets[i + 1];
    next.splice(i + 1, 1);
    setBullets(next);
    commit(next);
    focus(i, caretPos);
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
      focus(i + 1, "start");
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
      {bullets.map((bullet, i) =>
        inWindow(i) ? (
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
        ) : null
      )}
    </div>
  );
}
