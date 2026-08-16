"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { attachGeneratedMaterials, createJob, getJobById } from "@/actions/job";
import { getAllProfiles } from "@/actions/profile";
import { fetchJobDescriptionFromUrl } from "@/actions/urlFetcher";
import { SelectedModelCard } from "@/components/SelectedModelCard";
import { BackButton, StepProgressButton } from "@/components/ui";
import { useToast } from "@/components/ui/ToastProvider";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { useProfileSelection } from "@/hooks/useProfileSelection";
import LLMService from "@/lib/llm/llmService";
import {
  COVER_LETTER_STYLES,
  CoverLetterStyleId,
  DEFAULT_COVER_LETTER_STYLE,
} from "@/lib/llm/prompts/coverLetterStyles";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";
import { JobDetailsJSON, JobDetailsSchema } from "@/types/resume";

const logger = createLogger("NewJobPage");

const GENERATION_STEPS = [
  "Parsing job description…",
  "Running Recruiter Skim…",
  "Tailoring resume & cover letter…",
  "Saving your application…",
];

const SKIP_TAILORING_STEPS = [
  "Parsing job description…",
  "Running Recruiter Skim…",
  "Copying your base profile…",
  "Saving your application…",
];

function NewJobPageInner() {
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [skipTailoring, setSkipTailoring] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [coverLetterStyle, setCoverLetterStyle] = useState<CoverLetterStyleId>(
    DEFAULT_COVER_LETTER_STYLE
  );
  const [skipVerification, setSkipVerification] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookmarkId = searchParams.get("bookmark");

  // Use globally selected profile (no override per-job)
  const { selectedProfileId } = useProfileSelection();

  const { data: profile, isLoading } = useProfileQuery(selectedProfileId);
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: getAllProfiles,
  });

  const { data: bookmarkJob } = useQuery({
    queryKey: ["job", bookmarkId],
    queryFn: () => getJobById(Number(bookmarkId)),
    enabled: !!bookmarkId,
  });

  useEffect(() => {
    if (bookmarkJob?.description && !description) {
      setDescription(bookmarkJob.description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkJob]);

  const { activeModelPair: selectedModel } = useModelStore();
  const [currentSelectedProvider, currentSelectedModel] = selectedModel ?? [];
  const { pushToast } = useToast();

  const handleFetchFromUrl = async () => {
    if (!url.trim()) return;
    setFetchingUrl(true);
    try {
      const result = await fetchJobDescriptionFromUrl(url);
      if (result.success && result.content) {
        setDescription(result.content);
      } else {
        pushToast({
          title: "Failed to fetch content",
          description: result.error || "Failed to fetch content from URL.",
          variant: "error",
        });
      }
    } catch (error) {
      logger.error("Error fetching URL", { error });
      pushToast({
        title: "URL fetch failed",
        description: "Error fetching URL content.",
        variant: "error",
      });
    } finally {
      setFetchingUrl(false);
    }
  };

  // const handleDrop = (e: React.DragEvent) => {
  //   e.preventDefault();
  //   setIsDragging(false);
  //   const file = e.dataTransfer.files[0];
  //   if (file && file.type === "application/pdf") {
  //     // PDF handling placeholder — set description note
  //     setDescription(`[PDF uploaded: ${file.name}] — PDF parsing coming soon.`);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!currentSelectedModel || !currentSelectedProvider) {
        pushToast({
          title: "Model required",
          description: "Please select a model first.",
          variant: "error",
        });
        return;
      }

      if (!profile) {
        pushToast({
          title: "Profile unavailable",
          description: "Profile not loaded.",
          variant: "error",
        });
        return;
      }

      if (bookmarkId && !bookmarkJob) {
        pushToast({
          title: "Bookmark not loaded yet",
          description: "Please wait a moment and try again.",
          variant: "error",
        });
        return;
      }

      const modelOptions = {
        model: currentSelectedModel,
        provider: currentSelectedProvider,
      };

      // Bookmarks already have parsed job details persisted from the
      // background queue — skip the parse call (and its step index) and
      // jump straight to the ATS step.
      let jobDetailsResult: JobDetailsJSON;
      if (bookmarkId && bookmarkJob) {
        jobDetailsResult = JobDetailsSchema.parse(
          JSON.parse(bookmarkJob.jobDetailsJson)
        );
      } else {
        setActiveStep(0);
        const jobDetails = await LLMService.parseJob(description, modelOptions);
        jobDetailsResult = jobDetails.result;
      }

      setActiveStep(bookmarkId ? 0 : 1);
      const atsAnalysis = await LLMService.analyzeATS(
        profile,
        jobDetailsResult,
        modelOptions
      );

      if (skipTailoring) {
        setActiveStep(bookmarkId ? 1 : 2);
        const { label: _label, ...baseResume } = profile;

        setActiveStep(bookmarkId ? 2 : 3);
        if (bookmarkId) {
          await attachGeneratedMaterials(Number(bookmarkId), {
            tailoredResume: baseResume,
            atsAnalysis: atsAnalysis.result,
            status: "DRAFT",
          });
        } else {
          await createJob({
            jobDetails: jobDetailsResult,
            url: inputMode === "url" && url.trim() ? url : undefined,
            tailoredResume: baseResume,
            atsAnalysis: atsAnalysis.result,
            profileId: selectedProfileId ?? undefined,
          });
        }

        router.push("/");
        return;
      }

      setActiveStep(bookmarkId ? 1 : 2);
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
        pushToast({
          title: "Fact-check found issues",
          description: `Corrected ${resume.flags.length} unsupported claim${resume.flags.length === 1 ? "" : "s"} before saving. ATS score: ${resume.atsBefore} → ${resume.atsAfter}.`,
          variant: "info",
        });
      }

      setActiveStep(bookmarkId ? 2 : 3);
      if (bookmarkId) {
        await attachGeneratedMaterials(Number(bookmarkId), {
          tailoredResume: resume.result,
          coverLetterText: coverLetter.result,
          atsAnalysis: atsAnalysis.result,
          status: "DRAFT",
        });
      } else {
        await createJob({
          jobDetails: jobDetailsResult,
          url: inputMode === "url" && url.trim() ? url : undefined,
          tailoredResume: resume.result,
          coverLetterText: coverLetter.result,
          atsAnalysis: atsAnalysis.result,
          profileId: selectedProfileId ?? undefined,
        });
      }

      router.push("/");
    } catch (error) {
      logger.error("Error creating job", { error });
      pushToast({
        title: "Job creation failed",
        description: "Error creating job.",
        variant: "error",
      });
    } finally {
      setActiveStep(-1);
    }
  };

  // ── No-profile guard ──────────────────────────────────────────────────────
  if (!isLoading && !profile && profiles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-agent-bg)">
        <div className="border-agent-outline-variant max-w-md rounded-2xl border bg-(--color-agent-surface-lowest) p-10 text-center shadow-(--shadow-agent-modal)">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
            ⚠️
          </div>
          <h2 className="mb-2 text-xl font-bold text-(--color-agent-on-surface)">
            Base Profile Required
          </h2>
          <p className="text-agent-on-surface-variant mb-6 text-sm">
            Create your base profile first so we can tailor your resume to every
            job.
          </p>
          <Link
            href="/profile"
            className="bg-agent-primary rounded-xl` inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Create Base Profile →
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-agent-bg)">
        <div className="border-agent-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Main content ── */}
      <main className="flex flex-1 items-start justify-center gap-8 px-6 py-10 lg:px-12">
        {/* ── Left column: form ── */}
        <BackButton />
        <div className="w-full max-w-2xl">
          <h1 className="mb-1 text-3xl font-bold text-(--color-agent-on-surface)">
            Tailor Your Resume
          </h1>
          <p className="text-agent-on-surface-variant mb-4 text-sm">
            Paste a job description or upload a PDF to let our AI architect a
            resume that highlights your most relevant strengths.
          </p>

          {/* ── Current profile display ── */}
          <div className="mb-6">
            <p className="text-agent-outline mb-1.5 text-xs font-medium tracking-widest uppercase">
              Using Profile
            </p>
            <p className="text-agent-on-surface text-sm">
              {profile?.header?.name || "Unnamed Profile"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ── Tab toggle ── */}
            <div className="bg-agent-surface-container flex gap-1 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setInputMode("text")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  inputMode === "text"
                    ? "text-agent-primary bg-(--color-agent-surface-lowest) shadow-sm"
                    : "text-agent-on-surface-variant hover:text-(--color-agent-on-surface)"
                }`}
              >
                Job Description
              </button>
              <button
                type="button"
                onClick={() => setInputMode("url")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  inputMode === "url"
                    ? "text-agent-primary bg-(--color-agent-surface-lowest) shadow-sm"
                    : "text-agent-on-surface-variant hover:text-(--color-agent-on-surface)"
                }`}
              >
                Fetch from URL
              </button>
            </div>

            {/* ── URL input ── */}
            {inputMode === "url" && (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="border-agent-outline-variant placeholder:text-agent-on-surface-variant focus:border-agent-primary focus:ring-agent-primary flex-1 rounded-xl border bg-(--color-agent-surface-lowest) px-4 py-3 text-sm text-(--color-agent-on-surface) focus:ring-1 focus:outline-none"
                  placeholder="https://example.com/job-posting"
                />
                <button
                  type="button"
                  onClick={handleFetchFromUrl}
                  disabled={fetchingUrl || !url.trim()}
                  className="bg-agent-primary rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  {fetchingUrl ? "Fetching…" : "Fetch"}
                </button>
              </div>
            )}

            {/* ── Textarea ── */}
            <div className="relative">
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={9}
                className="border-agent-outline-variant placeholder:text-agent-on-surface-variant focus:border-agent-primary focus:ring-agent-primary w-full resize-none rounded-xl border bg-(--color-agent-surface-lowest) px-4 py-3 pr-12 text-sm text-(--color-agent-on-surface) focus:ring-1 focus:outline-none"
                placeholder="Paste the full job description here…"
              />
              {/* AI sparkle icon */}
              <span className="text-agent-primary pointer-events-none absolute top-3 right-3 opacity-60">
                ✦
              </span>
            </div>

            {/* ── PDF upload ── */}
            {/* <div>
              <p className="text-agent-on-surface-variant mb-2 text-xs font-medium">
                Or upload the job PDF
              </p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
                  isDragging
                    ? "border-agent-primary bg-agent-surface-low"
                    : "border-agent-outline-variant bg-agent-surface-container hover:border-agent-primary hover:bg-agent-surface-low"
                }`}
              >
                <svg
                  className="text-agent-on-surface-variant h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                <p className="text-agent-on-surface-variant text-sm">
                  Drag and drop your file here or{" "}
                  <span className="text-agent-primary font-semibold">
                    click to browse
                  </span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      setDescription(
                        `[PDF uploaded: ${file.name}] — PDF parsing coming soon.`
                      );
                  }}
                />
              </div>
            </div> */}

            {/* ── Pro tip ── */}
            <div className="border-agent-primary-fixed bg-agent-surface-low flex items-start gap-3 rounded-xl border px-4 py-3">
              <span className="mt-0.5 text-base">💡</span>
              <div>
                <p className="text-agent-primary mb-0.5 text-xs font-semibold tracking-wide uppercase">
                  Pro Tip
                </p>
                <p className="text-agent-on-surface-variant text-xs">
                  Include the company name and any specific cultural values
                  mentioned. Our AI uses this to fine-tune the &ldquo;Tone of
                  Voice&rdquo; in your summary.
                </p>
              </div>
            </div>

            {/* ── Advanced options ── */}
            <div className="border-agent-outline-variant rounded-xl border">
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="text-agent-on-surface-variant hover:text-agent-on-surface flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium"
              >
                Advanced options
                <svg
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {showAdvanced && (
                <div className="border-agent-outline-variant space-y-3 border-t px-4 py-3">
                  <label className="flex items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={skipTailoring}
                      onChange={(e) => setSkipTailoring(e.target.checked)}
                      className="border-agent-outline-variant text-agent-primary focus:ring-agent-primary mt-0.5 h-4 w-4 shrink-0 rounded"
                    />
                    <span className="text-agent-on-surface-variant">
                      Skip AI tailoring — just copy my base profile as the
                      resume (the recruiter skim still runs, no cover letter)
                    </span>
                  </label>

                  {!skipTailoring && (
                    <>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="coverLetterStyle"
                          className="text-agent-on-surface text-sm font-medium"
                        >
                          Cover letter style
                        </label>
                        <select
                          id="coverLetterStyle"
                          value={coverLetterStyle}
                          onChange={(e) =>
                            setCoverLetterStyle(
                              e.target.value as CoverLetterStyleId
                            )
                          }
                          className="border-agent-outline-variant focus:border-agent-primary focus:ring-agent-primary w-full rounded-xl border bg-(--color-agent-surface-lowest) px-4 py-3 text-sm text-(--color-agent-on-surface) focus:ring-1 focus:outline-none"
                        >
                          {Object.entries(COVER_LETTER_STYLES).map(
                            ([id, style]) => (
                              <option key={id} value={id}>
                                {style.label}
                              </option>
                            )
                          )}
                        </select>
                        <p className="text-agent-on-surface-variant text-xs">
                          {COVER_LETTER_STYLES[coverLetterStyle].description}
                        </p>
                      </div>

                      <label className="flex items-start gap-2.5 text-sm">
                        <input
                          type="checkbox"
                          checked={skipVerification}
                          onChange={(e) =>
                            setSkipVerification(e.target.checked)
                          }
                          className="border-agent-outline-variant text-agent-primary focus:ring-agent-primary mt-0.5 h-4 w-4 shrink-0 rounded"
                        />
                        <span className="text-agent-on-surface-variant">
                          Skip verification — use faster, unverified generation
                          (fewer AI calls, no fact-check pass). Leave unchecked
                          to fact-check the tailored resume against your base
                          profile and correct unsupported claims.
                        </span>
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Submit button ── */}
            <StepProgressButton
              type="submit"
              steps={
                skipTailoring
                  ? bookmarkId
                    ? SKIP_TAILORING_STEPS.slice(1)
                    : SKIP_TAILORING_STEPS
                  : bookmarkId
                    ? GENERATION_STEPS.slice(1)
                    : GENERATION_STEPS
              }
              activeStep={activeStep}
              disabled={!description.trim() || !currentSelectedModel}
              idleLabel={
                <>
                  Analyze &amp; Start
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </>
              }
            />
          </form>
        </div>

        {/* ── Right column: model & tips ── */}
        <div className="hidden w-72 shrink-0 space-y-4 lg:block">
          {/* Selected Model Card */}
          <SelectedModelCard />

          {/* How it works card */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--color-agent-surface-lowest)",
              border: "1px solid var(--color-agent-outline-variant)",
            }}
          >
            <p
              className="mb-3 text-xs font-semibold tracking-wide uppercase"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              How it works
            </p>
            <ol className="space-y-2.5">
              {[
                { step: "1", text: "Paste or fetch the job description" },
                { step: "2", text: "AI extracts requirements & keywords" },
                { step: "3", text: "Your resume is tailored to match" },
              ].map(({ step, text }) => (
                <li key={step} className="flex items-start gap-3">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: "var(--color-agent-primary-container)",
                      color: "var(--color-agent-on-primary-container)",
                    }}
                  >
                    {step}
                  </span>
                  <span
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--color-agent-on-surface-variant)" }}
                  >
                    {text}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-(--color-agent-bg)">
          <div className="border-agent-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      }
    >
      <NewJobPageInner />
    </Suspense>
  );
}
