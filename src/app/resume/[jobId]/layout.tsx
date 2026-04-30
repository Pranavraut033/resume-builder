import Link from "next/link";

export default function ResumeEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <header
        className="flex shrink-0 items-center justify-between border-b px-4 py-3"
        style={{
          background: "var(--color-agent-surface-lowest)",
          borderColor: "var(--color-agent-outline-variant)",
        }}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              background: "var(--color-agent-surface-container)",
              color: "var(--color-agent-on-surface-variant)",
            }}
          >
            Dashboard
          </Link>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Resume Editor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-md px-2.5 py-1 text-xs font-medium"
            style={{
              background: "var(--color-agent-primary-container)",
              color: "var(--color-agent-on-primary-container)",
            }}
          >
            Editor
          </span>
          <span
            className="rounded-md px-2.5 py-1 text-xs font-medium"
            style={{
              background: "var(--color-agent-surface-container)",
              color: "var(--color-agent-on-surface-variant)",
            }}
          >
            Final Export
          </span>
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
