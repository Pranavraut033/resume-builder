import Link from "next/link";

import {
  getCoverLetterByJobId,
  getResumeByJobId,
  getJobContext,
} from "@/actions/job";
import { getProfile } from "@/actions/profile";
import EnhancedCoverLetterEditor from "@/components/EnhancedCoverLetterEditor";
import { Button } from "@/components/ui/Button";
import { FallbackState } from "@/components/ui/FallbackState";
import { EditorProvider } from "@/contexts/EditorContext";

export default async function CoverLetterEditorPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const resolvedParams = await params;
  const jobIdNum = parseInt(resolvedParams.jobId);

  const [coverLetter, job, profile, resume] = await Promise.all([
    getCoverLetterByJobId(jobIdNum),
    getJobContext(jobIdNum),
    getProfile(),
    getResumeByJobId(jobIdNum),
  ]);

  if (!profile) {
    return (
      <FallbackState
        title="Profile not found"
        description="Please create a profile before editing your cover letter."
        action={
          <Link href="/profile">
            <Button variant="primary">Create Profile</Button>
          </Link>
        }
      />
    );
  }

  return (
    <EditorProvider
      jobId={jobIdNum}
      serverData={{ coverLetter, job, profile, resume }}
      contentType="coverLetter"
    >
      <EnhancedCoverLetterEditor />
    </EditorProvider>
  );
}
