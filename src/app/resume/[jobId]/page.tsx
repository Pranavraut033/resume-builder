import EnhancedResumeEditor from "@/components/EnhancedResumeEditor";
import BackButton from "@/components/BackButton";

export default function ResumeEditorPage({
  params,
}: {
  params: { jobId: string };
}) {
  return (
    <div>
      <BackButton />
      <EnhancedResumeEditor jobId={params.jobId} />
    </div>
  );
}
