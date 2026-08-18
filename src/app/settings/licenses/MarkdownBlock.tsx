"use client";

import ReactMarkdown from "react-markdown";

// Same rte-content styling ChatMessage.tsx uses for the one other
// ReactMarkdown consumer in the app — kept as a tiny client wrapper so the
// parent page can stay a server component.
export function MarkdownBlock({ content }: { content: string }) {
  return (
    <div className="rte-content text-sm">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
