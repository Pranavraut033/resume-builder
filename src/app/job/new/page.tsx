"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createJob } from "@/actions/job";
import { getAllProfiles } from "@/actions/profile";
import { fetchJobDescriptionFromUrl } from "@/actions/urlFetcher";
import { SelectedModelCard } from "@/components/SelectedModelCard";
import { BackButton, StepProgressButton } from "@/components/ui";
import { useToast } from "@/components/ui/ToastProvider";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { useProfileSelection } from "@/hooks/useProfileSelection";
import LLMService from "@/lib/llm/llmService";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";

const logger = createLogger("NewJobPage");

const GENERATION_STEPS = [
  "Parsing job description…",
  "Scoring resume against ATS…",
  "Tailoring resume & cover letter…",
  "Saving your application…",
];

const SKIP_TAILORING_STEPS = [
  "Parsing job description…",
  "Copying your base profile…",
  "Saving your application…",
];

export default function NewJobPage() {
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [skipTailoring, setSkipTailoring] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const router = useRouter();

  // Use globally selected profile (no override per-job)
  const { selectedProfileId } = useProfileSelection();

  const { data: profile, isLoading } = useProfileQuery(selectedProfileId);
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: getAllProfiles,
  });

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

      const modelOptions = {
        model: currentSelectedModel,
        provider: currentSelectedProvider,
      };

      setActiveStep(0);
      const jobDetails = await LLMService.parseJob(description, modelOptions);

      if (skipTailoring) {
        setActiveStep(1);
        const { label: _label, ...baseResume } = profile;

        setActiveStep(2);
        await createJob({
          jobDetails: jobDetails.result,
          url: inputMode === "url" && url.trim() ? url : undefined,
          tailoredResume: baseResume,
          profileId: selectedProfileId ?? undefined,
        });

        router.push("/");
        return;
      }

      setActiveStep(1);
      const atsAnalysis = await LLMService.analyzeATS(
        profile,
        jobDetails.result,
        modelOptions
      );

      setActiveStep(2);
      const [resume, coverLetter] = await Promise.all([
        LLMService.generateTailoredResume(
          profile,
          jobDetails.result,
          atsAnalysis.result,
          modelOptions
        ),
        LLMService.generateCoverLetter(
          profile,
          jobDetails.result,
          modelOptions
        ),
      ]);

      setActiveStep(3);
      await createJob({
        jobDetails: jobDetails.result,
        url: inputMode === "url" && url.trim() ? url : undefined,
        tailoredResume: resume.result,
        coverLetterText: coverLetter.result,
        atsAnalysis: atsAnalysis.result,
        profileId: selectedProfileId ?? undefined,
      });

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
    <div className="flex min-h-full flex-col overflow-y-auto">
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

            {/* ── Skip tailoring ── */}
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={skipTailoring}
                onChange={(e) => setSkipTailoring(e.target.checked)}
                className="border-agent-outline-variant text-agent-primary focus:ring-agent-primary mt-0.5 h-4 w-4 rounded"
              />
              <span className="text-agent-on-surface-variant">
                Skip AI tailoring — just copy my base profile as the resume
                (no ATS scoring, no cover letter)
              </span>
            </label>

            {/* ── Submit button ── */}
            <StepProgressButton
              type="submit"
              steps={skipTailoring ? SKIP_TAILORING_STEPS : GENERATION_STEPS}
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
