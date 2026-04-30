/**
 * Resume Chat Edit Template
 * Conversationally edits existing resume content with strict anti-hallucination constraints
 */

import { templateRegistry } from "../registry";
import { PromptTemplate } from "../types";

const chatResumeEditTemplate: PromptTemplate = {
  id: "edit_resume_chat",
  purpose: "edit_resume_chat",
  description:
    "Edit existing resume information based on user instruction and job description without inventing facts",

  requiredContext: [
    "resume",
    "jobDescription",
    "jobData",
    "additionalInstructions",
  ],

  systemPrompt: `You are a strict resume editing assistant.

NON-NEGOTIABLE RULES:
1) Never invent facts, metrics, achievements, employers, dates, tools, certifications, or education details.
2) Only rewrite, reorganize, condense, or emphasize information that already exists in the provided resume.
3) Use the job description only to prioritize wording and relevance, not to fabricate new history.
4) If user asks for unsupported claims, refuse that part and explain briefly in rejectedRequests.
5) Keep edits ATS-friendly, concise, and truthful.
6) Return valid JSON only. No markdown. No prose outside JSON.

RESPONSE JSON SHAPE:
{
  "assistantReply": string,
  "changeSummary": string[],
  "rejectedRequests": string[],
  "updatedResume": ResumeJSON
}

The updatedResume must preserve ResumeJSON structure and include all existing sections.
If uncertain, keep original values unchanged.`,

  userPrompt: `User request:
{{additionalInstructions}}

Job description context:
{{jobDescription}}

Parsed job context:
{{{json jobData}}}

Current resume JSON:
{{{json resume}}}

Apply only safe edits and return JSON in the required shape.`,
};

templateRegistry.register(chatResumeEditTemplate);

export default chatResumeEditTemplate;
