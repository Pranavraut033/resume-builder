"use client";

import { ReactNode, createElement } from "react";

interface BlockProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}

export function Block({ children, className = "", as = "div" }: BlockProps) {
  return createElement(
    as,
    {
      className: `bg-blocky-100 border border-blocky-500 rounded-block-lg shadow-block p-block font-blocky ${className}`,
    },
    children,
  );
}

export default Block;
