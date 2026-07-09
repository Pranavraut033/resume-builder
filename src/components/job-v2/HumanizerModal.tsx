"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { HumanizerJSON } from "@/types/humanizer";

type HumanizerChange = HumanizerJSON["changes"][number];

interface HumanizerModalProps {
  isOpen: boolean;
  isLoading: boolean;
  changes: HumanizerChange[];
  onAccept: (selected: HumanizerChange[]) => void;
  onClose: () => void;
}

export function HumanizerModal({
  isOpen,
  isLoading,
  changes,
  onAccept,
  onClose,
}: HumanizerModalProps) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(changes.map((_, i) => i))
  );

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Humanize"
      size="lg"
      cancelLabel="Reject"
      primaryActionLabel={`Apply selected (${selected.size})`}
      primaryAction={
        isLoading || changes.length === 0
          ? undefined
          : () => onAccept(changes.filter((_, i) => selected.has(i)))
      }
    >
      {isLoading ? (
        <div className="text-agent-on-surface-variant flex items-center justify-center gap-2 py-12 text-sm">
          <Icon name="spinner" className="h-4 w-4 animate-spin" />
          Humanizing…
        </div>
      ) : changes.length === 0 ? (
        <p className="text-agent-on-surface-variant py-8 text-center text-sm">
          Already reads naturally — no changes suggested.
        </p>
      ) : (
        <ul className="max-h-[60vh] space-y-3 overflow-y-auto">
          {changes.map((change, i) => (
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
          ))}
        </ul>
      )}
    </Modal>
  );
}
