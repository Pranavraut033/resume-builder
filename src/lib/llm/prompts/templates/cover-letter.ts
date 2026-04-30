/**
 * Cover Letter Generation Template
 * Professional cover letter tailored to job and profile
 */

import { z } from "zod";

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

// Schema for cover letter structured output
const CoverLetterGenerationSchema = z.object({
  letterContent: z.string().describe("Full cover letter text"),
  date: z.string().optional().describe("Letter date"),
  recipientName: z.string().optional().describe("Recipient name if available"),
  recipientTitle: z.string().optional().describe("Recipient job title"),
  recipientCompany: z.string().optional().describe("Company name"),
});

const coverLetterTemplate: PromptTemplate = {
  id: "generate_cover_letter",
  purpose: "generate_cover_letter", // Using existing purpose enum - this might need a new purpose type
  description:
    "Generate a professional cover letter based on profile, job, and tailored resume",
  requiredContext: [
    "baseProfile",
    "jobDescription",
    "jobData.job.job_title",
    "jobData.company.company_name",
    "resume", // The tailored resume
  ],

  systemPrompt: `Write concise, tailored cover letters.
Focus on role fit, measurable impact, and cultural alignment.
Professional, natural tone. No clichés, no generic statements.
Do not invent experience.`,

  userPrompt: `Write a cover letter for {{jobData.job.job_title}} at {{jobData.company.company_name}}.

Profile:
{{{json baseProfile}}}

Job:
{{jobDescription}}

Resume:
{{{json resume}}}

Rules:
- 3–4 short paragraphs
- Match achievements to job requirements
- Quantify impact when possible
- Do not repeat the resume verbatim`,

  outputSchema: CoverLetterGenerationSchema,
};

// Auto-register on module load
templateRegistry.register(coverLetterTemplate);

export { coverLetterTemplate };
export default coverLetterTemplate;
