// Types for LLM inputs and outputs

import { ResolvedPrompt } from "@/lib/llm/prompts";

import { HumanizerResult } from "./humanizer";
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
  ANTHROPIC = "anthropic",
}

export interface ResumePromptInput {
  baseProfile: ResumeJSON;
  jobDetails: JobDetails;
}

export interface CoverLetterPromptInput {
  baseProfile: ResumeJSON;
  jobDetails: JobDetails;
  resume: ResumeJSON; // the tailored resume
}

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMUsageInfo {
  inputTokens: number;
  outputTokens: number;
}

export interface LLMResult<T = string> {
  result: T;
  prompt?: ResolvedPrompt;
  usage?: LLMUsageInfo;
}

export type TextGenerationResult = LLMResult<string>;
export type ResumeGenerationResult = LLMResult<ResumeJSON>;
export type CoverLetterGenerationResult = LLMResult<string>;
export type JobParsingResult = LLMResult<JobDetails>;
export type ResumeParsingResult = LLMResult<ResumeJSON>;
export type HumanizeContentResult = LLMResult<HumanizerResult>;

export interface LLMGenerationOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
}
