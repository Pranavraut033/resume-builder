"use client";

import {
  RichTextEditor,
  RichTextEditorContent,
} from "@/components/form/RichTextEditor";

interface CoverLetterBodyProps {
  content: string;
  editable?: boolean;
  onChange?: (html: string) => void;
  className?: string;
}

/**
 * Swaps between the read-only render and the inline Tiptap editor for a
 * cover letter template's body — keeps editing visually embedded in the
 * template (same fonts/colors/margins) instead of a separate editor box.
 */
export function CoverLetterBody({
  content,
  editable,
  onChange,
  className = "",
}: CoverLetterBodyProps) {
  if (!editable) {
    return (
      <RichTextEditorContent
        content={content}
        className={`${className} w-full`}
      />
    );
  }

  return (
    <RichTextEditor
      value={content}
      onChange={onChange!}
      className={`${className} w-full`}
      contentClassName="p-0!"
    />
  );
}
