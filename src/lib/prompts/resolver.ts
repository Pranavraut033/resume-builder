/**
 * Prompt Template Resolver
 * Handles context shaping, path extraction, and Handlebars template execution
 */

import * as Handlebars from "handlebars";

import { ContextPath, ShapedContext, ResolvedPrompt, PromptTemplate } from "./types";

// Register Handlebars helpers
Handlebars.registerHelper("json", function (context) {
  return JSON.stringify(context, null, 2);
});

/**
 * Extract value from nested object using dot notation path
 * Example: getByPath(obj, "resume.experience[0].role")
 */
function getByPath(obj: unknown, path: ContextPath): unknown {
  // Handle array indices: "resume.experience[0].role"
  const parts = path.split(/\.|\[|\]/).filter(Boolean);

  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    // Handle numeric indices for arrays
    const index = parseInt(part, 10);
    if (!isNaN(index) && Array.isArray(current)) {
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Set value in nested object using dot notation path
 * Creates intermediate objects as needed
 */
function setByPath(obj: unknown, path: ContextPath, value: unknown): void {
  const parts = path.split(/\.|\[|\]/).filter(Boolean);
  let current = obj as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];
    const nextIsIndex = !isNaN(parseInt(nextPart, 10));

    if (!current[part]) {
      current[part] = nextIsIndex ? [] : {};
    }

    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}

/**
 * Shape context by extracting only required paths
 * This is the TOKEN OPTIMIZATION core
 */
export function shapeContext(
  fullContext: Record<string, unknown>,
  requiredPaths: ContextPath[]
): ShapedContext {
  const shaped: Record<string, unknown> = {};
  const found: ContextPath[] = [];
  const missing: ContextPath[] = [];

  for (const path of requiredPaths) {
    const value = getByPath(fullContext, path);

    if (value !== undefined) {
      setByPath(shaped, path, value);
      found.push(path);
    } else {
      missing.push(path);
    }
  }

  return {
    data: shaped,
    paths: found,
    unused: missing,
  };
}

/**
 * Estimate token count (chars ÷ 4 heuristic)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Resolve template with context
 */
export function resolveTemplate(
  template: PromptTemplate,
  fullContext: Record<string, unknown>,
  options?: {
    warnUnused?: boolean; // Warn about unused context paths
    warnLarge?: boolean; // Warn about large prompts
    maxTokens?: number; // Token warning threshold
  }
): ResolvedPrompt {
  const opts = {
    warnUnused: process.env.NODE_ENV === "development",
    warnLarge: process.env.NODE_ENV === "development",
    maxTokens: 1000,
    ...options,
  };

  // Shape context to minimal required paths
  const shaped = shapeContext(fullContext, template.requiredContext);

  // Warn about missing required context
  if (opts.warnUnused && shaped.unused.length > 0) {
    console.warn(
      `[Prompt Template] Missing required context for template "${template.id}":`,
      shaped.unused
    );
  }

  // Compile and execute Handlebars templates
  const systemTemplate = Handlebars.compile(template.systemPrompt);
  const userTemplate = Handlebars.compile(template.userPrompt);

  const systemPrompt = systemTemplate(shaped.data);
  const userPrompt = userTemplate(shaped.data);

  const combined = systemPrompt + "\n\n" + userPrompt;
  const tokens = estimateTokens(combined);

  // Warn about large prompts
  if (opts.warnLarge && tokens > opts.maxTokens) {
    console.warn(
      `[Prompt Template] Large prompt detected for "${template.id}": ${tokens} tokens (threshold: ${opts.maxTokens})`
    );
  }

  return {
    systemPrompt,
    userPrompt,
    purpose: template.purpose,
    estimatedTokens: tokens,
    outputSchema: template.outputSchema,
  };
}

/**
 * Validate template without executing
 * Checks if all Handlebars variables are covered by requiredContext
 */
export function validateTemplate(template: PromptTemplate): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Try to compile templates
    Handlebars.compile(template.systemPrompt);
    Handlebars.compile(template.userPrompt);
  } catch (error) {
    errors.push(`Template compilation failed: ${error}`);
    return { valid: false, errors, warnings };
  }

  // Extract Handlebars variables (simple regex, not perfect)
  const varRegex = /\{\{([^}]+)\}\}/g;
  const systemVars = [...template.systemPrompt.matchAll(varRegex)].map(m => m[1].trim());
  const userVars = [...template.userPrompt.matchAll(varRegex)].map(m => m[1].trim());
  const allVars = new Set([...systemVars, ...userVars]);

  // Check if requiredContext covers all variables
  for (const varPath of allVars) {
    // Skip Handlebars helpers (if, each, etc.)
    if (varPath.startsWith("#") || varPath.startsWith("/") || varPath.startsWith("@")) {
      continue;
    }

    // Check if this variable path is covered by requiredContext
    const isCovered = template.requiredContext.some(path =>
      varPath.startsWith(path) || path.startsWith(varPath)
    );

    if (!isCovered) {
      warnings.push(`Variable "${varPath}" not covered by requiredContext`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
