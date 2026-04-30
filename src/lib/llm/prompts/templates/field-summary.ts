/**
 * Summary Generation Template
 * Creates professional summaries tailored to target role and company
 * Field-specific template with intent and guidelines
 */

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const summaryTemplate: PromptTemplate = {
  id: "generate_summary",
  purpose: "generate_summary",
  description: "Generate a professional summary for a resume",

  // Field configuration
  fieldType: "summary",
  intent:
    "Improve professional summary - 2-3 sentences, strong verbs, relevant achievements.",
  guidelines: [
    "2-3 sentences or 3-4 bullets",
    "Active voice, strong verbs",
    "2-3 key strengths",
    "No generic phrases",
    "Include experience years if relevant",
    "Tailor to target role",
  ],

  requiredContext: [
    "resume.summary",
    "resume.experience[0].role",
    "resume.experience[0].company",
    "resume.experience[0].startDate",
    "resume.experience[0].endDate",
    "resume.skills",
    "jobData.job.job_title",
    "jobData.company.company_name",
    "jobDescription",
  ],

  systemPrompt: `Write concise, job-targeted professional summaries.
Use strong action verbs and measurable impact.
Limit to 2–3 sentences. No fluff.`,

  userPrompt: `Professional summary for {{jobData.job.job_title}}{{#if jobData.company.company_name}} at {{jobData.company.company_name}}{{/if}}.

{{resume.experience.[0].role}} @ {{resume.experience.[0].company}}
Skills: {{#each resume.skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

{{jobDescription}}

{{#if resume.summary}}{{resume.summary}}{{/if}}

2–3 sentences. Relevant achievements only.`,
};

// Auto-register on module load
templateRegistry.register(summaryTemplate);

export default summaryTemplate;
