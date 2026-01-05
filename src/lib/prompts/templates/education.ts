/**
 * Education Generation Template
 * Creates concise and relevant education summaries
 */

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const educationTemplate: PromptTemplate = {
  id: "generate_education",
  purpose: "generate_education",
  description: "Generate education summaries with relevant details",

  requiredContext: [
    "resume.education",
    "jobData.requirements.education",
    "jobDescription",
  ],

  systemPrompt: `You are an education expert. Write concise, relevant education summaries highlighting achievements when significant.`,

  userPrompt: `Improve education for: {{jobData.requirements.education}}
Context: {{jobDescription}}

{{#each resume.education}}
{{this.degree}} in {{this.field}} - {{this.school}} ({{this.graduationDate}}){{#if this.gpa}} GPA: {{this.gpa}}{{/if}}
Current: {{this.description}}

{{/each}}
Output: 1-2 sentences max, highlighting relevant coursework or achievements only if significant.`,
};

// Auto-register on module load
templateRegistry.register(educationTemplate);

export default educationTemplate;
