import EnhancedResumeEditor from "@/components/EnhancedResumeEditor";

export default async function ResumeEditorPage({
  params: _p,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const params = await _p;

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background: "var(--color-agent-bg)",
        color: "var(--color-agent-on-bg)",
      }}
    >
      <div
        className="pointer-events-none absolute -top-36 -left-28 h-80 w-80 rounded-full opacity-35 blur-3xl"
        style={{ background: "var(--color-agent-primary-fixed-dim)" }}
      />
      <div
        className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--color-agent-tertiary-fixed-dim)" }}
      />
      <div className="relative h-screen p-3 md:p-4">
        <div
          className="h-full overflow-hidden rounded-2xl border backdrop-blur"
          style={{
            borderColor: "var(--color-agent-outline-variant)",
            background: "var(--color-agent-surface-lowest)",
            boxShadow: "var(--shadow-agent-modal)",
          }}
        >
          <EnhancedResumeEditor jobId={params.jobId} />
        </div>
      </div>
    </div>
  );
}
