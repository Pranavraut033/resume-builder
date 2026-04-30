/**
 * Education Generation Template
 * Creates concise and relevant education summaries
 * Field-specific template with intent and guidelines
 */

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const educationTemplate: PromptTemplate = {
  id: "generate_education",
  purpose: "generate_education",
  description: "Generate education summaries with relevant details",

  // Field configuration
  fieldType: "education_description",
  intent: "Improve education description - 1-2 sentences, concise, relevant.",
  guidelines: [
    "1-2 sentences max",
    "Only significant coursework/honors",
    "Relevant to target role",
    "No redundant info",
    "GPA only if >3.5",
    "Leadership/projects if relevant",
  ],

  requiredContext: [
    "resume.education",
    "jobData.requirements.education",
    "jobDescription",
  ],

  systemPrompt: `Rewrite education sections for job relevance.
Be concise. Include achievements only if significant.`,

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
