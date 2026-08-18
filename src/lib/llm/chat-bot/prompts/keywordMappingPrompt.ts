/**
 * ATS Fix Mapping Schema
 * Shared argument contract for mapping a set of findings (missing keyword,
 * suggested improvement, knockout risk, title mismatch) directly to
 * path-targeted resume edit ops, based on the candidate's EXISTING content —
 * no fabrication. Historically also carried an ATS-fix-mapping PromptTemplate
 * that re-prompted a model to derive these ops; that round trip is gone —
 * `align_resume_terms` is a tool now (see the MCP surface), and the calling
 * model already holds the findings and the resume path lines, so it supplies
 * ops matching this schema directly as tool arguments instead.
 */

import { z } from "zod";

import { ResumeOp } from "@/lib/resume/editor";
import { SkillSchema } from "@/types/resume";

export const AtsFixMappingSchema = z.object({
  ops: z.array(
    z.object({
      item: z.string().describe("The exact ATS finding being addressed"),
      op: z
        .enum(["replace", "add", "remove"])
        .describe("The JSON Patch operation to apply"),
      path: z
        .string()
        .describe(
          "JSON Pointer to the resume leaf/array item to change, taken from the resume path list"
        ),
      // `.nullable()` (not `.optional()`) and a concrete union rather than
      // `z.unknown()` — OpenAI's structured-outputs API rejects both
      // optional-without-nullable fields and untyped schemas. ATS fix ops
      // only ever write a string leaf/array item or a whole skill entry.
      value: z
        .union([z.string(), SkillSchema])
        .nullable()
        .describe("New value for the path; null for remove"),
    })
  ),
});

export type AtsFixMapping = z.infer<typeof AtsFixMappingSchema>;

/**
 * Convert the mapping schema's ops (which carry the "item" finding label for
 * logging/context) into plain ResumeOp[] ready for applyResumeOps.
 */
export function mappingsToResumeOps(
  mappings: AtsFixMapping["ops"]
): ResumeOp[] {
  return mappings.map(({ op, path, value }) => {
    if (op === "remove") return { op, path };
    return { op, path, value };
  });
}
