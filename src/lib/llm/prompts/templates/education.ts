/**
 * Education Generation Template
 * Creates concise and relevant education summaries
 * Field-specific template with intent and guidelines
 */

import { EducationSchema } from "@/types/resume";

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const educationTemplate: PromptTemplate = {
  id: "generate_education",
  purpose: "generate_education",
  description: "Generate education summaries with relevant details",

  fieldType: "education_description",
  intent:
    "Rewrite each education entry into a tight 1–2 sentence description that surfaces only the details a hiring manager for this specific role would find signal-worthy — everything else is noise.",
  guidelines: [
    "1–2 sentences per entry — treat every word as earned",
    "Include GPA only if ≥ 3.5 and the role is early-career or explicitly values academic performance",
    "Include coursework only if it directly maps to a required or preferred skill in the job description",
    "Include honors, awards, or thesis only if they demonstrate capability relevant to the target role",
    "Include leadership or extracurriculars only if they signal skills the job requires (e.g. team leadership, research, public speaking)",
    "If none of the above conditions apply, a single clean line stating degree, field, school, and graduation year is sufficient — do not pad",
    "Never repeat information already clear from the degree title or field of study",
  ],

  requiredContext: ["resume", "jobDetails", "jobDescription"],

  systemPrompt: `You are a resume editor specializing in concise, high-signal education sections.

OUTPUT CONTRACT:
- Return ONLY valid JSON matching the EducationJSON schema — no markdown, no prose
- Each education object must preserve all original fields; only the description field is rewritten

DATA INTEGRITY (non-negotiable):
- Use ONLY details present in the source education entry
- Never invent coursework, honors, GPA, or achievements not in the source

SIGNAL VS. NOISE RULE:
- Signal: a detail that changes how a hiring manager perceives the candidate's fit for this role
- Noise: a detail that is generic, expected for the degree, or unrelated to the target role
- When in doubt, omit — a clean, accurate one-liner outperforms a padded two-sentence entry`,

  userPrompt: `Rewrite education descriptions for the {{jobData.job.job_title}} role.

TARGET ROLE CONTEXT:
- Education Requirement: {{jobData.requirements.education}}
- Required Skills: {{#each jobData.requirements.required_skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Job Description: {{jobDescription}}

CANDIDATE EDUCATION (source of truth):
{{#each resume.education}}
Entry {{@index}}:
- Degree: {{this.degree}} in {{this.field}}
- School: {{this.school}} ({{this.graduationDate}})
{{#if this.gpa}}- GPA: {{this.gpa}}{{/if}}
{{#if this.honors}}- Honors: {{this.honors}}{{/if}}
{{#if this.coursework}}- Coursework: {{this.coursework}}{{/if}}
{{#if this.activities}}- Activities: {{this.activities}}{{/if}}
- Current Description: {{this.description}}
---
{{/each}}

TASK:
1. Check whether each available detail (GPA, coursework, honors, activities) clears the signal bar for this specific role
2. Include only what passes — discard the rest
3. Write 1–2 sentences that feel earned, not padded

Return ONLY valid JSON matching the EducationSchema schema.`,
  outputSchema: EducationSchema,
};

// Auto-register on module load
templateRegistry.register(educationTemplate);

export default educationTemplate;
