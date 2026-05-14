import { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

interface FallbackStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  iconName?: string;
  className?: string;
}

export function FallbackState({
  title,
  description,
  action,
  iconName = "alertTriangle",
  className = "",
}: FallbackStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-64 items-center justify-center px-4 py-10 sm:px-6",
        className
      )}
    >
      <div className="border-agent-outline/15 bg-agent-surface shadow-agent-card w-full max-w-sm rounded-[1.75rem] border p-8 text-center">
        <div className="bg-agent-primary-fixed text-agent-on-primary mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm">
          <Icon name={iconName} size={28} className="h-7 w-7" />
        </div>
        <h2
          className="text-xl font-semibold tracking-tight"
          style={{ color: "var(--color-agent-on-surface)" }}
        >
          {title}
        </h2>
        <p
          className="mt-3 text-sm leading-6"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          {description}
        </p>
        {action ? (
          <div className="mt-6 flex justify-center">{action}</div>
        ) : null}
      </div>
    </div>
  );
}
