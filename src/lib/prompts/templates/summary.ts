/**
 * Summary Generation Template
 * Creates professional summaries tailored to target role and company
 */

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const summaryTemplate: PromptTemplate = {
  id: "generate_summary",
  purpose: "generate_summary",
  description: "Generate a professional summary for a resume",

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

  systemPrompt: `You are a resume expert. Create concise (2-3 sentences), impactful professional summaries using strong action verbs and quantifiable achievements.`,

  userPrompt: `Create a professional summary for:
Target: {{jobData.job.job_title}}{{#if jobData.company.company_name}} @ {{jobData.company.company_name}}{{/if}}
Recent: {{resume.experience.[0].role}} at {{resume.experience.[0].company}}
Skills: {{#each resume.skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

Job context: {{jobDescription}}

{{#if resume.summary}}Existing: {{resume.summary}}\n{{/if}}
Output: 2-3 sentences highlighting relevant achievements and fit.`,
};

// Auto-register on module load
templateRegistry.register(summaryTemplate);

export default summaryTemplate;
