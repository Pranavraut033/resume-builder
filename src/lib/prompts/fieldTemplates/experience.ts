/**
 * Experience Field Template
 * Field-specific prompt for work experience description optimization
 */

import { templateRegistry } from "../registry";
import { FieldPromptTemplate } from "../types";

const experienceFieldTemplate: FieldPromptTemplate = {
  id: "field_experience",
  fieldType: "experience_description",
  intent: "Improve work experience - 3-4 bullets with action verbs, metrics, and relevant skills.",
  guidelines: [
    "3-4 bullets, different action verbs each",
    "Include quantifiable results (X%, Y hours, $Z)",
    "Achievements > responsibilities",
    "Highlight target-role skills",
    "1-2 lines per bullet",
  ],

  requiredContext: [
    "field.currentContent",
    "context.targetJobTitle",
  ],

  systemPrompt: `Optimize resume fields. Be concise. Return content only, no labels.`,

  userPrompt: `{{intent}}\nRole: {{context.role}} @ {{context.company}}{{#if context.targetJobTitle}} | Target: {{context.targetJobTitle}}{{/if}}\nCurrent: {{field.currentContent}}\nGuidelines: {{#each guidelines}}{{this}}; {{/each}}\nOutput improved bullets only.`,
};

// Auto-register
templateRegistry.registerField(experienceFieldTemplate);

export default experienceFieldTemplate;
