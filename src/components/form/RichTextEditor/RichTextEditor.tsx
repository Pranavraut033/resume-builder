"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect } from "react";

import cn from "@/lib/cn";

import { BlockToolbar, BubbleToolbar } from "./RichTextEditorToolbar";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  /** Extra classes for the contentEditable area itself (e.g. to strip padding when embedding inline). */
  contentClassName?: string;
  /**
   * "block-only" shows just the list/alignment pill, hiding the selection
   * bubble menu. "bubble-only" shows just the bold/italic bubble menu on
   * selection, hiding the list/alignment pill.
   */
  toolbarMode?: "full" | "block-only" | "bubble-only";
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  contentClassName,
  toolbarMode = "full",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Start writing…",
      }),
    ],
    content: value,
    autofocus: "end",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn("rte-content", contentClassName),
        spellcheck: "true",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    // Only update content from outside if it genuinely differs from
    // what the editor currently has. This prevents the cursor-jump
    // that happens when onUpdate fires → parent setState → value prop
    // changes → setContent resets cursor position.
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, {
        emitUpdate: false,
      });
    }
  }, [value, editor]);

  if (!editor) return <div className="rte-skeleton" />;

  return (
    <div className={`rte-wrapper${className ? ` ${className}` : ""}`}>
      {toolbarMode !== "bubble-only" && <BlockToolbar editor={editor} />}
      {toolbarMode !== "block-only" && (
        <BubbleToolbar editor={editor} onSetLink={setLink} />
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
