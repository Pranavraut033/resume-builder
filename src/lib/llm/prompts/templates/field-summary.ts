/**
 * Summary Generation Template
 * Creates professional summaries tailored to target role and company
 * Field-specific template with intent and guidelines
 */

import z from "zod";

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const summaryTemplate: PromptTemplate = {
  id: "generate_summary",
  purpose: "generate_summary",
  description: "Generate a professional summary for a resume",

  // Field configuration
  fieldType: "summary",
  intent:
    "Write a sharp, role-targeted professional summary that positions the candidate as a strong fit for the specific job.",

  guidelines: [
    "2–3 sentences — no more, no less",
    "Open with a professional identity statement (title + years of experience if notable)",
    "Anchor to 1–2 achievements or strengths directly relevant to the target role",
    "Close with a forward-looking value proposition for this specific company or role",
    "Use strong action-oriented language — no passive voice, no filler phrases",
    "Never start with 'I' or generic openers like 'Results-driven' or 'Passionate about'",
  ],

  requiredContext: ["resume", "jobDetails", "jobDescription"],

  systemPrompt: `You are a professional resume writer specializing in high-impact summaries.

OUTPUT CONTRACT:
- Return ONLY valid JSON matching the SummaryJSON schema
- The summary field must be 2–3 sentences of plain text — no bullets, no markdown

DATA INTEGRITY:
- Use ONLY facts, roles, skills, and achievements present in the provided resume
- Never invent metrics, titles, or experiences not in the source material

QUALITY BAR:
- Every sentence must be specific to this candidate and this role
- A recruiter should be able to identify the target job from the summary alone
- Prefer concrete over abstract: "reduced API latency by 40%" beats "improved system performance"`,

  userPrompt: `Write a professional summary for the {{jobData.job.job_title}}{{#if jobData.company.company_name}} role at {{jobData.company.company_name}}{{/if}}.

TARGET ROLE:
{{jobDescription}}

CANDIDATE PROFILE:
- Current/Most Recent: {{resume.experience.[0].role}} at {{resume.experience.[0].company}}
- Core Skills: {{#each resume.skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{#if resume.summary}}- Existing Summary (rewrite, do not copy): {{resume.summary}}{{/if}}

FULL RESUME CONTEXT:
{{{json resume}}}

TASK:
Identify the 1–2 strongest signals in this profile that match the target role, then build the summary around them.

Return ONLY valid JSON matching the SummaryJSON schema.`,
  outputSchema: z.object({
    summary: z.string().describe("The generated professional summary text"),
  }),
};

// Auto-register on module load
templateRegistry.register(summaryTemplate);

export default summaryTemplate;
