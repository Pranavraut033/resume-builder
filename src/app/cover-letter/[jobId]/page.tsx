import {
  getCoverLetterByJobId,
  getResumeByJobId,
  getJobContext,
} from "@/actions/job";
import { getProfile } from "@/actions/profile";
import EnhancedCoverLetterEditor from "@/components/EnhancedCoverLetterEditor";
import { AIProvider } from "@/contexts/AIContext";
import { EditorProvider } from "@/contexts/EditorContext";
import { DEFAULT_CUSTOMIZATION, extractCustomization } from "@/types/resume";

export default async function CoverLetterEditorPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const resolvedParams = await params;
  const jobIdNum = parseInt(resolvedParams.jobId);

  const [coverLetterData, resumeData, jobData] = await Promise.all([
    getCoverLetterByJobId(jobIdNum),
    getResumeByJobId(jobIdNum),
    getJobContext(jobIdNum),
  ]);

  return (
    <EditorProvider
      values={{
        coverLetter: coverLetterData?.contentText || "",
        resume: resumeData?.contentJson || (await getProfile()),
        customization: coverLetterData
          ? extractCustomization(coverLetterData)
          : DEFAULT_CUSTOMIZATION,
        job: jobData,
      }}
      contentType="coverLetter"
    >
      <AIProvider>
        <EnhancedCoverLetterEditor />
      </AIProvider>
    </EditorProvider>
  );
}
