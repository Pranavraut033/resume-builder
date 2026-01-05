/**
 * Experience Generation Template
 * Creates achievement-focused work experience descriptions
 */

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const experienceTemplate: PromptTemplate = {
  id: "generate_experience",
  purpose: "generate_experience",
  description: "Generate work experience descriptions with achievements",

  requiredContext: [
    "resume.experience",
    "jobData.job.job_title",
    "jobData.job.responsibilities",
    "jobData.requirements.required_skills",
    "jobDescription",
  ],

  systemPrompt: `You are a resume expert. Write achievement-focused work experience with strong action verbs, quantifiable results, and relevant skills.`,

  userPrompt: `Improve work experience for: {{jobData.job.job_title}}
Required skills: {{#each jobData.requirements.required_skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Job: {{jobDescription}}

{{#each resume.experience}}
**{{this.role}}** @ {{this.company}} ({{this.startDate}}-{{this.endDate}})
Current: {{this.description}}

{{/each}}
Output: 3-4 bullets per role with action verbs, metrics, and relevant skills.`,
};

// Auto-register on module load
templateRegistry.register(experienceTemplate);

export default experienceTemplate;
