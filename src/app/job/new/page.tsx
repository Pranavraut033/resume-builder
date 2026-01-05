"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { createJob } from "@/actions/job";
import { getProfile, hasProfile } from "@/actions/profile";
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
  const [loading, setLoading] = useState(false);
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
      await createJob({ jobDetails });

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
            Paste the job description below. The system will auto-parse company
            and role, and generate a tailored resume and cover letter.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium"
              >
                Job Description
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
            <ModelSelector />
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
