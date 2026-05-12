// Types for LLM inputs and outputs

import { LLMUsageInfo } from "@/actions/tokenUsage";

import { HumanizerJSON } from "./humanizer";
import { ATSAnalysisJSON, JobDetailsJSON, ResumeJSON } from "./resume";

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
  jobDetails: JobDetailsJSON;
}

export interface CoverLetterPromptInput {
  jobDetails: JobDetailsJSON;
  resume: ResumeJSON; // the tailored resume
}

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResult<T = string> {
  result: T;
  usage: LLMUsageInfo;
}

export type TextGenerationResult = LLMResult<string>;
export type ResumeGenerationResult = LLMResult<ResumeJSON>;
export type CoverLetterGenerationResult = LLMResult<string>;
export type JobParsingResult = LLMResult<JobDetailsJSON>;
export type ResumeParsingResult = LLMResult<ResumeJSON>;
export type HumanizeContentResult = LLMResult<HumanizerJSON>;
export type ATSAnalysisResult = LLMResult<ATSAnalysisJSON>;

export interface LLMGenerationOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
}
