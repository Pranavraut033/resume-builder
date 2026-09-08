/**
 * Runs the job-creation pipeline (parse → analyze → tailor → save) in the
 * background, off the `/job/new` page, reporting progress through
 * `notificationStore` — the same progress→success/error pattern
 * `bookmarkQueueStore.ts` uses for background bookmark parsing.
 *
 * ponytail: the in-flight run lives only in this module's promise chain —
 * a hard reload mid-generation loses it silently (no queue/store to resume
 * from). Fine for a local desktop app with one job in flight at a time; add
 * persistence only if users actually hit this.
 */

import { attachGeneratedMaterials, createJob, getJobById } from "@/actions/job";
import { queryClient } from "@/components/AppShell";
import LLMService from "@/lib/llm/llmService";
import { CoverLetterStyleId } from "@/lib/llm/prompts/coverLetterStyles";
import { createLogger } from "@/lib/logger";
import { useNotificationStore } from "@/store/notificationStore";
import { ProviderType } from "@/types/llm";
import { JobDetailsJSON, JobDetailsSchema, ResumeJSON } from "@/types/resume";

const logger = createLogger("runJobCreation");

export const GENERATION_STEPS = [
  "Parsing job description…",
  "Running Recruiter Skim…",
  "Tailoring resume & cover letter…",
  "Saving your application…",
];

export const SKIP_TAILORING_STEPS = [
  "Parsing job description…",
  "Running Recruiter Skim…",
  "Copying your base profile…",
  "Saving your application…",
];

export interface JobCreationInput {
  profile: ResumeJSON & { label: string };
  description: string;
  modelOptions: { model: string; provider: ProviderType };
  bookmarkJob?: Awaited<ReturnType<typeof getJobById>> | null;
  bookmarkId?: number;
  url?: string;
  profileId?: number;
  skipTailoring: boolean;
  skipVerification: boolean;
  coverLetterStyle: CoverLetterStyleId;
}

/** Fire-and-forget: kicks off the pipeline and reports progress via notifications. */
export function startJobCreation(input: JobCreationInput): void {
  void runJobCreation(input);
}

async function runJobCreation({
  profile,
  description,
  modelOptions,
  bookmarkJob,
  bookmarkId,
  url,
  profileId,
  skipTailoring,
  skipVerification,
  coverLetterStyle,
}: JobCreationInput): Promise<void> {
  const steps = skipTailoring ? SKIP_TAILORING_STEPS : GENERATION_STEPS;
  const stepOffset = bookmarkId ? 1 : 0; // bookmarks skip the parse step
  const totalSteps = steps.length - stepOffset;

  const notify = useNotificationStore.getState().notify;
  const update = useNotificationStore.getState().update;

  const describeStep = (i: number) =>
    `${steps[i]} (${i + 1 - stepOffset}/${totalSteps})`;

  const notificationId = notify({
    title: "Creating application…",
    description: describeStep(stepOffset),
    status: "progress",
    transient: false,
  });

  try {
    let jobDetailsResult: JobDetailsJSON;
    if (bookmarkId && bookmarkJob) {
      jobDetailsResult = JobDetailsSchema.parse(
        JSON.parse(bookmarkJob.jobDetailsJson)
      );
    } else {
      const jobDetails = await LLMService.parseJob(description, modelOptions);
      jobDetailsResult = jobDetails.result;
    }

    const company = jobDetailsResult.company?.company_name;
    const role = jobDetailsResult.job?.job_title;
    const title = company && role ? `${company} — ${role}` : "Job posting";

    update(notificationId, { title, description: describeStep(1) });
    const atsAnalysis = await LLMService.analyzeDocument(
      profile,
      jobDetailsResult,
      modelOptions
    );

    let jobId: number;

    if (skipTailoring) {
      update(notificationId, { description: describeStep(2) });
      const { label: _label, ...baseResume } = profile;

      update(notificationId, { description: describeStep(3) });
      if (bookmarkId) {
        await attachGeneratedMaterials(bookmarkId, {
          tailoredResume: baseResume,
          atsAnalysis: atsAnalysis.result,
          status: "DRAFT",
        });
        jobId = bookmarkId;
      } else {
        const result = await createJob({
          jobDetails: jobDetailsResult,
          url,
          tailoredResume: baseResume,
          atsAnalysis: atsAnalysis.result,
          profileId,
        });
        jobId = result.jobId;
      }
    } else {
      update(notificationId, { description: describeStep(2) });
      const [resume, coverLetter] = await Promise.all([
        skipVerification
          ? LLMService.generateTailoredResume(
              profile,
              jobDetailsResult,
              atsAnalysis.result,
              modelOptions
            )
          : LLMService.generateVerifiedTailoredResume(
              profile,
              jobDetailsResult,
              atsAnalysis.result,
              modelOptions
            ),
        LLMService.generateCoverLetter(
          profile,
          jobDetailsResult,
          modelOptions,
          undefined,
          coverLetterStyle
        ),
      ]);

      if ("flags" in resume && resume.flags.length > 0) {
        notify({
          title: "Fact-check found issues",
          description: `Corrected ${resume.flags.length} unsupported claim${resume.flags.length === 1 ? "" : "s"} before saving. ATS score: ${resume.atsBefore} → ${resume.atsAfter}.`,
          status: "info",
          transient: true,
        });
      }

      update(notificationId, { description: describeStep(3) });
      if (bookmarkId) {
        await attachGeneratedMaterials(bookmarkId, {
          tailoredResume: resume.result,
          coverLetterText: coverLetter.result,
          atsAnalysis: atsAnalysis.result,
          status: "DRAFT",
        });
        jobId = bookmarkId;
      } else {
        const result = await createJob({
          jobDetails: jobDetailsResult,
          url,
          tailoredResume: resume.result,
          coverLetterText: coverLetter.result,
          atsAnalysis: atsAnalysis.result,
          profileId,
        });
        jobId = result.jobId;
      }
    }

    update(notificationId, {
      title,
      description: "Ready — open application",
      status: "success",
      meta: { jobId },
    });

    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    if (bookmarkId) {
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    }
  } catch (error) {
    logger.error("Error creating job", { error });
    const message = error instanceof Error ? error.message : String(error);
    update(notificationId, {
      title: "Job creation failed",
      description: message,
      status: "error",
    });
  }
}
