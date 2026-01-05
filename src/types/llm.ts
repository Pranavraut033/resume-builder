// Types for LLM inputs and outputs

import { JobDetails, ResumeJSON } from "./resume";

/**
 * Provider type enumeration
 * All available LLM providers must be defined here
 */
export enum ProviderType {
  OPENAI = "openai",
  GEMINI = "gemini",
  GROK = "grok",
  PERPLEXITY = "perplexity",
  OLLAMA = "ollama",
}

/**
 * Legacy type alias for backwards compatibility during migration
 * New code should use ProviderType enum
 */
export type Providers = "openai" | "gemini" | "grok" | "perplexity" | "ollama";

export interface ResumePromptInput {
  baseProfile: ResumeJSON;
  jobDescription: string;
  jobRole: string;
  company: string;
  model?: string;
}


export interface CoverLetterPromptInput {
  baseProfile: ResumeJSON;
  jobDescription: string;
  jobRole: string;
  company: string;
  resume: ResumeJSON; // the tailored resume
  model?: string;
}

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PromptResponse {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface LLMUsageInfo {
  inputTokens: number;
  outputTokens: number;
}

export interface ResumeGenerationResult {
  resume: ResumeJSON;
  usage?: LLMUsageInfo;
}

export interface CoverLetterGenerationResult {
  coverLetter: string;
  usage?: LLMUsageInfo;
}

export interface LLMGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  // Core generation methods
  generateResume(input: ResumePromptInput): Promise<ResumeJSON>;
  generateCoverLetter(input: CoverLetterPromptInput): Promise<string>;

  // Text generation (for unified prompt system)
  generateText(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMGenerationOptions
  ): Promise<string>;

  // Parsing methods (optional - not all providers support these)
  parseJobDetails?(description: string, model?: string): Promise<JobDetails>;
  parseResume?(resumeText: string, model?: string): Promise<ResumeJSON>;

  // Model and capabilities
  fetchModels(): Promise<string[]>;
  runPrompt(
    messages: PromptMessage[],
    model?: string,
    maxTokens?: number
  ): Promise<PromptResponse>;
}
