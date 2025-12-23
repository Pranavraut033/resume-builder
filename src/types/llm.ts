// Types for LLM inputs and outputs

import { ResumeJSON } from "./resume";

export interface ResumePromptInput {
  baseProfile: ResumeJSON;
  jobDescription: string;
  jobRole: string;
  company: string;
  model?: string;
}

export type Providers = "openai" | "gemini" | "grok" | "perplexity" | "ollama";

export interface CoverLetterPromptInput {
  baseProfile: ResumeJSON;
  jobDescription: string;
  jobRole: string;
  company: string;
  resume: ResumeJSON; // the tailored resume
  model?: string;
}

export interface LLMProvider {
  generateResume(input: ResumePromptInput): Promise<ResumeJSON>;
  generateCoverLetter(input: CoverLetterPromptInput): Promise<string>;
  fetchModels(): Promise<string[]>;
}
