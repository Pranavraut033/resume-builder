/**
 * Skills Generation Template
 * Organizes and prioritizes technical and soft skills
 */

import z from "zod";

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const skillsTemplate: PromptTemplate = {
  id: "generate_skills",
  purpose: "generate_skills",
  description: "Generate and organize skills list for a resume",

  fieldType: "skills",
  intent:
    "Curate and reorder the candidate's existing skills to maximize ATS keyword hits for the target role — required skills surface first, irrelevant ones are dropped.",
  guidelines: [
    "Only include skills already present in the candidate's resume — never add new ones",
    "Order: exact required matches → semantic required matches → tech stack overlaps → nice-to-haves → remaining relevant skills",
    "Use the exact terminology from the job description where the candidate's skill is equivalent (e.g. prefer 'PostgreSQL' over 'SQL' if that's what the JD uses and the candidate knows it)",
    "Group into categories where 4+ skills share a domain (e.g. Languages, Frameworks, Cloud, Tools)",
    "Omit soft skills unless explicitly listed as required in the job description",
    "Remove duplicates and near-duplicates — keep the more specific term",
  ],

  requiredContext: ["resume", "jobDetails"],

  systemPrompt: `You are a technical skills curator specializing in ATS-optimized resume optimization.

OUTPUT CONTRACT:
- Return ONLY valid JSON matching the schema: { skills: string[] }
- Skills are plain strings — no markdown, no bullet prefixes, no category headers in the array

DATA INTEGRITY (non-negotiable):
- Output ONLY skills explicitly present in the candidate's resume
- Never introduce tools, technologies, or competencies not in the source profile
- Fabrication of any skill is a critical failure

TERMINOLOGY RULE:
- If the candidate lists "Postgres" and the JD says "PostgreSQL" — use "PostgreSQL" (same skill, JD's preferred term)
- If the candidate lists "machine learning" and the JD requires "PyTorch" — omit PyTorch (different skill, not present)`,

  userPrompt: `Curate the skills list for the {{jobData.job.job_title}} role.

JOB REQUIREMENTS:
- Required Skills: {{#each jobData.requirements.required_skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Tech Stack: {{#each jobData.requirements.tech_stack}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Nice-to-Have: {{#each jobData.requirements.nice_to_have_skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

CANDIDATE'S CURRENT SKILLS (source of truth):
{{#each resume.skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

FULL RESUME CONTEXT:
{{{json resume}}}

TASK:
1. Map each required skill and tech stack item against the candidate's skills — classify as matched or absent
2. Build the output list using matched skills only, ordered by the priority sequence in guidelines
3. Apply JD terminology to matched skills where appropriate
4. Drop any candidate skill with no relevance to this role

Return ONLY valid JSON: { "skills": [...] }`,

  outputSchema: z.object({
    skills: z
      .array(z.string())
      .describe(
        "Prioritized, ATS-optimized skills list drawn exclusively from the candidate's existing profile"
      ),
  }),
};

// Auto-register on module load
templateRegistry.register(skillsTemplate);

export default skillsTemplate;
