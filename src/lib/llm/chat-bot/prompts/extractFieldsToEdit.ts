/**
 * Extract Fields to Edit Template
 * Identifies which resume sections need updating based on user instruction
 */

import { z } from "zod";

import { PromptTemplate, templateRegistry } from "@/lib/llm/prompts";
import { RESUME_FIELD_NAMES } from "@/types/resume";

// Output schema
export const EditFieldOutputSchema = z
  .object({
    edits: z.array(
      z.object({
        field: z
          .string({})
          .describe("Top-level resume field name from the schema"),
        change: z.string().describe("Concise description of what to change"),
      })
    ),
  })
  .describe("List of fields to edit with change instructions");

export type EditFieldOutput = z.infer<typeof EditFieldOutputSchema>;

const extractFieldsTemplate: PromptTemplate = {
  id: "extract_fields_to_edit",
  purpose: "extract_fields_to_edit",
  description:
    "Identify which resume fields need to be edited based on user instruction",

  intent:
    "Map the user's edit instruction to the correct resume field names, so only relevant sections are passed to the editor.",

  requiredContext: ["userInput"],

  systemPrompt: `\
You are a routing assistant that identifies which resume sections need to be edited.

## Context you have
- **Resume schema**: the valid top-level field names and their types
- **User instruction**: what they explicitly asked to change

## Your task
- Identify which top-level fields the user wants to edit based on the schema.
- For each matched field, write a concise description of the specific change requested.
- Only include fields the user explicitly or clearly implicitly wants changed. When in doubt, omit.
- Only return field names that exist in the provided schema.

## Output rules
- Respond ONLY with a valid JSON array. No explanation, no markdown, no preamble.
- Each item must follow this schema exactly:
- Field names must be exact top-level keys from the schema.
  Never use dot-notation (e.g. "header.headline" is invalid — use "header" instead).
  Sub-field targeting goes in the "change" description, not the field name.

{ "field": string, "change": string }

## Examples

Schema fields: summary, experience, skills, education, projects
User: "Add my new job at Stripe and update my skills to include Rust"
Output:
[
  { "field": "experience", "change": "add new role at Stripe" },
  { "field": "skills", "change": "add Rust to skill list" }
]

User: "Rewrite my summary to sound more senior"
Output:
[
  { "field": "summary", "change": "rewrite to reflect senior-level tone and scope" }
]

User: "Update my headline and summary"
Output:
[
  { "field": "header", "change": "update headline to include ATS-friendly keywords from the JD" },
  { "field": "summary", "change": "update to include ATS-friendly keywords from the JD" }
]
`,

  userPrompt: `\
Valid resume fields: ${RESUME_FIELD_NAMES.join(", ")}

User instruction:
{{userInput}}
`,

  outputSchema: EditFieldOutputSchema,
};

export type EditFieldOutputJSON = z.infer<typeof EditFieldOutputSchema>;

templateRegistry.register(extractFieldsTemplate);

export default extractFieldsTemplate;
