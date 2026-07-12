import { BubbleMenu } from "@tiptap/react/menus";
import { useEffect, useState } from "react";

import ToolbarButton from "./ToolbarButton";

import type { Editor } from "@tiptap/react";

type ToolbarProps = {
  editor: Editor;
  onSetLink: () => void;
};

/**
 * Pill of block-level controls, floating above the editable text — absolutely
 * positioned so it never reserves layout space (no jump on enter/exit edit).
 * Only shown while this editor is focused: when many rich-text fields sit on
 * one page (e.g. every experience/project description), showing all their
 * pills at once would permanently cover the tightly-packed rows above them.
 */
export function BlockToolbar({ editor }: Pick<ToolbarProps, "editor">) {
  const [focused, setFocused] = useState(editor.isFocused);

  useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    editor.on("focus", onFocus);
    editor.on("blur", onBlur);
    return () => {
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
    };
  }, [editor]);

  if (!focused) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 -top-10 z-20 flex justify-center">
      <div
        className="rte-pill pointer-events-auto flex items-center gap-0.5"
        role="toolbar"
        aria-label="Layout formatting"
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Ordered list"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4H4M4 10h2M3 18h2l-2 2h2" strokeLinejoin="round" />
          </svg>
        </ToolbarButton>

        <div className="rte-divider" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align left"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <rect x="3" y="4" width="18" height="2" fill="currentColor" />
            <rect x="3" y="8" width="12" height="2" fill="currentColor" />
            <rect x="3" y="12" width="18" height="2" fill="currentColor" />
            <rect x="3" y="16" width="12" height="2" fill="currentColor" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align center"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <rect x="3" y="4" width="18" height="2" fill="currentColor" />
            <rect x="6" y="8" width="12" height="2" fill="currentColor" />
            <rect x="3" y="12" width="18" height="2" fill="currentColor" />
            <rect x="6" y="16" width="12" height="2" fill="currentColor" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Align right"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <rect x="3" y="4" width="18" height="2" fill="currentColor" />
            <rect x="9" y="8" width="12" height="2" fill="currentColor" />
            <rect x="3" y="12" width="18" height="2" fill="currentColor" />
            <rect x="9" y="16" width="12" height="2" fill="currentColor" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          active={editor.isActive({ textAlign: "justify" })}
          title="Justify"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <rect x="3" y="4" width="18" height="2" fill="currentColor" />
            <rect x="3" y="8" width="18" height="2" fill="currentColor" />
            <rect x="3" y="12" width="18" height="2" fill="currentColor" />
            <rect x="3" y="16" width="18" height="2" fill="currentColor" />
          </svg>
        </ToolbarButton>
      </div>
    </div>
  );
}

/** Selection bubble menu for inline marks — floats above the current text selection. */
export function BubbleToolbar({ editor, onSetLink }: ToolbarProps) {
  return (
    <BubbleMenu editor={editor}>
      <div
        className="rte-pill flex items-center gap-0.5"
        role="toolbar"
        aria-label="Text formatting"
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold (⌘B)"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M6 4h8a4 4 0 0 1 0 8H6zm0 8h9a4 4 0 0 1 0 8H6z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic (⌘I)"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M10 4h4l-4 16H6z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline (⌘U)"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M6 3v9a6 6 0 0 0 12 0V3h-2v9a4 4 0 0 1-8 0V3H6zm-2 18h16v-2H4v2z" />
          </svg>
        </ToolbarButton>

        <div className="rte-divider" />

        <ToolbarButton
          onClick={onSetLink}
          active={editor.isActive("link")}
          title="Insert / edit link"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
          title="Clear formatting"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 7V4h16v3" />
            <path d="M9 20h6" />
            <path d="M12 4v16" />
            <line x1="3" y1="3" x2="21" y2="21" />
          </svg>
        </ToolbarButton>
      </div>
    </BubbleMenu>
  );
}
