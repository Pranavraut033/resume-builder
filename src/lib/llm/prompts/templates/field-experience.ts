/**
 * Experience Generation Template
 * Creates achievement-focused work experience descriptions
 * Field-specific template with intent and guidelines
 */

import z from "zod";

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const experienceTemplate: PromptTemplate = {
  id: "generate_experience",
  purpose: "generate_experience",
  description: "Generate work experience descriptions with achievements",

  fieldType: "experience_description",
  intent:
    "Rewrite each role's bullets to lead with measurable achievements, surface job-relevant skills naturally, and read like a high-performing candidate wrote them — not a job description.",
  guidelines: [
    "3–4 bullets per role, each opening with a distinct strong action verb",
    "Lead the strongest achievement bullet first — recruiters read top-down",
    "Quantify impact wherever the source material supports it: %, time saved, revenue, scale, team size",
    "When no metric exists, describe scope and technical specificity instead — never fabricate numbers",
    "Frame as achievements, not duties: what changed or improved because of this person's work",
    "Surface required and tech stack skills from the job description naturally within bullet context",
    "1–2 lines per bullet — cut anything that doesn't add signal",
  ],

  requiredContext: ["resume", "jobDetails", "jobDescription"],

  systemPrompt: `You are a senior resume writer specializing in technical and professional work experience.

OUTPUT CONTRACT:
- Return ONLY valid JSON as an array of strings — one string per role, in the same order as the input
- Each string contains the complete bullet set for that role, formatted as newline-separated bullets
- No markdown headers, no role labels, no prose outside bullets

DATA INTEGRITY (non-negotiable):
- Rewrite using ONLY details, responsibilities, and achievements present in the source experience entry
- Never invent metrics, promotions, technologies, or outcomes not in the source
- If a role has no quantifiable result, describe scope and technical decisions precisely — do not pad with fabricated numbers

BULLET QUALITY BAR:
- Strong: "Reduced CI pipeline runtime by 60% by parallelizing test suites across 8 workers, cutting release cycles from 3 days to 18 hours"
- Weak: "Improved CI/CD pipeline efficiency and worked with the team to reduce deployment time"
- Every bullet must answer: what did you do, how, and what was the result or scale`,

  userPrompt: `Rewrite work experience bullets for the {{jobData.job.job_title}} role.

TARGET ROLE CONTEXT:
- Required Skills: {{#each jobData.requirements.required_skills}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Tech Stack: {{#each jobData.requirements.tech_stack}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Job Description: {{jobDescription}}

CANDIDATE EXPERIENCE (source of truth):
{{#each resume.experience}}
Role {{@index}}: {{this.role}} at {{this.company}} ({{this.startDate}}–{{this.endDate}})
Current Bullets: {{this.description}}
{{#if this.technologies}}Technologies: {{#each this.technologies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
---
{{/each}}

TASK:
1. For each role, extract every stated achievement, responsibility, technology, and metric from the current bullets
2. Identify which details overlap with the target role's required skills and tech stack
3. Rewrite 3–4 bullets per role:
   - Bullet 1: strongest quantified or scoped achievement
   - Bullets 2–3: job-relevant technical contributions with context
   - Bullet 4 (if needed): scope, scale, or cross-functional signal
4. Vary the opening action verb across all bullets within each role

Return ONLY valid JSON: an array of strings, one per role, in input order.`,

  outputSchema: z.array(
    z
      .string()
      .describe(
        "Newline-separated achievement bullets for one role, rewritten from source material only"
      )
  ),
};

// Auto-register on module load
templateRegistry.register(experienceTemplate);

export default experienceTemplate;
