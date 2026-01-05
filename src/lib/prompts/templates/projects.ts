/**
 * Projects Generation Template
 * Creates compelling project descriptions with technical details
 */

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const projectsTemplate: PromptTemplate = {
  id: "generate_projects",
  purpose: "generate_projects",
  description: "Generate technical project descriptions",

  requiredContext: [
    "resume.projects",
    "jobData.requirements.tech_stack",
    "jobData.requirements.required_skills",
    "jobDescription",
  ],

  systemPrompt: `You are a technical writer. Create compelling project descriptions highlighting technical skills, impact, and measurable outcomes.`,

  userPrompt: `Enhance projects for: {{jobData.job.job_title}}
Required tech: {{#each jobData.requirements.tech_stack}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Job: {{jobDescription}}

{{#each resume.projects}}
**{{this.name}}**
Current: {{this.description}}
Tech: {{#each this.technologies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{#if this.link}} | {{this.link}}{{/if}}

{{/each}}
Output: 2-3 lines per project with impact, tech, and relevant skills.`,
};

// Auto-register on module load
templateRegistry.register(projectsTemplate);

export default projectsTemplate;
