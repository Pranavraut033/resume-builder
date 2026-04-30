"use client";

import { useState, useEffect } from "react";

import { getCoverLetterByJobId, updateCoverLetter } from "@/actions/job";
import { createLogger } from "@/lib/logger";

const logger = createLogger("CoverLetterEditor");

export default function CoverLetterEditor({ jobId }: { jobId: string }) {
  const [coverLetter, setCoverLetter] = useState<string>(
    "Dear Hiring Manager,\n\nI am writing to express my interest in the position...\n\nSincerely,\n[Your Name]"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCoverLetter = async () => {
      try {
        const data = await getCoverLetterByJobId(parseInt(jobId));
        if (data) {
          setCoverLetter(data.contentText);
        }
      } catch (error) {
        logger.error("Error loading cover letter", { error });
      } finally {
        setLoading(false);
      }
    };
    loadCoverLetter();
  }, [jobId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCoverLetter(parseInt(jobId), coverLetter);
      alert("Cover letter saved!");
    } catch (error) {
      logger.error("Error saving cover letter", { error });
      alert("Error saving cover letter");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Cover Letter Editor</h1>
      <textarea
        value={coverLetter}
        onChange={(e) => setCoverLetter(e.target.value)}
        className="h-96 w-full border p-2"
        placeholder="Write your cover letter here..."
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Cover Letter"}
      </button>
    </div>
  );
}
