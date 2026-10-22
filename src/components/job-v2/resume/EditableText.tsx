"use client";

import {
  RichTextEditor,
  RichTextEditorContent,
} from "@/components/form/RichTextEditor";

import { BulletListField } from "./BulletListField";
import { useInlineEdit } from "./InlineEditContext";
import { InlineField } from "./InlineField";

// `.rte-content` (rte.css) pins the app editor's 15px/relaxed type; inside a
// resume the field must follow the document's Size preset like the PDF does.
const INHERIT_DOC_TEXT = "text-[length:inherit]! leading-[inherit]!";

type FieldType = "text" | "textarea" | "bullet" | "richtext" | "date";

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

  if (fieldType === "richtext") {
    if (!editable) {
      return renderDisplay ? (
        <>{renderDisplay(value)}</>
      ) : (
        <RichTextEditorContent
          content={value}
          className={`${INHERIT_DOC_TEXT} ${displayClassName ?? ""}`}
        />
      );
    }
    return (
      <RichTextEditor
        value={value}
        onChange={onCommit}
        placeholder={placeholder}
        className={className}
        contentClassName={`p-0! min-h-0! ${INHERIT_DOC_TEXT}`}
        toolbarMode="bubble-only"
      />
    );
  }

  if (!editable) {
    return <>{renderDisplay ? renderDisplay(value) : value}</>;
  }

  if (fieldType === "bullet") {
    return (
      <BulletListField
        items={value.split("\n").filter(Boolean)}
        onChange={(items) => onCommit(items.join("\n"))}
        placeholder={placeholder}
        className={className}
      />
    );
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
