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

  // Field configuration
  fieldType: "projects",
  intent:
    "Improve project descriptions - 2-3 lines each, emphasizing technical skills, impact, and measurable outcomes.",
  guidelines: [
    "2-3 lines per project",
    "Lead with technical impact",
    "Quantifiable results when possible",
    "Emphasize role-relevant technologies",
    "Include team size/scope if relevant",
    "Avoid fluff and generic descriptions",
    "Highlight learning or innovation",
  ],

  requiredContext: [
    "resume.projects",
    "jobData.requirements.tech_stack",
    "jobData.requirements.required_skills",
    "jobDescription",
  ],

  systemPrompt: `Rewrite project descriptions for job relevance.
Highlight technical skills, impact, and measurable outcomes.
Be concise. Do not invent details.`,

  userPrompt: `Enhance projects for {{jobData.job.job_title}}.

Relevant tech:
{{#each jobData.requirements.tech_stack}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

Job context:
{{jobDescription}}

Projects:
{{#each resume.projects}}
{{this.name}}
Current: {{this.description}}
Tech: {{#each this.technologies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{#if this.link}} | {{this.link}}{{/if}}
{{/each}}

Rules:
- 2–3 lines per project
- Emphasize impact and role-relevant tech
- Avoid repetition and filler`,
};

// Auto-register on module load
templateRegistry.register(projectsTemplate);

export default projectsTemplate;
