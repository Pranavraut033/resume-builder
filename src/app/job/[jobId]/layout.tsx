import { Link } from "lucide-react";
import { Metadata } from "next";

import { getCoverLetterByJobId, getJob, getResumeByJobId } from "@/actions/job";
import { getProfile } from "@/actions/profile";
import { FallbackState, Button } from "@/components/ui";
import { JobPageProvider } from "@/contexts/JobPageContext";
import getFullUrl from "@/lib/getFulllUrl";

export const metadata: Metadata = {
  title: "Editor",
  description: "Edit your resume and cover letter for the job.",
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

  const [coverLetter, job, profile, resume] = await Promise.all([
    getCoverLetterByJobId(jobIdNum),
    getJob(jobIdNum),
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

  const fullUrl = await getFullUrl();

  const contentType: "resume" | "coverLetter" = fullUrl.includes("resume")
    ? "resume"
    : "coverLetter";

  return (
    <JobPageProvider
      jobId={jobIdNum}
      serverData={{ coverLetter, job, profile, resume }}
      contentType={contentType}
    >
      {children}
    </JobPageProvider>
  );
}
