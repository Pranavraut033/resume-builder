"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { createJob } from "@/actions/job";
import { getProfile, hasProfile } from "@/actions/profile";
import { fetchJobDescriptionFromUrl } from "@/actions/urlFetcher";
import BackButton from "@/components/BackButton";
import { ModelSelector } from "@/components/ModelSelector";
import {
  parseJobDescription,
  generateResume,
  generateCoverLetter,
} from "@/lib/clientLLM";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";

const logger = createLogger("NewJobPage");

export default function NewJobPage() {
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [loading, setLoading] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const router = useRouter();

  // Use Zustand store for model state
  const { selectedProvider, getSelectedModel } = useModelStore();

  // Get the currently selected model for the active provider
  const currentSelectedModel = getSelectedModel(selectedProvider);

  useEffect(() => {
    // Check if profile exists
    const checkProfile = async () => {
      const exists = await hasProfile();
      setProfileExists(exists);
    };
    checkProfile();
  }, []);

  const handleFetchFromUrl = async () => {
    if (!url.trim()) {
      alert("Please enter a URL");
      return;
    }

    setFetchingUrl(true);
    try {
      const result = await fetchJobDescriptionFromUrl(url);

      if (result.success && result.content) {
        setDescription(result.content);
        // Keep the URL stored for later use
      } else {
        alert(result.error || "Failed to fetch content from URL");
      }
    } catch (error) {
      logger.error("Error fetching URL", { error });
      alert("Error fetching URL content");
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!currentSelectedModel) {
        alert("Please select a model first");
        setLoading(false);
        return;
      }

      // Step 1: Parse job description (client-side)
      const jobDetails = await parseJobDescription(
        description,
        currentSelectedModel,
        selectedProvider
      );

      // Step 2: Get base profile
      const baseProfile = await getProfile();

      // Step 3: Generate resume (client-side)
      const tailoredResume = await generateResume(
        baseProfile,
        description,
        jobDetails.job.job_title,
        jobDetails.company.company_name,
        currentSelectedModel,
        selectedProvider
      );

      // Step 4: Generate cover letter (client-side)
      const _coverLetterResult = await generateCoverLetter(
        baseProfile,
        tailoredResume,
        description,
        jobDetails.job.job_title,
        jobDetails.company.company_name,
        currentSelectedModel,
        selectedProvider
      );

      // Step 5: Save to database (server action)
      await createJob({
        jobDetails,
        url: inputMode === "url" && url.trim() ? url : undefined,
      });

      router.push("/");
    } catch (error) {
      logger.error("Error creating job", { error });
      alert("Error creating job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BackButton />
      <h1 className="mb-4 text-2xl font-bold">Add New Job</h1>

      {profileExists === null ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      ) : !profileExists ? (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-yellow-800">
            Base Profile Required
          </h2>
          <p className="mb-4 text-yellow-700">
            You need to create your base profile first before adding jobs. The
            base profile contains your core information that will be used to
            generate tailored resumes.
          </p>
          <Link
            href="/profile"
            className="inline-block rounded bg-yellow-600 px-4 py-2 text-white transition-colors hover:bg-yellow-700"
          >
            Create Base Profile
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-4">
            Paste the job description below or fetch it from a URL. The system
            will auto-parse company and role, and generate a tailored resume and
            cover letter.
          </p>

          {/* Input Mode Toggle */}
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode("text")}
              className={`rounded px-4 py-2 font-medium transition-colors ${
                inputMode === "text"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Paste Text
            </button>
            <button
              type="button"
              onClick={() => setInputMode("url")}
              className={`rounded px-4 py-2 font-medium transition-colors ${
                inputMode === "url"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Fetch from URL
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {inputMode === "url" && (
              <div>
                <label htmlFor="url" className="mb-2 block text-sm font-medium">
                  Job Posting URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 rounded border p-2"
                    placeholder="https://example.com/job-posting"
                  />
                  <button
                    type="button"
                    onClick={handleFetchFromUrl}
                    disabled={fetchingUrl}
                    className="rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                  >
                    {fetchingUrl ? "Fetching..." : "Fetch"}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Enter a URL to automatically fetch the job description
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium"
              >
                Job Description{" "}
                {inputMode === "url" && "(fetched content will appear here)"}
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="h-64 w-full border p-2"
                placeholder="Paste the full job description here..."
              />
            </div>
            <ModelSelector compact />
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Job, Resume & Cover Letter"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
