import ToolbarButton from "./ToolbarButton";

import type { Editor } from "@tiptap/react";

type RichTextEditorToolbarProps = {
  editor: Editor;
  onSetLink: () => void;
  stickyToolbar?: boolean;
};

export default function RichTextEditorToolbar({
  editor,
  onSetLink,
  stickyToolbar,
}: RichTextEditorToolbarProps) {
  const headingLevel = editor.isActive("heading", { level: 1 })
    ? 1
    : editor.isActive("heading", { level: 2 })
      ? 2
      : editor.isActive("heading", { level: 3 })
        ? 3
        : null;

  return (
    <div className={`rte-toolbar${stickyToolbar ? " rte-toolbar--sticky" : ""}`} role="toolbar" aria-label="Text formatting">
      {/* Headings */}
      <div className="rte-group">
        {([1, 2, 3] as const).map((level) => (
          <ToolbarButton
            key={level}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level }).run()
            }
            active={headingLevel === level}
            title={`Heading ${level}`}
          >
            {`H${level}`}
          </ToolbarButton>
        ))}
      </div>

      <div className="rte-divider" />

      {/* Inline marks */}
      <div className="rte-group">
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
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M4 12h16v-1H4zm4.5-5.5C8.5 5.12 9.9 4 12 4c1.5 0 2.7.5 3.5 1.4l-1.4 1.4C13.6 6.3 12.9 6 12 6c-1.1 0-1.7.5-1.7 1.2 0 .4.2.7.5.9H8.7c-.1-.3-.2-.6-.2-1zM12 20c-1.8 0-3.2-.7-4-1.8l1.4-1.4c.6.8 1.5 1.2 2.6 1.2 1.3 0 2-.6 2-1.4 0-.5-.3-.9-.7-1.1H15c.3.4.5.9.5 1.4 0 1.7-1.5 3.1-3.5 3.1z" />
          </svg>
        </ToolbarButton>
      </div>

      <div className="rte-divider" />

      {/* Alignment */}
      <div className="rte-group">
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

      <div className="rte-divider" />

      {/* Lists */}
      <div className="rte-group">
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
      </div>

      <div className="rte-divider" />

      {/* Block / special */}
      <div className="rte-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code block"
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
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </ToolbarButton>
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
      </div>

      <div className="rte-divider" />

      {/* Clear formatting */}
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
  );
}
