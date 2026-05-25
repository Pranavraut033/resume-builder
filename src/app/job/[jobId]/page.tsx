"use client";

import { CoverLetterEditor, ResumeEditor } from "@/components/job";
import { useJobPageContext } from "@/contexts/JobPageContext";

const JobPage = () => {
  const { contentType } = useJobPageContext();

  return contentType === "coverLetter" ? (
    <CoverLetterEditor />
  ) : (
    <ResumeEditor />
  );
};

export default JobPage;
