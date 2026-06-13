"use client";

import { useInlineEdit } from "./InlineEditContext";
import { InlineField } from "./InlineField";

type FieldType = "text" | "textarea" | "bullet";

interface EditableTextProps {
  value: string;
  onCommit: (value: string) => void;
  fieldType?: FieldType;
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  renderDisplay?: (value: string) => React.ReactNode;
}

/**
 * EditableText — renders plain template text when not in edit mode, and a
 * click-to-edit InlineField when the surrounding InlineEditProvider marks the
 * surface as editable. Keeps template JSX changes mechanical: swap
 * `{value}` for `<EditableText value={value} onCommit={...} />`.
 */
export function EditableText({
  value,
  onCommit,
  fieldType = "text",
  placeholder,
  className,
  displayClassName,
  renderDisplay,
}: EditableTextProps) {
  const { editable } = useInlineEdit();

  if (!editable) {
    return <>{renderDisplay ? renderDisplay(value) : value}</>;
  }

  return (
    <InlineField
      value={value}
      onChange={onCommit}
      fieldType={fieldType}
      placeholder={placeholder}
      className={className}
      displayClassName={displayClassName}
      renderDisplay={renderDisplay}
    />
  );
}
