import { ReactNode, forwardRef, ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "ghost"
    | "gradient"
    | "blocky";
  /** Size of the button */
  size?: "sm" | "md" | "lg";
  /** Optional icon to render before children */
  icon?: ReactNode;
}

const baseStyles =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed appearance-none border border-transparent shadow-sm font-blocky";

const variants = {
  primary:
    "bg-agent-primary text-agent-on-primary hover:bg-agent-primary-container focus:ring-agent-primary",
  secondary:
    "bg-agent-surface-container text-agent-on-surface hover:bg-agent-surface-high focus:ring-agent-primary",
  danger:
    "bg-agent-error text-agent-on-error hover:bg-agent-error-container focus:ring-agent-error",
  ghost:
    "text-agent-on-surface hover:text-agent-primary hover:bg-agent-surface-low focus:ring-agent-primary",
  gradient:
    "bg-gradient-to-br from-agent-primary to-agent-primary-container text-agent-on-primary hover:opacity-90 focus:ring-agent-primary border-none shadow-none",
  blocky:
    "bg-blocky-500 text-blocky-900 hover:bg-blocky-500/90 focus:ring-blocky-500 rounded-block shadow-block",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = "primary",
      size = "md",
      className = "",
      icon,
      type = "button",
      ...props
    },
    ref
  ) {
    const mergedClassName = cn(
      baseStyles,
      variants[variant],
      sizes[size],
      className
    );

    return (
      <button ref={ref} type={type} className={mergedClassName} {...props}>
        {icon}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
