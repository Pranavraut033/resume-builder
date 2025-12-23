import CoverLetterEditor from "@/components/CoverLetterEditor";
import BackButton from "@/components/BackButton";

export default function CoverLetterEditorPage({
  params,
}: {
  params: { jobId: string };
}) {
  return (
    <div>
      <BackButton />
      <CoverLetterEditor jobId={params.jobId} />
    </div>
  );
}
