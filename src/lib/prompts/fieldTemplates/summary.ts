/**
 * Summary Field Template
 * Field-specific prompt for professional summary optimization
 */

import { templateRegistry } from "../registry";
import { FieldPromptTemplate } from "../types";

const summaryFieldTemplate: FieldPromptTemplate = {
  id: "field_summary",
  fieldType: "summary",
  intent: "Improve professional summary - 2-3 sentences, strong verbs, relevant achievements.",
  guidelines: [
    "2-3 sentences or 3-4 bullets",
    "Active voice, strong verbs",
    "2-3 key strengths",
    "No generic phrases",
    "Include experience years if relevant",
    "Tailor to target role",
  ],

  requiredContext: [
    "field.currentContent",
    "context.targetJobTitle",
  ],

  systemPrompt: `Optimize resume fields. Be concise. Return content only, no labels.`,

  userPrompt: `{{intent}}\nCurrent: {{field.currentContent}}{{#if context.targetJobTitle}} | Target: {{context.targetJobTitle}}{{/if}}\nGuidelines: {{#each guidelines}}{{this}}; {{/each}}\nOutput improved content only.`,
};

// Auto-register
templateRegistry.registerField(summaryFieldTemplate);

export default summaryFieldTemplate;
