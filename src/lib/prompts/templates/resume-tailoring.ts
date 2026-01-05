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
  purpose: "generate_summary", // Using existing purpose enum - this might need a new purpose type
  description: "Generate a complete tailored resume from base profile and job description",

  requiredContext: [
    "baseProfile",
    "jobDescription",
    "jobRole",
    "company",
  ],

  systemPrompt: `Tailor resumes to job descriptions. Highlight relevant experience, skills, and achievements. Optimize for ATS. Return valid JSON matching ResumeJSON schema.`,

  userPrompt: `Tailor resume for {{jobRole}} @ {{company}}\n\nBase Profile:\n{{{json baseProfile}}}\n\nJob:\n{{jobDescription}}\n\nOutput: Tailored JSON with optimized summary, reordered experience (relevant first), matching skills, and relevant achievements.`,

  outputSchema: ResumeGenerationSchema,
};

// Auto-register on module load
templateRegistry.register(resumeTailoringTemplate);

export { resumeTailoringTemplate };
export default resumeTailoringTemplate;
