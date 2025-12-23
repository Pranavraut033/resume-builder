"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";
import BackButton from "@/components/BackButton";
import { createLogger } from "@/lib/logger";
import { createJob } from "@/actions/job";
import { getProfile } from "@/actions/profile";
import {
  parseJobDescription,
  generateResume,
  generateCoverLetter,
} from "@/lib/clientLLM";
import { useModelStore } from "@/store/modelStore";

const logger = createLogger("NewJobPage");

export default function NewJobPage() {
  const [description, setDescription] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Use Zustand store for model state
  const {
    selectedModelsByProvider,
    getSelectedProvider,
    getAllSelectedModels,
    loadModels,
  } = useModelStore();

  useEffect(() => {
    // Load models from store
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    // Set first selected model from store
    const allSelected = getAllSelectedModels();
    if (allSelected.length > 0 && !selectedModel) {
      setSelectedModel(allSelected[0]);
    }
  }, [selectedModelsByProvider, selectedModel, getAllSelectedModels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Use provider from store
      const provider = getSelectedProvider();

      // Step 1: Parse job description (client-side)
      const jobDetails = await parseJobDescription(
        description,
        selectedModel,
        provider,
      );

      // // Step 2: Get base profile
      // const baseProfile = await getProfile();

      // // Step 3: Generate resume (client-side)
      // const tailoredResume = await generateResume(
      //   baseProfile,
      //   description,
      //   jobDetails.job.job_title,
      //   jobDetails.company.company_name,
      //   selectedModel,
      //   provider
      // );

      // // Step 4: Generate cover letter (client-side)
      // const coverLetterText = await generateCoverLetter(
      //   baseProfile,
      //   tailoredResume,
      //   description,
      //   jobDetails.job.job_title,
      //   jobDetails.company.company_name,
      //   selectedModel,
      //   provider
      // );

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
      <h1 className="text-2xl font-bold mb-4">Add New Job</h1>
      <p className="mb-4">
        Paste the job description below. The system will auto-parse company and
        role, and generate a tailored resume and cover letter.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Job Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full border p-2 h-64"
            placeholder="Paste the full job description here..."
          />
        </div>
        <div>
          <label htmlFor="model" className="block text-sm font-medium">
            AI Model
          </label>
          <Select
            value={selectedModel}
            onChange={setSelectedModel}
            options={getAllSelectedModels()}
            placeholder="Select a model"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Job, Resume & Cover Letter"}
        </button>
      </form>
    </div>
  );
}
