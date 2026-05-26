// prompts/editField.ts

import { ResumeJSON } from "@/types/resume";

import { EditFieldOutputJSON } from "./extractFieldsToEdit";

export const buildEditFieldPrompt = (
  resume: ResumeJSON,
  fieldChanges: EditFieldOutputJSON,
  jd: string
) => {
  const resumeFields = Object.fromEntries(
    Object.entries(resume).filter(([key]) =>
      fieldChanges.edits.some((change) => change.field === key)
    )
  );

  return `\
You are a precise resume editor. The user wants to update specific sections of their resume to better align with a target job description.

## Context you have
- **Resume sections**: only the fields relevant to this edit (not the full resume)
- **Requested changes**: what to change in each field
- **Job description**: the role they are targeting
- **Field schema**: defined in the tool — your output must conform to it exactly

## Editing rules
- Edit ONLY the fields provided. Do not reference or infer other sections.
- Preserve all existing data in a field unless the change explicitly asks to remove it.
- Do not invent experience, skills, or credentials. Only reframe or reword what already exists.
- If a change description is ambiguous, make the most conservative edit.
- For subsection edits (e.g. a single job in experience, one skill category), merge your change into the full field array — return the complete field value, not just the changed item.

## How to use the JD
- Mirror keywords, terminology, and phrasing from the JD where they honestly reflect the candidate's experience.
- Prioritize responsibilities and skills the JD emphasizes when choosing what to surface or reorder.
- Match the seniority level and domain language of the role.
- Do NOT add qualifications, tools, or experience the candidate does not have.

## Output rules
IMPORTANT: You MUST call edit_fields with this exact top-level structure:
{ "edits": [ { "field": "...", "updated_content": ... }, ... ], "change_summary": "..." }

- "edits" and "change_summary" are SIBLING keys at the top level — never nested inside each other.
- "change_summary" MUST be a top-level key. NEVER put it as an element of the "edits" array.
- The "edits" array contains ONLY edit objects. No strings, no summaries — objects with "field" and "updated_content" only.
- Every element of "edits" MUST be a plain JSON object with "field" and "updated_content" keys.
- NEVER stringify an edit object into a string (e.g. do NOT write "{\"field\": \"...\"}" as an array element).
- NEVER call edit_fields with a flat object. Always wrap edits in the "edits" array, even for a single field.
---

Resume sections to edit:
\`\`\`json
${JSON.stringify(resumeFields, null, 2)}
\`\`\`

Requested changes:
\`\`\`json: {field: string, summary: string}[]
${fieldChanges.edits.map((c) => `- ${c.field}: ${c.change}`).join("\n")}
\`\`\`

Job Details (Compact Positional):
${jd}
`;
};
