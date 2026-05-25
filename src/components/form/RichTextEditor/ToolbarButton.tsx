import React from "react";

import cn from "@/lib/cn";

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

export default function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={cn("rte-btn", {
        "rte-btn--active": active,
        "rte-btn--disabled": disabled,
      })}
    >
      {children}
    </button>
  );
}
