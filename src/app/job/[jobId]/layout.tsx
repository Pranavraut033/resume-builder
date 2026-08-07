import { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";

import {
  createResume,
  getCoverLetterByJobId,
  getJob,
  getResumeByJobId,
} from "@/actions/job";
import { getProfileById } from "@/actions/profile";
import { FallbackState, Button } from "@/components/ui";
import { JobPageProvider } from "@/contexts/JobPageContext";

export const metadata: Metadata = {
  title: "Inline Editor",
  description: "WYSIWYG resume and cover letter editor.",
};

// React `cache()` memoizes this per request — Next can invoke a Server
// Component's render function more than once for the same navigation (e.g.
// the initial document render plus a separate RSC flight render). Without
// memoizing, each invocation re-reads the live DB; if a client-side autosave
// (e.g. humanize) writes in between, the two reads diverge and SSR/hydration
// disagree on the resume text — a hydration mismatch, not a rendering bug.
const loadJobPageData = cache(async (jobIdNum: number) => {
  // Load job first to get its profileId, then load the associated profile
  const job = await getJob(jobIdNum);
  const [coverLetter, profile, resume] = await Promise.all([
    getCoverLetterByJobId(jobIdNum),
    getProfileById(job.profileId),
    getResumeByJobId(jobIdNum, true),
  ]);
  return { job, coverLetter, profile, resume };
});

export default async function EditorLayout({
  params: _p,
  children,
}: {
  params: Promise<{ jobId: string }>;
  children: React.ReactNode;
}) {
  const params = await _p;
  const jobIdNum = parseInt(params.jobId);

  const {
    job,
    coverLetter,
    profile,
    resume: _resume,
  } = await loadJobPageData(jobIdNum);

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

  let resume = _resume;
  //create from base profile
  if (!resume) resume = await createResume(profile, jobIdNum);

  return (
    <JobPageProvider
      jobId={jobIdNum}
      serverData={{ coverLetter, job, profile, resume }}
    >
      {children}
    </JobPageProvider>
  );
}
