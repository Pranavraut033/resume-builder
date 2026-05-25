import Link from "next/link";
import { ReactNode } from "react";

export function IconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="rounded-xl p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: "var(--color-agent-surface-container)",
        color: "var(--color-agent-on-surface-variant)",
      }}
      aria-label={label}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      onClick={(event) => event.stopPropagation()}
      className="rounded-xl p-2 transition-colors"
      style={{
        background: "var(--color-agent-surface-container)",
        color: "var(--color-agent-on-surface-variant)",
      }}
    >
      {children}
    </Link>
  );
}
