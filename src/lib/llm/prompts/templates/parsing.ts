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

  systemPrompt: `
You are a strict information extraction engine.

Your task is to extract structured data from job descriptions.

CRITICAL RULES:
- Output must match the provided Zod schema exactly
- Output must be valid JSON only (no markdown, no commentary)
- Do not infer, guess, or hallucinate missing information
- Use null for unknown or missing values
- Preserve meaning but convert to clean plain text
- Remove all HTML, UI artifacts, navigation elements, and boilerplate content
- Keep only job-relevant information

CLEANING RULES:
- Remove HTML tags and formatting
- Remove buttons, links, "Apply", "Copy", cookie banners, and UI noise
- Remove raw URLs (keep meaningful text only if present)
- Normalize whitespace
`,

  userPrompt: `Extract structured information from the following job description.

JOB DESCRIPTION:
{{jobDescription}}

Return JSON that strictly matches the provided Zod schema.
Output ONLY JSON.
`,

  outputSchema: JobDetailsSchema,
};

// Resume Parsing Template
const parseResumeTemplate: PromptTemplate = {
  id: "parse_resume",
  purpose: "parse_resume",
  description: "Parse and structure resume text",

  requiredContext: ["resumeText"],

  systemPrompt: `You are a strict resume information extraction engine.

Extract structured data from resume text according to the provided schema.

CRITICAL RULES:
- Output MUST be valid JSON only (no markdown, no explanation)
- Output MUST strictly match the provided Zod schema
- Do NOT add, remove, or rename fields
- Do NOT infer or guess missing information
- Use null for missing or unclear values

NORMALIZATION RULES:
- Normalize all dates to YYYY-MM format when possible
- If month is unknown, use YYYY-01 only if explicitly safe; otherwise null
- Remove formatting artifacts (bullets, symbols, extra whitespace)
- Keep factual content unchanged`,

  userPrompt: `Extract structured information from the following resume text.

RESUME:
{{resumeText}}

Return ONLY valid JSON that matches the provided Zod schema exactly.`,

  outputSchema: ResumeParsingSchema,
};

// Auto-register on module load
templateRegistry.register(parseJobTemplate);
templateRegistry.register(parseResumeTemplate);

export { parseJobTemplate, parseResumeTemplate };
const parsingTemplates = { parseJobTemplate, parseResumeTemplate };
export default parsingTemplates;
