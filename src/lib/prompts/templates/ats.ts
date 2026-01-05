/**
 * ATS Analysis Template
 * Analyzes resume for ATS compatibility and provides optimization recommendations
 */

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const atsTemplate: PromptTemplate = {
  id: "analyze_ats",
  purpose: "analyze_ats",
  description: "Analyze resume for ATS compatibility",

  requiredContext: [
    "resume",
    "jobData.job.job_title",
    "jobData.requirements.required_skills",
    "jobDescription",
  ],

  systemPrompt: `You are an ATS expert. Analyze resume content for keyword optimization, ATS compatibility, and provide specific recommendations.`,

  userPrompt: `Analyze ATS compatibility for: {{jobData.job.job_title}}
Required: {{#each jobData.requirements.required_skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Job: {{jobDescription}}

Resume:
- Summary: {{resume.summary}}
- Experience: {{#each resume.experience}}{{this.role}} @ {{this.company}}, {{/each}}
- Skills: {{#each resume.skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Education: {{#each resume.education}}{{this.degree}}, {{/each}}

Provide: (1) Keyword match %, (2) Missing keywords, (3) Formatting issues, (4) ATS score (0-100), (5) Top 3 improvements.`,
};

// Auto-register on module load
templateRegistry.register(atsTemplate);

export default atsTemplate;
