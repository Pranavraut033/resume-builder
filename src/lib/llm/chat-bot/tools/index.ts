import logger from "@/lib/logger";
import { ResumeOp } from "@/lib/resume/editor";
import { JSONSchemaProperty, ToolDefinition } from "@/types/llm";

import { IntentLabel } from "../prompts/intentClassifier";

export type EditResumeToolResult = {
  ops: ResumeOp[];
  change_summary?: string;
};

const RESUME_OP_SCHEMA: JSONSchemaProperty = {
  type: "object",
  description:
    "A single RFC-6902-style JSON Patch operation targeting the resume by " +
    "JSON Pointer path — never echo the field's existing content back.",
  properties: {
    op: {
      type: "string",
      enum: ["replace", "add", "remove"],
      description:
        '"replace" changes an existing leaf/array item in place; "add" ' +
        "inserts at an array index or appends with a trailing /- path; " +
        '"remove" deletes an existing leaf/array item.',
    },
    path: {
      type: "string",
      description:
        'JSON Pointer to the target, e.g. "/experience/0/achievements/1" or ' +
        '"/summary". Must name a path that exists in the resume path list ' +
        "(for add, the parent array must exist; the index may be the array's " +
        'length or "-" to append).',
    },
    value: {
      description:
        "New value for the path. Required for replace/add; omit for remove.",
    },
  },
  required: ["op", "path"],
};

function buildEditResumeTool(): ToolDefinition {
  return {
    name: "edit_resume",
    description:
      "Apply one or more targeted edits to the resume by JSON Pointer path. " +
      "Never echo whole fields or arrays back — name only the paths that " +
      "actually change.",
    parameters: {
      type: "object",
      properties: {
        ops: {
          type: "array",
          description: "List of JSON Patch-style ops to apply atomically",
          items: RESUME_OP_SCHEMA,
          minItems: 1,
        },
        change_summary: {
          type: "string",
          description: "One sentence describing what changed and why",
        },
      },
      required: ["ops"],
    },
  };
}

export const RESUME_TOOLS = {
  [IntentLabel.Edit]: buildEditResumeTool(),
};

const VALID_OPS = new Set(["replace", "add", "remove"]);

export function validateEditResumeArgs(
  args: unknown
): asserts args is EditResumeToolResult {
  logger.info(
    "validateEditResumeArgs",
    "Validating edit_resume tool arguments:",
    args
  );

  if (args === null || typeof args !== "object") {
    throw new Error(
      `Invalid tool call arguments: expected object, got ${args === null ? "null" : typeof args}`
    );
  }

  const obj = args as Record<string, unknown>;

  if (!("ops" in obj)) {
    throw new Error(
      `Invalid tool call arguments: missing required field "ops"`
    );
  }

  if (!Array.isArray(obj.ops)) {
    throw new Error(
      `Invalid tool call arguments: "ops" must be an array, got ${obj.ops === null ? "null" : typeof obj.ops}`
    );
  }

  if (obj.ops.length === 0) {
    throw new Error(
      `Invalid tool call arguments: "ops" must contain at least one item`
    );
  }

  obj.ops.forEach((item, i) => {
    try {
      validateSingleOpArg(item);
    } catch (e) {
      throw new Error(
        `Invalid tool call arguments: ops[${i}] is invalid — ${(e as Error).message}`
      );
    }
  });

  if ("change_summary" in obj && typeof obj.change_summary !== "string") {
    throw new Error(
      `Invalid tool call arguments: "change_summary" must be a string when present, got ${typeof obj.change_summary}`
    );
  }
}

export function validateSingleOpArg(arg: unknown): asserts arg is ResumeOp {
  if (arg === null || typeof arg !== "object") {
    throw new Error(
      `expected object, got ${arg === null ? "null" : typeof arg}`
    );
  }

  const obj = arg as Record<string, unknown>;

  if (!("op" in obj) || typeof obj.op !== "string") {
    throw new Error(`missing or non-string required property "op"`);
  }

  if (!VALID_OPS.has(obj.op)) {
    throw new Error(
      `"op" must be one of [replace, add, remove], got "${obj.op}"`
    );
  }

  if (!("path" in obj) || typeof obj.path !== "string" || obj.path === "") {
    throw new Error(`"path" must be a non-empty string`);
  }

  if ((obj.op === "replace" || obj.op === "add") && !("value" in obj)) {
    throw new Error(`"value" is required for op "${obj.op}"`);
  }
}
