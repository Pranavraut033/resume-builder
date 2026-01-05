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
  purpose: "generate_summary", // Using existing purpose enum - this might need a new purpose type
  description: "Generate a professional cover letter based on profile, job, and tailored resume",

  requiredContext: [
    "baseProfile",
    "jobDescription",
    "jobRole",
    "company",
    "resume", // The tailored resume
  ],

  systemPrompt: `Write compelling, personalized cover letters. Showcase strengths with value proposition and cultural fit. Use professional yet personable tone. No clichés.`,

  userPrompt: `Write a cover letter for {{jobRole}} @ {{company}}\n\nProfile:\n{{{json baseProfile}}}\n\nJob:\n{{jobDescription}}\n\nResume:\n{{{json resume}}}\n\nOutput: 3-4 paragraphs. Include specific achievements matching job requirements. No clichés or generic statements.`,

  outputSchema: CoverLetterGenerationSchema,
};

// Auto-register on module load
templateRegistry.register(coverLetterTemplate);

export { coverLetterTemplate };
export default coverLetterTemplate;
