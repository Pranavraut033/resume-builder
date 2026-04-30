/**
 * Resume Tailoring Template
 * Full resume generation tailored to job description
 * Uses OpenAI structured output for guaranteed valid JSON
 */

import { ResumeGenerationSchema } from "@/types/resume";

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const resumeTailoringTemplate: PromptTemplate = {
  id: "tailor_resume",
  purpose: "generate_tailored_resume", // Using existing purpose enum - this might need a new purpose type
  description:
    "Generate a complete tailored resume from base profile and job description",

  requiredContext: [
    "baseProfile",
    "jobDescription",
    "jobData.job.job_title",
    "jobData.company.company_name",
  ],

  systemPrompt: `Tailor resumes to a job description.
Prioritize relevance and ATS compatibility.
Return valid JSON matching ResumeJSON.
Do not invent information.`,

  userPrompt: `Tailor resume for {{jobData.job.job_title}} at {{jobData.company.company_name}}.

Base profile:
{{{json baseProfile}}}

Job description:
{{jobDescription}}

Return ResumeJSON with:
- optimized summary
- experience reordered by relevance
- skills aligned to job
- role-relevant achievements only`,

  outputSchema: ResumeGenerationSchema,
};

// Auto-register on module load
templateRegistry.register(resumeTailoringTemplate);

export { resumeTailoringTemplate };
export default resumeTailoringTemplate;
