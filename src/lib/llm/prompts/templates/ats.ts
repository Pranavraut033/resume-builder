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

  systemPrompt: `You are an ATS optimization expert.
Evaluate resumes for keyword match, ATS compatibility, and actionable improvements.
Be specific. Do not invent data.`,

  userPrompt: `Analyze ATS fit for {{jobData.job.job_title}}.

Required skills:
{{#each jobData.requirements.required_skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

Job description:
{{jobDescription}}

Resume:
Summary: {{resume.summary}}
Experience: {{#each resume.experience}}{{this.role}} @ {{this.company}}{{#unless @last}}; {{/unless}}{{/each}}
Skills: {{#each resume.skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Education: {{#each resume.education}}{{this.degree}}{{#unless @last}}, {{/unless}}{{/each}}

Output:
1. Keyword match %
2. Missing keywords
3. ATS formatting issues
4. ATS score (0–100)
5. Top 3 improvements`,
};

// Auto-register on module load
templateRegistry.register(atsTemplate);

export default atsTemplate;
