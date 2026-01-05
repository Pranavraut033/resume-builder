/**
 * Achievements Field Template
 * Field-specific prompt for achievements/accomplishments optimization
 */

import { templateRegistry } from "../registry";
import { FieldPromptTemplate } from "../types";

const achievementsFieldTemplate: FieldPromptTemplate = {
  id: "field_achievements",
  fieldType: "achievements",
  intent: "Improve achievements using STAR method - Situation, Task, Action, Result.",
  guidelines: [
    "Use STAR format",
    "Specific metrics & outcomes",
    "Business impact focus",
    "Strong action verbs",
    "2-3 lines per achievement",
    "Prioritize target-role skills",
  ],

  requiredContext: [
    "field.currentContent",
    "context.targetJobTitle",
  ],

  systemPrompt: `Optimize resume fields. Be concise. Return content only, no labels.`,

  userPrompt: `{{intent}}\nContext: {{context.role}} @ {{context.company}}{{#if context.targetJobTitle}} | Target: {{context.targetJobTitle}}{{/if}}\nCurrent: {{field.currentContent}}\nGuidelines: {{#each guidelines}}{{this}}; {{/each}}\nOutput improved achievements using STAR format only.`,
};

// Auto-register
templateRegistry.registerField(achievementsFieldTemplate);

export default achievementsFieldTemplate;
