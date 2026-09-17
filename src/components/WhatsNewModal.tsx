"use client";

import { MarkdownBlock, Modal } from "@/components/ui";
import { groupBullets } from "@/lib/releaseNotes";

import type { ReleaseNoteEntry } from "@/lib/releaseNotes.generated";

const isMac =
  typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

const GROUP_LABELS = [
  ["new", "New"],
  ["improved", "Improved"],
  ["fixed", "Fixed"],
] as const;

function ReleaseNoteSection({ entry }: { entry: ReleaseNoteEntry }) {
  const grouped = groupBullets(entry.bullets);
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-agent-on-surface text-base font-semibold">
          v{entry.version}
          <span className="text-agent-on-surface-variant ml-2 text-sm font-normal">
            {entry.date}
          </span>
        </h3>
        {entry.summary && (
          <p className="text-agent-on-surface-variant text-sm">
            {entry.summary}
          </p>
        )}
      </div>
      {GROUP_LABELS.map(([key, label]) =>
        grouped[key].length > 0 ? (
          <div key={key}>
            <h4 className="text-agent-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              {label}
            </h4>
            <ul className="mt-1 space-y-1">
              {grouped[key].map((bullet, i) => (
                <li key={i}>
                  <MarkdownBlock content={bullet} />
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
    </div>
  );
}

export function WhatsNewModal({
  isOpen,
  onClose,
  entries,
}: {
  isOpen: boolean;
  onClose: () => void;
  entries: ReleaseNoteEntry[];
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="What's new"
      cancelLabel="Close"
      size="lg"
    >
      <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className="text-agent-on-surface-variant text-sm">
            No release notes to show yet.
          </p>
        ) : (
          entries.map((entry) => (
            <ReleaseNoteSection key={entry.version} entry={entry} />
          ))
        )}
        {isMac && (
          <p className="text-agent-on-surface-variant border-agent-outline-variant border-t pt-3 text-xs">
            macOS will ask for keychain access again after this update —
            that&apos;s expected.
          </p>
        )}
      </div>
    </Modal>
  );
}
