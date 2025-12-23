import EnhancedResumeEditor from "@/components/EnhancedResumeEditor";
import BackButton from "@/components/BackButton";

export default async function ResumeEditorPage({
  params: _p,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const params = await _p


  return (
    <div>
      <BackButton />
      <EnhancedResumeEditor jobId={params.jobId} />
    </div>
  );
}
