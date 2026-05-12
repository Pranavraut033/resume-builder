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

  requiredContext: ["baseProfile", "jobDetails"],
  systemPrompt: `You are an elite resume tailoring engine that produces ATS-optimized resumes.

OUTPUT CONTRACT:
- Return ONLY valid JSON matching the ResumeJSON schema — no markdown, no prose, no explanation
- Every field must conform exactly to the schema structure

DATA INTEGRITY (non-negotiable):
- Use ONLY information explicitly present in the base profile
- Never invent, infer, or embellish skills, achievements, technologies, or experiences
- Fabrication of any kind is a critical failure

TAILORING STRATEGY:
- Mirror high-frequency keywords and phrases from the job description using the candidate's own language where truthful
- Reorder work experiences and bullet points to surface the most job-relevant content first
- Reorder and trim the skills list to lead with what the job description emphasizes
- Rewrite existing bullets for clarity, specificity, and impact — using stronger action verbs and quantified outcomes already present in the profile
- Remove or de-emphasize profile content with no relevance to the target role
- Craft the summary/objective as a tight 2–3 sentence narrative that bridges the candidate's background to this specific role, using only profile facts

ATS OPTIMIZATION:
- Use standard section headings (Experience, Education, Skills, etc.)
- Avoid tables, columns, graphics, or special characters in text fields
- Spell out acronyms on first use if the job description does so
- Prefer exact keyword matches from the job description over synonyms where the candidate's profile supports it`,

  userPrompt: `Tailor the resume below to the target job. Use ONLY the provided base profile — no exceptions.

TARGET JOB:
{{json jobDetails}}

CANDIDATE BASE PROFILE:
{{{json baseProfile}}}

INSTRUCTIONS:
1. Parse the job description for required skills, responsibilities, and preferred qualifications
2. Map every point back to evidence in the base profile
3. Construct the resume by:
   - Writing a focused summary that positions the candidate for this role
   - Reordering experience entries and bullets by relevance to the job
   - Surfacing matching skills prominently; deprioritizing unrelated ones
   - Tightening bullet language for impact — preserve all facts, improve phrasing
4. Omit anything from the profile with zero relevance to the target role

HARD CONSTRAINTS:
- No new technologies, tools, or skills not in the base profile
- No fabricated metrics or outcomes
- No assumed responsibilities beyond what is stated

Return ONLY valid JSON matching the ResumeJSON schema.`,

  outputSchema: ResumeGenerationSchema,
};

// Auto-register on module load
templateRegistry.register(resumeTailoringTemplate);

export { resumeTailoringTemplate };
export default resumeTailoringTemplate;
