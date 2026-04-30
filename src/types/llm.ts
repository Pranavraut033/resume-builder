// Types for LLM inputs and outputs

import { ResolvedPrompt } from "@/lib/llm/prompts";

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

export interface LLMGenerationOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  // Core generation methods
  generateResume(
    input: ResumePromptInput,
    options: LLMGenerationOptions
  ): Promise<ResumeGenerationResult>;
  generateCoverLetter(
    input: CoverLetterPromptInput,
    options: LLMGenerationOptions
  ): Promise<CoverLetterGenerationResult>;

  // Parsing methods
  parseJobDetails(
    description: string,
    options: LLMGenerationOptions
  ): Promise<JobParsingResult>;
  parseResume(
    resumeText: string,
    options: LLMGenerationOptions
  ): Promise<ResumeParsingResult>;

  // Model and capabilities
  fetchModels(): Promise<string[]>;

  // Validation
  validateConnection(): Promise<{ success: boolean; message: string }>;

  // Text generation (for unified prompt system)
  generateText(
    systemPrompt: string,
    userPrompt: string,
    options: LLMGenerationOptions
  ): Promise<TextGenerationResult>;

  // Low-level LLM call
  runLLM<T>(
    messages: PromptMessage[],
    options: LLMGenerationOptions
  ): Promise<{ result: T; usage?: LLMUsageInfo }>;
}
