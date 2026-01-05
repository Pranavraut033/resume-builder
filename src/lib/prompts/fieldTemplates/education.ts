/**
 * Education Field Template
 * Field-specific prompt for education description optimization
 */

import { templateRegistry } from "../registry";
import { FieldPromptTemplate } from "../types";

const educationFieldTemplate: FieldPromptTemplate = {
  id: "field_education",
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
    "field.currentContent",
    "context.targetJobTitle",
  ],

  systemPrompt: `Optimize resume fields. Be concise. Return content only, no labels.`,

  userPrompt: `{{intent}}\nDegree: {{context.degree}}{{#if context.field}} in {{context.field}}{{/if}} | {{context.school}}{{#if context.gpa}} (GPA: {{context.gpa}}){{/if}}\nCurrent: {{field.currentContent}}{{#if context.targetJobTitle}} | Target: {{context.targetJobTitle}}{{/if}}\nGuidelines: {{#each guidelines}}{{this}}; {{/each}}\nOutput improved content only.`,
};

// Auto-register
templateRegistry.registerField(educationFieldTemplate);

export default educationFieldTemplate;
