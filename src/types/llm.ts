// Types for LLM inputs and outputs
//
// Tool/schema/generation-option shapes below are re-exported straight from
// @pranavraut033/llm-core instead of hand-copied — this file used to keep
// its own duplicate definitions, which silently drifted from the package
// (e.g. missing `reasoningEffort`, `ToolChoice` missing `"required"`) until
// a provider-options change broke type-checking downstream. `PromptMessage`
// and `LLMResult` stay local/re-exported-and-narrowed deliberately (see
// below) since the app doesn't use llm-core's multimodal message content.

import { LLMUsageInfo } from "@/actions/tokenUsage";

import { DocumentAnalysisJSON } from "./documentAnalysis";
import { HumanizerJSON } from "./humanizer";
import { JobDetailsJSON, ResumeJSON } from "./resume";

import type { ToolCall } from "@pranavraut033/llm-core";

export type {
  JSONSchemaType,
  JSONSchemaProperty,
  ToolParameter,
  ToolDefinition,
  ToolCall,
  ToolChoice,
  LLMResponseType,
  LLMResponse,
  LLMGenerationOptions,
  ReasoningEffort,
} from "@pranavraut033/llm-core";

/**
 * Provider type enumeration
 * All available LLM providers must be defined here
 */
export enum ProviderType {
  OPENAI = "openai",
  GEMINI = "gemini",
  GROK = "grok",
  GROQ = "groq",
  PERPLEXITY = "perplexity",
  OLLAMA = "ollama",
  ANTHROPIC = "anthropic",
  DEEPSEEK = "deepseek",
  MISTRAL = "mistral",
  OPENROUTER = "openrouter",
  MANAGED = "managed",
}

export interface ResumePromptInput {
  baseProfile: ResumeJSON;
  jobDetails: JobDetailsJSON;
  // Historically an ATS analysis; Deep Analysis (analyze_document) is the
  // successor schema — see PromptContext.atsAnalysis's doc comment in
  // src/lib/llm/prompts/types.ts for why the field name stayed the same.
  atsAnalysis: DocumentAnalysisJSON | null;
}

export interface CoverLetterPromptInput {
  jobDetails: JobDetailsJSON;
  resume: ResumeJSON; // the tailored resume
  customInstructions?: string;
  styleGuide?: string;
}

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResult<T = string> {
  result: T;
  toolCalls?: ToolCall[];
  usage: LLMUsageInfo;
}

export type TextGenerationResult = LLMResult<string>;
export type ResumeGenerationResult = LLMResult<ResumeJSON>;
export type ResumeParsingResult = ResumeGenerationResult;
export type CoverLetterGenerationResult = LLMResult<string>;
export type JobParsingResult = LLMResult<JobDetailsJSON>;
export type HumanizeContentResult = LLMResult<HumanizerJSON>;
export type DocumentAnalysisResult = LLMResult<DocumentAnalysisJSON>;
