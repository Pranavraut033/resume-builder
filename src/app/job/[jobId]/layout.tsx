import { Metadata } from "next";
import Link from "next/link";

import { getCoverLetterByJobId, getJob, getResumeByJobId } from "@/actions/job";
import { getProfileById } from "@/actions/profile";
import { FallbackState, Button } from "@/components/ui";
import { JobPageProvider } from "@/contexts/JobPageContext";

export const metadata: Metadata = {
  title: "Inline Editor",
  description: "WYSIWYG resume and cover letter editor.",
};

export default async function EditorLayout({
  params: _p,
  children,
}: {
  params: Promise<{ jobId: string }>;
  children: React.ReactNode;
}) {
  const params = await _p;
  const jobIdNum = parseInt(params.jobId);

  // Load job first to get its profileId, then load the associated profile
  const job = await getJob(jobIdNum);
  const [coverLetter, profile, resume] = await Promise.all([
    getCoverLetterByJobId(jobIdNum),
    getProfileById(job.profileId),
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
    <JobPageProvider
      jobId={jobIdNum}
      serverData={{ coverLetter, job, profile, resume }}
    >
      {children}
    </JobPageProvider>
  );
}
