/**
 * Live probe for INTENT_CLASSIFIER_PROMPT robustness against messy real-world
 * input: typos, bad grammar, and ambiguous phrasing. Mirrors the exact call
 * ResumeChatBot.classifyIntent makes (same system prompt, maxTokens: 5,
 * temperature: 0) against a real local Ollama model — no mocking.
 *
 * Skips automatically when Ollama isn't reachable (e.g. CI).
 */
import { describe, expect, it } from "vitest";

import { getProviderInstance } from "@pranavraut033/llm-core";
import "@pranavraut033/llm-core/providers/register-builtins";

import { INTENT_CLASSIFIER_PROMPT } from "@/lib/llm/chat-bot/prompts/intentClassifier";

const OLLAMA_URL = "http://localhost:11434";
const MODEL = "qwen3.5:9b";

async function ollamaReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

async function classify(userInput: string): Promise<string> {
  const provider = await getProviderInstance("ollama", {
    keyResolver: async () => undefined,
  });
  const { result } = await provider.runLLM(
    [
      { role: "system", content: INTENT_CLASSIFIER_PROMPT },
      { role: "user", content: userInput },
    ],
    { model: MODEL, maxTokens: 5, temperature: 0 }
  );
  return String(result).trim().toLowerCase();
}

// Each case: messy input → the single label the prompt's own rules dictate
// (checks applied in order, first match wins — see intentClassifier.ts).
const cases: { label: string; input: string; expected: string }[] = [
  {
    label: "typo: 'sumary' + instructs change",
    input: "can u fix my sumary section its rly bad",
    expected: "edit",
  },
  {
    label: "typo: 'shud i' question form",
    input: "shud i mnetion my hobbies in resume",
    expected: "question",
  },
  {
    label: "bad grammar: skills edit, no question words",
    input: "the skils part not good need change asap",
    expected: "edit",
  },
  {
    label: "typo: regenerate whole resume",
    input: "pls redo entire resum from scrach",
    expected: "regenerate",
  },
  {
    label: "ambiguous: tailor whole resume, no section named",
    input: "make it better for this job pls",
    expected: "tailor",
  },
  {
    label: "typo: ATS phrasing close to prompt's own example",
    input: "will this resum pass thru the ATS scan or nah",
    expected: "ats",
  },
  {
    label: "bad grammar: 'what' question wins over 'interview' wording",
    input: "what things i should add for get more interview",
    expected: "question",
  },
  {
    label: "ambiguous: names a section AND asks 'how' — edit wins (rule order)",
    input: "not sure what to do, maybe redo it or just fix summary somehow",
    expected: "edit",
  },
  {
    label: "vague, no section/action named",
    input: "idk something feels off with this resume tbh",
    expected: "other",
  },
  {
    label: "prompt's own documented example, verbatim (typo-free baseline)",
    input: "how do I answer questions about this gap in my resume",
    expected: "interview",
  },
];

describe.skipIf(!(await ollamaReachable()))(
  "INTENT_CLASSIFIER_PROMPT (live, messy input)",
  () => {
    it.each(cases)(
      "$label → $expected",
      async ({ input, expected }) => {
        const intent = await classify(input);
        expect(intent).toBe(expected);
      },
      30_000
    );
  }
);
