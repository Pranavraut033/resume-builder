"use client";

import { Combobox, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";

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
            .includes(query.toLowerCase().replace(/\s+/g, ""))
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
            className={`w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-gray-900 focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-1">
              {value.map((v) => (
                <span
                  key={v}
                  className="flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-sm dark:bg-gray-600"
                >
                  <span className="max-w-xs truncate">{v}</span>
                  <button
                    type="button"
                    onClick={() => !disabled && removeTag(v)}
                    className="ml-2 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed dark:hover:text-gray-300"
                    disabled={disabled}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </span>
              ))}
              <Combobox.Input
                className="min-w-[160px] flex-1 bg-transparent px-2 py-1 outline-none disabled:cursor-not-allowed"
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
          <Combobox.Options className="ring-opacity-5 absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black focus:outline-none sm:text-sm dark:bg-gray-700">
            {filteredOptions.length === 0 && query !== "" ? (
              <div className="relative cursor-default px-4 py-2 text-gray-700 select-none dark:text-gray-300">
                Nothing found.
              </div>
            ) : (
              filteredOptions.map((option) => (
                <Combobox.Option
                  key={option}
                  className={({ active }) =>
                    `relative cursor-default py-2 pr-4 pl-10 select-none ${active ? "bg-primary-600 text-white" : "text-gray-900 dark:text-white"}`
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
