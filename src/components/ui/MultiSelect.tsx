"use client";

import { Fragment, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { Icon } from "./Icon";

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Search and select options",
  className = "",
  disabled = false,
}: MultiSelectProps) {
  const [query, setQuery] = useState("");

  const filteredOptions =
    query === ""
      ? options
      : options.filter((option) =>
          option
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, "")),
        );

  const toggleOption = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  const removeTag = (opt: string) => onChange(value.filter((v) => v !== opt));

  return (
    <div className={`relative ${className}`}>
      <Combobox
        value={null}
        onChange={(val) => val && !disabled && toggleOption(val)}
        disabled={disabled}
      >
        <div className="relative">
          <div
            className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex flex-wrap gap-1 items-center">
              {value.map((v) => (
                <span
                  key={v}
                  className="flex items-center bg-gray-100 dark:bg-gray-600 text-sm rounded-full px-2 py-0.5"
                >
                  <span className="truncate max-w-xs">{v}</span>
                  <button
                    type="button"
                    onClick={() => !disabled && removeTag(v)}
                    className="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:cursor-not-allowed"
                    disabled={disabled}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </span>
              ))}
              <Combobox.Input
                className="flex-1 min-w-[160px] py-1 px-2 bg-transparent outline-none disabled:cursor-not-allowed"
                displayValue={() => ""}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={value.length === 0 ? placeholder : ""}
                disabled={disabled}
              />
            </div>
          </div>
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <Icon name="chevronDown" size={16} className="text-gray-400" />
          </Combobox.Button>
        </div>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery("")}
        >
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredOptions.length === 0 && query !== "" ? (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                Nothing found.
              </div>
            ) : (
              filteredOptions.map((option) => (
                <Combobox.Option
                  key={option}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? "bg-primary-600 text-white" : "text-gray-900 dark:text-white"}`
                  }
                  value={option}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={`block truncate ${selected ? "font-medium" : "font-normal"}`}
                      >
                        {option}
                      </span>
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? "text-white" : "text-primary-600"}`}
                      >
                        {value.includes(option) ? (
                          <Icon name="check" size={16} />
                        ) : null}
                      </span>
                    </>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Transition>
      </Combobox>
    </div>
  );
}

export default MultiSelect;
