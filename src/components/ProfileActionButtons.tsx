"use client";

import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface ProfileActionButtonsProps {
  onImportResume: () => void;
  onImportJSON: () => void;
  onExportJSON: () => void;
  onExportTXT: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function ProfileActionButtons({
  onImportResume,
  onImportJSON,
  onExportJSON,
  onExportTXT,
  onSave,
  isSaving = false,
}: ProfileActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <Menu as="div" className="relative inline-flex text-left">
        <MenuButton as={Button} variant="secondary">
          Actions
        </MenuButton>

        <MenuItems className="border-agent-outline-variant bg-agent-surface absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg border shadow-(--shadow-agent-card) focus:outline-none">
          <div className="py-1">
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onImportResume}
                  className={cn(
                    "block w-full px-4 py-2 text-left text-sm whitespace-nowrap",
                    active
                      ? "bg-agent-surface-low text-agent-on-surface"
                      : "text-agent-on-surface-variant"
                  )}
                >
                  Import from Resume
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onImportJSON}
                  className={cn(
                    "block w-full px-4 py-2 text-left text-sm",
                    active
                      ? "bg-agent-surface-low text-agent-on-surface"
                      : "text-agent-on-surface-variant"
                  )}
                >
                  Import from JSON
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onExportJSON}
                  className={cn(
                    "block w-full px-4 py-2 text-left text-sm",
                    active
                      ? "bg-agent-surface-low text-agent-on-surface"
                      : "text-agent-on-surface-variant"
                  )}
                >
                  Export as JSON
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onExportTXT}
                  className={cn(
                    "block w-full px-4 py-2 text-left text-sm",
                    active
                      ? "bg-agent-surface-low text-agent-on-surface"
                      : "text-agent-on-surface-variant"
                  )}
                >
                  Export as TXT
                </button>
              )}
            </MenuItem>
          </div>
        </MenuItems>
      </Menu>

      <Button onClick={onSave} disabled={isSaving} variant="primary">
        {isSaving ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}
