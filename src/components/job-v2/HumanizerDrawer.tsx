"use client";

import { useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import useHumanizeContent from "@/hooks/useHumanizeContent";
import { useModelStore } from "@/store/modelStore";
import { HumanizerJSON } from "@/types/humanizer";

import { SideDrawer } from "./SideDrawer";

type HumanizerChange = HumanizerJSON["changes"][number];

interface HumanizerDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Text to humanize, read fresh at the moment "Start" is clicked. */
  text: string;
  onAccept: (selected: HumanizerChange[]) => void;
}

const isNoop = (change: HumanizerChange) =>
  change.original.trim() === change.replacement.trim();

/**
 * HumanizerDrawer — slides in from the right like ATSDrawer/HistoryDrawer.
 * Opens on a splash screen (what it does + model picker + Start), then shows
 * the change list once humanizing finishes. Resets to the splash every time
 * it's closed so reopening always starts fresh.
 */
export function HumanizerDrawer({
  open,
  onClose,
  text,
  onAccept,
}: HumanizerDrawerProps) {
  const activeModelPair = useModelStore((s) => s.activeModelPair);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const {
    mutate: humanize,
    data,
    status,
    error,
    reset,
  } = useHumanizeContent({
    onSuccess: (result) => {
      setSelected(
        new Set(
          result.result.changes
            .map((c, i) => (isNoop(c) ? -1 : i))
            .filter((i) => i !== -1)
        )
      );
    },
  });

  const isLoading = status === "pending";
  const changes = data?.result.changes ?? [];
  const realChanges = changes.filter((c) => !isNoop(c));
  const noopChanges = changes.filter(isNoop);

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const handleStart = () => {
    humanize({ text });
  };

  return (
    <SideDrawer
      open={open}
      onClose={handleClose}
      icon="wand"
      title="Humanize"
      footer={
        status === "success" && realChanges.length > 0 ? (
          <div className="border-agent-outline-variant flex justify-end gap-2 border-t px-4 py-3">
            <button
              onClick={handleClose}
              className="text-agent-on-surface-variant hover:bg-agent-surface-container rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => {
                onAccept(
                  changes.filter((c, i) => selected.has(i) && !isNoop(c))
                );
                handleClose();
              }}
              className="bg-agent-primary text-agent-on-primary rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
            >
              Apply selected ({selected.size})
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="flex-1 overflow-y-auto p-4">
        {status === "idle" && (
          <div className="flex flex-col gap-4">
            <div className="text-agent-on-surface-variant flex items-start gap-3 text-sm">
              <Icon
                name="wand"
                className="text-agent-primary mt-0.5 h-5 w-5 shrink-0"
              />
              <p>
                Rewrites AI-sounding phrasing — inflated verbs, filler adverbs,
                uniform bullet rhythm — into plain, natural wording. Every fact,
                metric, and technical detail is kept exactly as written; you
                review and pick which rewrites to keep.
              </p>
            </div>

            <ModelSelector label="Select model" variant="compact" />

            <button
              onClick={handleStart}
              disabled={!text.trim() || !activeModelPair}
              className="bg-agent-primary text-agent-on-primary flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="wand" className="h-4 w-4" />
              Start
            </button>
            {!activeModelPair && (
              <p className="text-agent-on-surface-variant text-xs">
                Select a model above to continue.
              </p>
            )}
          </div>
        )}

        {isLoading && (
          <div className="text-agent-on-surface-variant flex items-center justify-center gap-2 py-12 text-sm">
            <Icon name="spinner" className="h-4 w-4 animate-spin" />
            Humanizing…
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-3">
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{
                background: "var(--color-agent-error-container)",
                color: "var(--color-agent-on-error-container)",
              }}
            >
              {error instanceof Error
                ? error.message
                : "Something went wrong while humanizing this text."}
            </div>
            <button
              onClick={handleStart}
              className="bg-agent-primary text-agent-on-primary flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            >
              <Icon name="wand" className="h-4 w-4" />
              Try again
            </button>
          </div>
        )}

        {status === "success" && realChanges.length === 0 && (
          <p className="text-agent-on-surface-variant py-8 text-center text-sm">
            This already sounds human.
          </p>
        )}

        {status === "success" && realChanges.length > 0 && (
          <ul className="space-y-3">
            {noopChanges.map((change, i) => (
              <li
                key={`noop-${i}`}
                className="border-agent-outline-variant bg-agent-surface-lowest rounded-lg border p-3"
              >
                <p className="text-agent-on-surface-variant mb-1 text-xs font-medium">
                  Already sounds human
                </p>
                <p className="text-agent-on-surface text-sm">
                  {change.original}
                </p>
              </li>
            ))}
            {realChanges.map((change) => {
              const i = changes.indexOf(change);
              return (
                <li
                  key={i}
                  className="border-agent-outline-variant bg-agent-surface-lowest rounded-lg border p-3"
                >
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                      className="mt-1 shrink-0"
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="text-agent-on-surface-variant mb-1 text-xs font-medium">
                        {change.reason}
                      </p>
                      <p className="mb-1 text-red-600 line-through">
                        {change.original}
                      </p>
                      <p className="text-green-700">{change.replacement}</p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SideDrawer>
  );
}
