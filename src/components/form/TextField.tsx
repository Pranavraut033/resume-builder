/**
 * TextField Component
 * Reusable text input field for single-line text fields.
 * Used for name, title, company, etc.
 * AI generation happens at the panel level, not field level.
 */

"use client";


import { ReactNode } from "react";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  icon?: ReactNode;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  helpText,
  icon,
}: TextFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative rounded-lg">
        <div className="relative flex items-center">
          {icon && <div className="absolute left-3 text-gray-500">{icon}</div>}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
              icon ? "pl-10" : ""
            }`}
          />
        </div>
      </div>
      {helpText && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
}
