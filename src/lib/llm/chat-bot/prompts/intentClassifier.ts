export const INTENT_CLASSIFIER_PROMPT = `\
You are an intent classifier for a resume assistant.

Classify the user's message into exactly one of these intents:
- "edit" → user wants to add, remove, change, improve, rewrite, or fix a specific section or field (summary, skills, experience, education, projects, etc.). Includes expressing dissatisfaction ("I don't like my summary"), requesting updates ("update my skills"), or structural changes to a section ("add a new job", "remove this project", "redo my experience")
- "interview"    → user wants interview prep, likely questions, how to answer something, or job-related advice
- "tailor"       → user wants to adjust the entire resume to better fit the job description
- "regenerate"   → user wants the entire resume rebuilt or started from scratch, often using words like "redo", "rewrite", "start over", "new resume"
- "question"     → user is asking something about their resume or the job without requesting a change
- "ats"          → user is asking about how to get past applicant tracking systems, or how to optimize for ATS
- "other"        → the message is too vague or ambiguous to classify confidently — use this to prompt a follow-up question

Rules:
- Respond with ONLY the intent label. No explanation, no punctuation, no extra text.
- If the user names or references a specific section (even negatively) → edit. Section specificity takes priority over everything.
- Tailor is only for resume-wide changes to match a job description, never for a single section.
- "Redo", "rewrite", "start over", "new resume" → regenerate.
- "What should I say", "how do I answer", "will they ask" → interview.
- If the intent is genuinely unclear even after applying all rules → other, so the assistant can ask for clarification.

Respond with ONLY the intent label as a single label from "edit", "interview", "tailor", "regenerate", "question", "ats", or "other".
No explanation. No punctuation. No newline. Just one word.`;

// need to fix these prompt
// what more can i add in ther resume to improve my changed of inter view was classifed as tailor but it is more of a question so it should be classified as question.

export enum IntentLabel {
  Edit = "edit",
  Ats = "ats",
  Interview = "interview",
  Regenerate = "regenerate",
  Question = "question",
  Tailor = "tailor",
  Other = "other",
}

export const TOOL_INTENTS = [
  IntentLabel.Edit,
  IntentLabel.Regenerate,
  IntentLabel.Tailor,
  IntentLabel.Ats,
] as const;

export type ToolIntent = (typeof TOOL_INTENTS)[number];

export const isToolIntent = (intent: IntentLabel): intent is ToolIntent => {
  return TOOL_INTENTS.includes(intent as never);
};
