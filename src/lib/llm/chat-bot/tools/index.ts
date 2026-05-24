import z from "zod";

import logger from "@/lib/logger";
import { JSONSchemaProperty, ToolDefinition } from "@/types/llm";
import { RESUME_FIELD_NAMES, ResumeField, ResumeSchema } from "@/types/resume";

import { IntentLabel } from "../prompts/intentClassifier";

export interface FieldEdit {
  field: ResumeField; // keyof typeof ResumeSchema.shape
  updated_content: unknown;
}

export type EditToolResult = {
  edits: FieldEdit[];
  change_summary?: string;
};

function buildEditFieldsTool(): ToolDefinition {
  const fieldSchemas = RESUME_FIELD_NAMES.map((key) => {
    const schema = ResumeSchema.shape[key];
    const jsonSchema = schema
      ? (z.toJSONSchema(schema) as JSONSchemaProperty)
      : { type: "object" as const };
    return { title: key, ...jsonSchema };
  }).filter(Boolean);

  return {
    name: "edit_fields",
    description:
      "Update one or more resume sections. Each edit targets a specific field; " +
      "for subsection changes (e.g. one job entry), return the complete field " +
      "array with the targeted item already merged in.",
    parameters: {
      type: "object",
      properties: {
        edits: {
          type: "array",
          description: "List of field edits to apply atomically",
          items: {
            type: "object",
            properties: {
              field: {
                type: "string",
                enum: RESUME_FIELD_NAMES,
                description: "The resume section to update",
              },
              updated_content: {
                description:
                  "Complete new value for the field. For array fields " +
                  "(experience, education, projects, skills) always return " +
                  "the full array even when editing a single item.",
                anyOf: fieldSchemas,
              },
            },
            required: ["field", "updated_content"],
          },
          minItems: 1,
        },
        change_summary: {
          type: "string",
          description: "One sentence describing what changed and why",
        },
      },
      required: ["edits"],
    },
  };
}

export const RESUME_TOOLS = {
  [IntentLabel.Edit]: buildEditFieldsTool(),
};

export function validateEditFieldArgs(
  args: unknown
): asserts args is EditToolResult {
  logger.info(
    "validateEditFieldArgs",
    "Validating edit_fields tool arguments:",
    args
  );

  if (args === null || typeof args !== "object") {
    throw new Error(
      `Invalid tool call arguments: expected object, got ${args === null ? "null" : typeof args}`
    );
  }

  const obj = args as Record<string, unknown>;

  // "edits" must be present and must be an array
  if (!("edits" in obj)) {
    throw new Error(
      `Invalid tool call arguments: missing required field "edits"`
    );
  }

  if (!Array.isArray(obj.edits)) {
    throw new Error(
      `Invalid tool call arguments: "edits" must be an array, got ${obj.edits === null ? "null" : typeof obj.edits}`
    );
  }

  if (obj.edits.length === 0) {
    throw new Error(
      `Invalid tool call arguments: "edits" must contain at least one item`
    );
  }

  for (let i = 0; i < obj.edits.length; i++) {
    try {
      validateSingleEditArg(obj.edits[i]);
    } catch (e) {
      throw new Error(
        `Invalid tool call arguments: edits[${i}] is invalid — ${(e as Error).message}`
      );
    }
  }

  if ("change_summary" in obj && typeof obj.change_summary !== "string") {
    throw new Error(
      `Invalid tool call arguments: "change_summary" must be a string when present, got ${typeof obj.change_summary}`
    );
  }
}

export function validateSingleEditArg(arg: unknown): asserts arg is FieldEdit {
  if (arg === null || typeof arg !== "object") {
    throw new Error(
      `expected object, got ${arg === null ? "null" : typeof arg}`
    );
  }

  const obj = arg as Record<string, unknown>;

  if (!("field" in obj)) {
    throw new Error(`missing required property "field"`);
  }

  if (typeof obj.field !== "string") {
    throw new Error(`"field" must be a string, got ${typeof obj.field}`);
  }

  if (!RESUME_FIELD_NAMES.includes(obj.field as ResumeField)) {
    throw new Error(
      `"field" must be one of [${RESUME_FIELD_NAMES.join(", ")}], got "${obj.field}"`
    );
  }

  if (!("updated_content" in obj)) {
    throw new Error(`missing required property "updated_content"`);
  }

  if (obj.updated_content === null || obj.updated_content === undefined) {
    throw new Error(`"updated_content" must not be null or undefined`);
  }
}
