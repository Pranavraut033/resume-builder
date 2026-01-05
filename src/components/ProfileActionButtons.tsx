"use client";

import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface ProfileActionButtonsProps {
  onImportResume: () => void;
  onImportJSON: () => void;
  onExportJSON: () => void;
  onSave: () => void;
  isSaving?: boolean;
  isExporting?: boolean;
}

export function ProfileActionButtons({
  onImportResume,
  onImportJSON,
  onExportJSON,
  onSave,
  isSaving = false,
  isExporting = false,
}: ProfileActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <Menu as="div" className="relative inline-block text-left">
        <MenuButton as={Button} variant="secondary">
          Actions
        </MenuButton>

        <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg focus:outline-none dark:border-gray-700 dark:bg-gray-800">
          <div className="py-1">
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={onImportResume}
                  className={cn(
                    "block w-full px-4 py-2 text-left text-sm whitespace-nowrap",
                    active
                      ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                      : "text-gray-700 dark:text-gray-300"
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
                      ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                      : "text-gray-700 dark:text-gray-300"
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
                  disabled={isExporting}
                  className={cn(
                    "block w-full px-4 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50",
                    active
                      ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                      : "text-gray-700 dark:text-gray-300"
                  )}
                >
                  Export as JSON
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
