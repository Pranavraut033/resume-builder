"use client";

import { useInlineEdit } from "./InlineEditContext";
import { InlineField } from "./InlineField";

interface EditableLinkProps {
  href: string;
  onCommit: (url: string) => void;
  /** Anchor text shown in non-edit mode. Defaults to the href value. */
  children?: React.ReactNode;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * EditableLink — a link that becomes an inline URL editor in edit mode.
 * In display mode it renders a normal <a> tag. In edit mode it shows the
 * URL as an InlineField (click to edit) so the user can update the href.
 * Returns null in display mode when href is empty.
 */
export function EditableLink({
  href,
  onCommit,
  children,
  placeholder = "https://…",
  className,
  style,
}: EditableLinkProps) {
  const { editable } = useInlineEdit();

  if (editable) {
    return (
      <InlineField
        value={href}
        onChange={onCommit}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
    >
      {children ?? href}
    </a>
  );
}
