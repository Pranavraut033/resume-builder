/**
 * TextAreaField Component
 * Reusable textarea field for multi-line content (summary, descriptions, etc.)
 * AI generation happens at the panel level, not field level.
 */

"use client";

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  helpText?: string;
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 5,
  helpText,
}: TextAreaFieldProps) {
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
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          required={required}
          className="w-full rounded-lg border px-3 py-2 transition-colors focus:ring-2 focus:outline-none"
          style={{
            borderColor: "var(--color-agent-outline-variant)",
            background: "var(--color-agent-surface-lowest)",
            color: "var(--color-agent-on-surface)",
            caretColor: "var(--color-agent-primary)",
          }}
        />
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
