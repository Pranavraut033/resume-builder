/**
 * Skills Generation Template
 * Organizes and prioritizes technical and soft skills
 */

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const skillsTemplate: PromptTemplate = {
  id: "generate_skills",
  purpose: "generate_skills",
  description: "Generate and organize skills list for a resume",

  requiredContext: [
    "resume.skills",
    "resume.experience",
    "jobData.requirements.required_skills",
    "jobData.requirements.nice_to_have_skills",
    "jobData.requirements.tech_stack",
  ],

  systemPrompt: `You are a skills expert. Prioritize and organize professional skills based on job requirements and ATS optimization.`,

  userPrompt: `Optimize skills list for: {{jobData.requirements.required_skills}}
Current: {{#each resume.skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Nice-to-have: {{#each jobData.requirements.nice_to_have_skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
Tech: {{#each jobData.requirements.tech_stack}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

Output: Prioritized list with required first, then relevant nice-to-have and technical skills.`,
};

// Auto-register on module load
templateRegistry.register(skillsTemplate);

export default skillsTemplate;
