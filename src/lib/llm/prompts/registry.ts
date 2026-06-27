/**
 * Template Registry — host shim around @pranavraut033/llm-core/prompts.
 *
 * `TemplateRegistry` is a true singleton (one shared static instance
 * regardless of generic type args), so re-deriving it here with this app's
 * `PromptContext`/`PromptPurpose` type params gives every template module a
 * correctly-typed `templateRegistry` while still pointing at the same
 * underlying registry the package exports.
 */

import { TemplateRegistry } from "@pranavraut033/llm-core/prompts";

import { PromptContext, PromptPurpose } from "./types";

export const templateRegistry = TemplateRegistry.getInstance<
  PromptContext,
  PromptPurpose
>();

export { TemplateRegistry };
