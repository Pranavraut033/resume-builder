import ResumeEditor from '@/components/ResumeEditor';
import BackButton from '@/components/BackButton';

export default function ResumeEditorPage({ params }: { params: { jobId: string } }) {
  return (
    <div>
      <BackButton />
      <ResumeEditor jobId={params.jobId} />
    </div>
  );
}