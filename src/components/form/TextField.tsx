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
      <label
        className="block text-sm font-medium"
        style={{ color: "var(--color-agent-on-surface)" }}
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: "var(--color-agent-error)" }}>
            *
          </span>
        )}
      </label>

      <div className="relative rounded-lg">
        <div className="relative flex items-center">
          {icon && (
            <div
              className="absolute left-3"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              {icon}
            </div>
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className={`w-full rounded-lg border px-3 py-2 transition-colors focus:ring-2 focus:outline-none ${
              icon ? "pl-10" : ""
            }`}
            style={{
              borderColor: "var(--color-agent-outline-variant)",
              background: "var(--color-agent-surface-lowest)",
              color: "var(--color-agent-on-surface)",
              boxShadow: "none",
              caretColor: "var(--color-agent-primary)",
            }}
          />
        </div>
      </div>
      {helpText && (
        <p
          className="text-xs"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          {helpText}
        </p>
      )}
    </div>
  );
}
