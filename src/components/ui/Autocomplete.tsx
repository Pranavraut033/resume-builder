/**
 * Autocomplete Component
 *
 * A flexible autocomplete/combobox component with:
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Mouse interaction (click, hover)
 * - Scroll handling
 * - Search filtering
 * - Empty state
 * - Loading state
 * - Custom render options
 */

"use client";

import clsx from "clsx";
import { useState, useRef, useEffect, useCallback } from "react";

import { Icon } from "./Icon";

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
}

export interface AutocompleteProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  className?: string;
  maxHeight?: number;
  searchable?: boolean;
  renderOption?: (
    option: AutocompleteOption,
    isSelected: boolean
  ) => React.ReactNode;
}

export function Autocomplete({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  disabled = false,
  loading = false,
  emptyText = "No options available",
  className = "",
  maxHeight = 256,
  searchable = true,
  renderOption,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter options based on search query
  const filteredOptions = searchable
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          option.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
          option.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Get selected option label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || "";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [highlightedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : prev
            );
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          }
          break;

        case "Enter":
          e.preventDefault();
          if (isOpen && highlightedIndex >= 0) {
            onChange(filteredOptions[highlightedIndex].value);
            setIsOpen(false);
            setSearchQuery("");
            setHighlightedIndex(-1);
          } else if (!isOpen) {
            setIsOpen(true);
          }
          break;

        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery("");
          setHighlightedIndex(-1);
          inputRef.current?.blur();
          break;

        case "Tab":
          setIsOpen(false);
          setSearchQuery("");
          setHighlightedIndex(-1);
          break;
      }
    },
    [disabled, isOpen, highlightedIndex, filteredOptions, onChange]
  );

  // Handle option selection
  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle input focus
  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  // Handle input change (search)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setHighlightedIndex(-1);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen && searchable ? searchQuery : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          placeholder={placeholder}
          className={clsx(
            "w-full rounded-lg border bg-white px-4 py-2.5 pr-10 text-sm transition-colors",
            "focus:ring-2 focus:ring-blue-500 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-gray-800 dark:text-white",
            disabled || loading
              ? "border-gray-200 dark:border-gray-700"
              : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
          )}
        />

        {/* Icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          {loading ? (
            <Icon
              name="spinner"
              className="h-4 w-4 animate-spin text-gray-400"
            />
          ) : (
            <Icon
              name={isOpen ? "chevronUp" : "chevronDown"}
              className="h-4 w-4 text-gray-400"
            />
          )}
        </div>
      </div>

      {/* Dropdown List */}
      {isOpen && !loading && (
        <div
          className={clsx(
            "absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg",
            "dark:border-gray-700 dark:bg-gray-800"
          )}
          style={{ maxHeight: `${maxHeight}px` }}
        >
          <div
            ref={listRef}
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {filteredOptions.length === 0 ? (
              // Empty State
              <div className="flex items-center justify-center px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
                <Icon name="search" className="mr-2 h-4 w-4" />
                {emptyText}
              </div>
            ) : (
              // Options List
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectOption(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={clsx(
                      "w-full px-4 py-2.5 text-left transition-colors",
                      "focus:outline-none",
                      isSelected && "bg-blue-50 dark:bg-blue-900/20",
                      isHighlighted &&
                        !isSelected &&
                        "bg-gray-100 dark:bg-gray-700",
                      !isSelected &&
                        !isHighlighted &&
                        "dark:hover:bg-gray-750 hover:bg-gray-50"
                    )}
                  >
                    {renderOption ? (
                      renderOption(option, isSelected)
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {option.label}
                          </div>
                          {option.description && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {option.description}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Icon
                            name="check"
                            className="ml-2 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                          />
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
