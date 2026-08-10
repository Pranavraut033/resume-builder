"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { getAllJob } from "@/actions/job";
import { InterviewDebrief } from "@/components/practice/InterviewDebrief";
import { InterviewSession } from "@/components/practice/InterviewSession";
import { InterviewSetup } from "@/components/practice/InterviewSetup";
import { InterviewSetupChoices } from "@/components/practice/types";
import { Card, PageHeader } from "@/components/ui";
import { useJobPageDataQuery } from "@/hooks/useJobPageDataQuery";
import { useProfileSelection } from "@/hooks/useProfileSelection";
import { InterviewTranscriptJSON } from "@/types/interview";

type PracticePhase = "setup" | "session" | "debrief";

export default function PracticePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const jobIdParam = searchParams.get("jobId");
  const jobId = jobIdParam ? Number(jobIdParam) : null;

  const handleSelectJob = useCallback(
    (id: number) => {
      router.push(`/practice?jobId=${id}`);
    },
    [router]
  );

  if (!jobId || !Number.isFinite(jobId)) {
    return <JobPicker onSelect={handleSelectJob} />;
  }

  return <PracticeFlow jobId={jobId} />;
}

function JobPicker({ onSelect }: { onSelect: (jobId: number) => void }) {
  const { selectedProfileId } = useProfileSelection();
  const { data: jobList = [], isLoading } = useQuery({
    queryKey: ["jobs", selectedProfileId],
    queryFn: () => getAllJob(selectedProfileId),
  });

  const jobs = jobList.filter((j) => j.status !== "BOOKMARKED");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <PageHeader
        title="Mock interview"
        description="Pick a job to practice interviewing for — questions are grounded in that job's description and your tailored resume."
      />

      {isLoading ? (
        <Card padding="lg">
          <p className="text-agent-on-surface-variant text-sm">Loading jobs…</p>
        </Card>
      ) : jobs.length === 0 ? (
        <Card padding="lg" className="space-y-3">
          <p className="text-agent-on-surface-variant text-sm">
            No jobs yet. Generate a resume for a job first, then come back here
            to practice interviewing for it.
          </p>
          <Link
            href="/job/new"
            className="text-agent-primary text-sm font-medium underline"
          >
            Start a new job
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => onSelect(job.id)}
              className="border-agent-outline-variant bg-agent-surface-lowest hover:border-agent-primary flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
            >
              <div>
                <p className="text-agent-on-surface text-sm font-semibold">
                  {job.role}
                </p>
                <p className="text-agent-on-surface-variant text-xs">
                  {job.company?.name ?? "Unknown company"}
                </p>
              </div>
              <span className="text-agent-on-surface-variant text-xs uppercase">
                {job.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PracticeFlow({ jobId }: { jobId: number }) {
  const { data, isLoading, isError, error } = useJobPageDataQuery(jobId);

  const [phase, setPhase] = useState<PracticePhase>("setup");
  const [setupChoices, setSetupChoices] =
    useState<InterviewSetupChoices | null>(null);
  const [transcript, setTranscript] = useState<InterviewTranscriptJSON>([]);

  // `isError` must be checked before the loading fallback: a failed query
  // leaves `data` as `undefined` too (see useJobPageDataQuery's `combine`),
  // so checking `!data` first would mask a real error as "still loading"
  // forever.
  if (isError) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Card
          padding="lg"
          className="border-agent-error bg-agent-error-container/20 space-y-2"
        >
          <p className="text-agent-error text-sm">
            {error instanceof Error
              ? error.message
              : "Couldn't load this job — it may not have a generated resume yet. Head to the job page first."}
          </p>
          <Link
            href={`/job/${jobId}`}
            className="text-agent-primary text-sm font-medium underline"
          >
            Go to job page
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Card padding="lg">
          <p className="text-agent-on-surface-variant text-sm">Loading job…</p>
        </Card>
      </div>
    );
  }

  const { job, resume } = data;

  if (phase === "setup") {
    return (
      <InterviewSetup
        jobTitle={job.role}
        companyName={job.company?.name}
        onStart={(choices) => {
          setSetupChoices(choices);
          setTranscript([]);
          setPhase("session");
        }}
      />
    );
  }

  if (phase === "session" && setupChoices) {
    return (
      <InterviewSession
        jobDetails={job.details}
        resume={resume.contentJson}
        setup={setupChoices}
        onEnd={(finalTranscript) => {
          setTranscript(finalTranscript);
          setPhase("debrief");
        }}
      />
    );
  }

  if (phase === "debrief" && setupChoices) {
    return (
      <InterviewDebrief
        jobId={jobId}
        jobDetails={job.details}
        resume={resume.contentJson}
        transcript={transcript}
        setup={setupChoices}
        onRestart={() => {
          setTranscript([]);
          setPhase("setup");
        }}
      />
    );
  }

  return null;
}
