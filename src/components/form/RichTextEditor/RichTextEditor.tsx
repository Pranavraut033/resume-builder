"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect } from "react";

import RichTextEditorToolbar from "./RichTextEditorToolbar";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  stickyToolbar?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  stickyToolbar,
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
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "rte-content",
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
    <div className={`rte-wrapper${stickyToolbar ? " rte-wrapper--sticky-toolbar" : ""}${className ? ` ${className}` : ""}`}>
      <RichTextEditorToolbar editor={editor} onSetLink={setLink} stickyToolbar={stickyToolbar} />

      <EditorContent editor={editor} />
    </div>
  );
}
