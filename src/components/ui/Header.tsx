import { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface HeaderProps {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function Header({ left, right, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between gap-4 border-b px-6 py-3",
        className
      )}
      style={{
        background: "var(--color-agent-surface-lowest)",
        borderColor: "var(--color-agent-outline-variant)",
      }}
    >
      <div className="max-w-sm flex-1">{left}</div>
      <div className="flex items-center gap-3">{right}</div>
    </header>
  );
}
