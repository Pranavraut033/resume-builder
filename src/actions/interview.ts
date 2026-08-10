"use server";

import { InterviewSession } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  InterviewFeedbackJSON,
  InterviewTranscriptJSON,
} from "@/types/interview";

export type InterviewSessionRecord = Omit<
  InterviewSession,
  "transcriptJson" | "feedbackJson"
> & {
  transcript: InterviewTranscriptJSON;
  feedback: InterviewFeedbackJSON;
};

function toInterviewSessionRecord(
  session: InterviewSession
): InterviewSessionRecord {
  const { transcriptJson, feedbackJson, ...rest } = session;

  return {
    ...rest,
    transcript: JSON.parse(transcriptJson) as InterviewTranscriptJSON,
    feedback: JSON.parse(feedbackJson) as InterviewFeedbackJSON,
  };
}

/**
 * Persist a completed mock interview session (transcript + generated
 * feedback + the setup meta it was run with), tied to a job.
 */
export async function createInterviewSession(
  jobId: number,
  transcript: InterviewTranscriptJSON,
  feedback: InterviewFeedbackJSON,
  meta: {
    provider: string;
    model: string;
    voice: string;
    tonePreset: string;
    customInstructions?: string;
  }
): Promise<InterviewSessionRecord> {
  const session = await prisma.interviewSession.create({
    data: {
      jobId,
      transcriptJson: JSON.stringify(transcript),
      feedbackJson: JSON.stringify(feedback),
      provider: meta.provider,
      model: meta.model,
      voice: meta.voice,
      tonePreset: meta.tonePreset,
      customInstructions: meta.customInstructions,
    },
  });

  revalidatePath(`/job/${jobId}`);

  return toInterviewSessionRecord(session);
}

/**
 * List every mock interview session for a job, newest first — this list
 * doubles as the version history (no separate snapshot table, unlike
 * Resume/CoverLetter).
 */
export async function getInterviewSessionsByJobId(
  jobId: number
): Promise<InterviewSessionRecord[]> {
  const sessions = await prisma.interviewSession.findMany({
    where: { jobId },
    orderBy: { createdAt: "desc" },
  });

  return sessions.map(toInterviewSessionRecord);
}

/**
 * Get a single interview session by ID.
 */
export async function getInterviewSessionById(
  id: number
): Promise<InterviewSessionRecord | null> {
  const session = await prisma.interviewSession.findUnique({
    where: { id },
  });

  return session ? toInterviewSessionRecord(session) : null;
}

/**
 * Delete an interview session.
 */
export async function deleteInterviewSession(id: number): Promise<void> {
  const session = await prisma.interviewSession.delete({
    where: { id },
  });

  revalidatePath(`/job/${session.jobId}`);
}
