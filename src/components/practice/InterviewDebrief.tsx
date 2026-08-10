"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { createInterviewSession } from "@/actions/interview";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import {
  buildInterviewSystemPrompt,
  generateInterviewFeedback,
} from "@/lib/llm/interview/interviewSession";
import { resolveInterviewStyleGuide } from "@/lib/llm/prompts/interviewStyles";
import { ProviderFactory } from "@/lib/llm/providers";
import {
  InterviewFeedbackJSON,
  InterviewTranscriptJSON,
} from "@/types/interview";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { resolveInterviewLLMOptions } from "./resolveInterviewLLMOptions";
import { InterviewSetupChoices } from "./types";

interface InterviewDebriefProps {
  jobId: number;
  jobDetails: JobDetailsJSON;
  resume: ResumeJSON;
  transcript: InterviewTranscriptJSON;
  setup: InterviewSetupChoices;
  /** Lets the caller offer a "practice again" affordance without re-fetching job data. */
  onRestart?: () => void;
}

type DebriefStatus = "loading" | "ready" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Debrief screen: generates feedback for the full transcript on entry, then
 * persists (transcript, feedback, setup meta) as a new `InterviewSession`
 * row tied to the job — that list of rows is the version history.
 */
export function InterviewDebrief({
  jobId,
  jobDetails,
  resume,
  transcript,
  setup,
  onRestart,
}: InterviewDebriefProps) {
  const [status, setStatus] = useState<DebriefStatus>("loading");
  const [feedback, setFeedback] = useState<InterviewFeedbackJSON | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      if (transcript.length === 0) {
        setError(
          "The interview ended before any questions were asked — there's nothing to debrief."
        );
        setStatus("error");
        return;
      }

      let generatedFeedback: InterviewFeedbackJSON;
      try {
        const provider = await ProviderFactory.getInstance(setup.provider);
        if (!provider) {
          throw new Error(`Provider "${setup.provider}" is not available.`);
        }

        const systemPrompt = buildInterviewSystemPrompt({
          jobDetails,
          resume,
          styleGuide: resolveInterviewStyleGuide(setup.styleId),
          customInstructions: setup.customInstructions,
        });

        const options = resolveInterviewLLMOptions(setup.provider, setup.model);

        generatedFeedback = await generateInterviewFeedback(
          provider,
          setup.model,
          systemPrompt,
          transcript,
          options
        );

        setFeedback(generatedFeedback);
        setStatus("ready");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong generating your debrief."
        );
        setStatus("error");
        return;
      }

      try {
        setSaveStatus("saving");
        await createInterviewSession(jobId, transcript, generatedFeedback, {
          provider: setup.provider,
          model: setup.model,
          voice: setup.voice,
          tonePreset: setup.styleId,
          customInstructions: setup.customInstructions,
        });
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
        setSaveError(
          err instanceof Error
            ? err.message
            : "Failed to save this interview session."
        );
      }
    })();
  }, [jobId, jobDetails, resume, transcript, setup]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <PageHeader
        title="Interview debrief"
        description="A private review of how this practice session went."
        badge={
          saveStatus === "saved" ? (
            <Badge variant="success">Saved to job history</Badge>
          ) : saveStatus === "saving" ? (
            <Badge variant="info">Saving…</Badge>
          ) : saveStatus === "error" ? (
            <Badge variant="error">Not saved</Badge>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            {onRestart && (
              <Button variant="secondary" onClick={onRestart}>
                Practice again
              </Button>
            )}
            <Link href={`/job/${jobId}`}>
              <Button variant="primary">Back to job</Button>
            </Link>
          </div>
        }
      />

      {saveError && (
        <Card
          padding="sm"
          className="border-agent-error bg-agent-error-container/20"
        >
          <p className="text-agent-error text-sm">{saveError}</p>
        </Card>
      )}

      {status === "loading" && (
        <Card padding="lg">
          <p className="text-agent-on-surface-variant text-sm">
            Reviewing your interview…
          </p>
        </Card>
      )}

      {status === "error" && (
        <Card
          padding="lg"
          className="border-agent-error bg-agent-error-container/20"
        >
          <p className="text-agent-error text-sm">{error}</p>
        </Card>
      )}

      {status === "ready" && feedback && (
        <div className="space-y-4">
          <Card padding="md" className="space-y-2">
            <p className="text-agent-on-surface-variant text-xs font-medium tracking-wide uppercase">
              Summary
            </p>
            <p className="text-agent-on-surface text-sm leading-relaxed">
              {feedback.summary}
            </p>
          </Card>

          <Card padding="md" className="space-y-2">
            <p className="text-agent-on-surface-variant text-xs font-medium tracking-wide uppercase">
              Strengths
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {feedback.strengths.map((point, i) => (
                <li key={i} className="text-agent-on-surface text-sm">
                  {point}
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="md" className="space-y-2">
            <p className="text-agent-on-surface-variant text-xs font-medium tracking-wide uppercase">
              Areas to improve
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {feedback.improvements.map((point, i) => (
                <li key={i} className="text-agent-on-surface text-sm">
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
