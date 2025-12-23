/**
 * Export Dropdown Button Component
 * Provides a dropdown menu with export options (PDF, JSON, etc.)
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";

type IconName = React.ComponentProps<typeof Icon>["name"];

interface ExportOption {
  label: string;
  icon: IconName;
  description: string;
  onExport: () => void;
  disabled?: boolean;
}

interface ExportDropdownProps {
  options: ExportOption[];
  defaultLabel?: string;
  defaultIcon?: IconName;
}

export function ExportDropdown({
  options,
  defaultLabel = "Export",
  defaultIcon = "download",
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleExport = (onExport: () => void) => {
    onExport();
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex gap-1">
        {/* Main button - export with first option */}
        <Button
          variant="secondary"
          onClick={() => handleExport(options[0].onExport)}
          disabled={options[0].disabled}
          icon={<Icon name={defaultIcon} />}
          title={options[0].description}
        >
          {defaultLabel}
        </Button>

        {/* Dropdown toggle button */}
        {options.length > 1 && (
          <Button
            variant="secondary"
            onClick={() => setIsOpen(!isOpen)}
            disabled={options.every((opt) => opt.disabled)}
            title="More export options"
            className="px-2"
          >
            <Icon name="chevronDown" />
          </Button>
        )}
      </div>

      {/* Dropdown menu */}
      {isOpen && options.length > 1 && (
        <div className="absolute top-full mt-1 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-56">
          <div className="py-1">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleExport(option.onExport)}
                disabled={option.disabled}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                title={option.description}
              >
                <Icon name={option.icon} className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
