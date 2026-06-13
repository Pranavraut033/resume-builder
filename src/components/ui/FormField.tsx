"use client";

import { useState } from "react";

import { Icon } from "./Icon";

interface FormFieldProps {
  label?: string;
  type?: "text" | "email" | "tel" | "url" | "textarea" | "password";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  className?: string;
  helpText?: string;
}

export function FormField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  rows = 4,
  className = "",
  helpText,
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;

  const inputClasses =
    "w-full px-3 py-2 border border-agent-outline-variant rounded-lg focus:ring-agent-primary focus:border-transparent transition-colors bg-agent-surface-lowest text-agent-on-surface placeholder-(--color-agent-on-surface-variant)";

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-agent-on-surface block text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={inputClasses}
          required={required}
        />
      ) : (
        <div className="relative">
          <input
            type={inputType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${inputClasses} ${isPasswordField ? "pr-10" : ""}`}
            required={required}
          />
          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-agent-on-surface-variant hover:text-agent-on-surface absolute inset-y-0 right-0 mr-3 flex items-center transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Icon
                name={showPassword ? "EyeSlashIcon" : "EyeIcon"}
                className="h-5 w-5"
              />
            </button>
          )}
        </div>
      )}
      {helpText && (
        <p className="text-agent-on-surface-variant mt-1 text-xs">{helpText}</p>
      )}
    </div>
  );
}
