/**
 * Parsing Templates
 * Job description and resume parsing with structured output
 */

import { JobDetailsSchema, ResumeParsingSchema } from "@/types/resume";

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

// Job Parsing Template
const parseJobTemplate: PromptTemplate = {
  id: "parse_job",
  purpose: "parse_job",
  description: "Parse and structure job descriptions",

  requiredContext: ["jobDescription"],

  systemPrompt: `Extract job description data into structured JSON.
Use null for missing fields.
Do not infer or invent information.`,

  userPrompt: `Parse the following job description:

{{jobDescription}}

Return JSON with these fields only:
- job (title, seniority, type)
- company
- location
- responsibilities
- required_skills
- nice_to_have_skills
- tech_stack
- benefits
- salary
- contact.`,

  outputSchema: JobDetailsSchema,
};

// Resume Parsing Template
const parseResumeTemplate: PromptTemplate = {
  id: "parse_resume",
  purpose: "parse_resume",
  description: "Parse and structure resume text",

  requiredContext: ["resumeText"],

  systemPrompt: `Extract resume data into structured JSON.
Normalize dates to YYYY-MM.
Use null for missing fields.
Do not infer or invent data.`,

  userPrompt: `Parse the following resume text:

{{resumeText}}

Return JSON with these fields only:
- contact
- summary
- experience
- projects
- skills
- education
- certifications
- publications
- languages
- volunteer
- awards`,

  outputSchema: ResumeParsingSchema,
};

// Auto-register on module load
templateRegistry.register(parseJobTemplate);
templateRegistry.register(parseResumeTemplate);

export { parseJobTemplate, parseResumeTemplate };
const parsingTemplates = { parseJobTemplate, parseResumeTemplate };
export default parsingTemplates;
