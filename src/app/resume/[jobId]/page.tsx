import EnhancedResumeEditor from "@/components/EnhancedResumeEditor";

export default async function ResumeEditorPage({
  params: _p,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const params = await _p;

  return <EnhancedResumeEditor jobId={params.jobId} />;
}
