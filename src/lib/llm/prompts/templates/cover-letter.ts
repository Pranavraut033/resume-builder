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
    "jobDetails",
    "resume", // The tailored resume
  ],

  systemPrompt: `You are an expert cover letter writer who crafts compelling, ATS-aware letters that feel human.

OUTPUT CONTRACT:
- Return ONLY valid JSON matching the CoverLetterJSON schema — no markdown, no prose, no explanation

WRITING PRINCIPLES:
- Tone: confident and specific — not humble, not hyperbolic
- Voice: natural and direct — reads like a sharp professional wrote it, not an AI
- No opener clichés ("I am writing to express...", "I am excited to apply...", "I have always been passionate about...")
- No filler closers ("I look forward to hearing from you", "Please find my resume attached")
- Every sentence must earn its place — cut anything vague or decorative

DATA INTEGRITY (non-negotiable):
- Use ONLY facts, achievements, and experiences present in the base profile and resume
- Never invent metrics, outcomes, responsibilities, or technologies
- Fabrication of any kind is a critical failure

STRUCTURE:
- Para 1 — Hook + role fit: open with the strongest, most specific reason this candidate belongs in this role; name the company and title
- Para 2 — Proof of impact: 1–2 concrete achievements from the profile that directly address the job's core requirements; quantify using existing data only
- Para 3 — Company signal: connect the candidate's background or values to something specific about the company, team, or role (use only what is inferable from the job details provided)
- Para 4 — Close: brief, forward-looking, no fluff

ATS AWARENESS:
- Naturally incorporate 2–3 high-signal keywords from the job description
- Avoid keyword stuffing — integrate terms contextually`,

  userPrompt: `Write a cover letter for the {{jobDetails.job.job_title}} role at {{jobDetails.job.company.company_name}}.

CANDIDATE BASE PROFILE:
{{{json baseProfile}}}

TAILORED RESUME:
{{{json resume}}}

TARGET JOB:
{{{json jobDetails}}}

INSTRUCTIONS:
1. Identify the 2–3 most critical requirements from the job description
2. Find the strongest matching evidence in the profile and resume
3. Build each paragraph around a specific claim backed by that evidence
4. Choose an opening line that is specific to this role and company — not a template opener
5. Close in one sentence: express genuine interest and invite next steps without sycophancy

HARD CONSTRAINTS:
- Do not repeat resume bullet points verbatim — synthesize and reframe
- Do not invent experience, skills, or outcomes not in the profile
- Do not use first-person opener ("I" as the first word of the letter)
- 3–4 paragraphs, each 2–4 sentences — tight, no padding

Return ONLY valid JSON matching the CoverLetterJSON schema.`,

  outputSchema: CoverLetterGenerationSchema,
};

// Auto-register on module load
templateRegistry.register(coverLetterTemplate);

export { coverLetterTemplate };
export default coverLetterTemplate;
