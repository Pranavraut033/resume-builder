"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
  shadow?: boolean;
  variant?: "surface" | "container" | "surface-low";
}

export function Card({
  children,
  className = "",
  padding = "md",
  shadow = true,
  variant = "surface",
}: CardProps) {
  const paddings = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
    none: "",
  };

  const bgClass =
    variant === "surface-low"
      ? "bg-agent-surface-low"
      : variant === "container"
        ? "bg-agent-surface-container"
        : "bg-agent-surface";

  const shadowClass = shadow ? "shadow-(--shadow-agent-card)" : "shadow-none";

  return (
    <div
      className={`${bgClass} border-agent-outline-variant rounded-(--radius-agent-lg) border ${shadowClass} ${paddings[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
