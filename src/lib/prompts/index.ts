/**
 * Prompt Template System Entry Point
 * Centralized template library with Handlebars-based templates
 */

// Import types
export * from "./types";
export * from "./resolver";
export * from "./registry";
export * from "./validation";
export * from "./documentation";
export * from "./provider";

// Import all templates to trigger registration
import "./templates/summary";
import "./templates/experience";
import "./templates/skills";
import "./templates/projects";
import "./templates/education";
import "./templates/parsing";
import "./templates/ats";
import "./templates/resume-tailoring";
import "./templates/cover-letter";

// Import all field templates
import "./fieldTemplates/summary";
import "./fieldTemplates/education";
import "./fieldTemplates/experience";
import "./fieldTemplates/achievements";

// Re-export registry instance
export { templateRegistry } from "./registry";

// Convenience functions
import { PromptPurpose } from "@/lib/promptSystem";

import { templateRegistry } from "./registry";
import { resolveTemplate, shapeContext } from "./resolver";
import { ResolvedPrompt } from "./types";

/**
 * Get and resolve template by purpose
 */
export function getPromptByPurpose(
  purpose: PromptPurpose,
  context: Record<string, unknown>
): ResolvedPrompt {
  const template = templateRegistry.getByPurpose(purpose);

  if (!template) {
    throw new Error(`No template found for purpose: ${purpose}`);
  }

  return resolveTemplate(template, context);
}

/**
 * Get and resolve field template by type
 */
export function getFieldPrompt(
  fieldType: string,
  context: Record<string, unknown>
): ResolvedPrompt {
  const template = templateRegistry.getFieldByType(fieldType);

  if (!template) {
    throw new Error(`No field template found for type: ${fieldType}`);
  }

  // Convert field template to resolved prompt format
  const systemTemplate = template.systemPrompt;
  const userTemplate = template.userPrompt;

  // Compile with Handlebars
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Handlebars = require("handlebars") as typeof import("handlebars");
  const systemCompiled = Handlebars.compile(systemTemplate);
  const userCompiled = Handlebars.compile(userTemplate);

  // Shape context based on required paths
  const shaped = shapeContext(context, template.requiredContext);

  // Add intent and guidelines to context
  const enrichedContext = {
    ...shaped.data,
    intent: template.intent,
    guidelines: template.guidelines,
  };

  const systemPrompt = systemCompiled(enrichedContext);
  const userPrompt = userCompiled(enrichedContext);

  return {
    systemPrompt,
    userPrompt,
    purpose: "generate_summary", // Default purpose for field prompts
    estimatedTokens: Math.ceil((systemPrompt.length + userPrompt.length) / 4),
    outputSchema: template.outputSchema,
  };
}
