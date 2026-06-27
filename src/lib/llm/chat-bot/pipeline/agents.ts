/**
 * Pipeline agents — four single-responsibility steps that the tailoring
 * orchestrator chains together. Each agent is a plain function, not a class.
 *
 * ponytail: agents own their prompts here instead of going through the
 * Handlebars template registry (src/lib/llm/prompts/templates/*). The rewrite
 * and verify agents pass loop-local data (the requirement list, prior-iteration
 * hallucination flags) that doesn't fit the registry's static PromptContext.
 * Promote to the registry only if these prompts need to be reused elsewhere.
 */
import { analyzeResume } from "@pranavraut033/ats-checker";
import { z } from "zod";

import { LLMUsageInfo } from "@/actions/tokenUsage";
import { ResolvedPrompt } from "@/lib/llm/prompts";
import { resumeToText } from "@/lib/resumeToText";
import { Experience, JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { LLMProvider } from "@pranavraut033/llm-core";

export type HallucinationFlag = {
  experienceIndex: number;
  bullet: string;
  issue: string;
};

type AgentOptions = { model: string };

// runStructuredLLM only reads systemPrompt/userPrompt + purpose (a usage label).
// We reuse existing PromptPurpose values for the label rather than threading new
// purposes through the RequiredFor/MultiPurpose machinery.
function resolvedPrompt(
  systemPrompt: string,
  userPrompt: string,
  purpose: ResolvedPrompt["purpose"]
): ResolvedPrompt {
  return { estimatedTokens: 0, purpose, systemPrompt, userPrompt };
}

// ── Agent 1: requirements (deterministic, no LLM) ──────────────────────────
// ponytail: the LLM already extracted these at parseJob time. Re-prompting an
// LLM to re-derive requirements is waste — just distill the parsed JobDetails.
// Upgrade path: an LLM ranking call if keyword prioritization proves weak.
export function extractRequirements(jobDetails: JobDetailsJSON): string[] {
  const buckets: unknown[] = [
    jobDetails.requirements,
    jobDetails.nice_to_have,
    jobDetails.tech_stack,
    jobDetails.responsibilities,
  ];

  const collected: string[] = [];
  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== "object") continue;
    for (const value of Object.values(bucket)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string" && item.trim())
            collected.push(item.trim());
        }
      }
    }
  }

  // dedupe case-insensitively, preserve first-seen order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of collected) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

// ── Agent 2: bullet rewriter (LLM, structured) ─────────────────────────────
const RewriteSchema = z.object({
  experiences: z.array(z.object({ achievements: z.array(z.string()) })),
});

const REWRITE_SYSTEM = `You are an elite resume bullet-point rewriter.

DATA INTEGRITY (non-negotiable):
- Use ONLY facts present in the candidate's existing bullets and role context.
- Never invent, infer, or embellish skills, metrics, technologies, scope, or outcomes.
- Fabrication of any kind is a critical failure.

REWRITE STRATEGY:
- Mirror the role's requirement keywords using the candidate's own truthful language where the existing content supports it.
- Lead with strong action verbs; keep existing quantified outcomes.
- Preserve all facts — improve phrasing, specificity, and relevance only.

OUTPUT CONTRACT:
- Return one rewritten "achievements" array per input experience, in the same order.`;

export async function rewriteBullets(
  provider: LLMProvider,
  input: {
    experiences: Experience[];
    requirements: string[];
    flags?: HallucinationFlag[];
  },
  options: AgentOptions
): Promise<{ experiences: Experience[]; usage: LLMUsageInfo }> {
  const { experiences, requirements, flags } = input;

  const flagBlock =
    flags && flags.length > 0
      ? `\n\nPREVIOUS ATTEMPT MADE UNSUPPORTED CLAIMS — do NOT repeat these. Rewrite the named bullets using only facts that exist in the original:\n${flags
          .map(
            (f) =>
              `- experience[${f.experienceIndex}] "${f.bullet}" — ${f.issue}`
          )
          .join("\n")}`
      : "";

  const userPrompt = `Rewrite the achievement bullets for each experience below to surface the role's requirements truthfully.

ROLE REQUIREMENTS (prioritized):
${requirements.map((r) => `- ${r}`).join("\n") || "- (none extracted)"}

EXPERIENCES (index order matters — return the same count, same order):
${experiences
  .map(
    (exp, i) =>
      `[${i}] ${exp.role} @ ${exp.company}\n${exp.description ? `Context: ${exp.description}\n` : ""}Current bullets:\n${exp.achievements.map((a) => `  • ${a}`).join("\n") || "  (none)"}`
  )
  .join("\n\n")}${flagBlock}

Return ONLY JSON matching the schema: one achievements array per experience, same order.`;

  const { result, usage } = await provider.runStructuredLLM(
    resolvedPrompt(REWRITE_SYSTEM, userPrompt, "generate_experience"),
    { model: options.model },
    RewriteSchema,
    "RewriteBulletsSchema"
  );

  // ponytail: clamp instead of throwing — if the model under-returns, keep the
  // original bullets for any experience it skipped.
  const merged = experiences.map((exp, i) => {
    const rewritten = result.experiences[i]?.achievements;
    return rewritten && rewritten.length > 0
      ? { ...exp, achievements: rewritten }
      : exp;
  });

  return { experiences: merged, usage };
}

// ── Agent 3: ATS scorer (deterministic, no LLM) ────────────────────────────
export function scoreResume(
  resume: ResumeJSON,
  jobDetails: JobDetailsJSON
): { score: number } {
  return analyzeResume({
    resumeText: resumeToText(resume),
    jobDescription: jobDetails.raw_description,
  });
}

// ── Agent 4: hallucination checker (LLM, structured) ───────────────────────
const VerifySchema = z.object({
  flags: z.array(
    z.object({
      experienceIndex: z.number(),
      bullet: z.string(),
      issue: z.string(),
    })
  ),
});

const VERIFY_SYSTEM = `You are a strict resume fact-checker.

Compare each REWRITTEN bullet against the ORIGINAL experience facts. Flag any
rewritten bullet that introduces a claim not supported by the original:
- new metrics or numbers not in the original
- technologies, tools, or skills not in the original
- expanded scope, seniority, or responsibilities not in the original

Legitimate rephrasing of an existing fact is NOT a hallucination. Only flag
unsupported claims. Return an empty flags array if everything is supported.`;

export async function checkHallucinations(
  provider: LLMProvider,
  input: { original: ResumeJSON; rewritten: ResumeJSON },
  options: AgentOptions
): Promise<{ flags: HallucinationFlag[]; usage: LLMUsageInfo }> {
  const { original, rewritten } = input;

  const userPrompt = `Fact-check the rewritten bullets against the originals.

${rewritten.experience
  .map((exp, i) => {
    const orig = original.experience[i];
    return `EXPERIENCE [${i}] ${exp.role} @ ${exp.company}
ORIGINAL facts:
${orig?.description ? `  Context: ${orig.description}\n` : ""}${(orig?.achievements ?? []).map((a) => `  • ${a}`).join("\n") || "  (none)"}
REWRITTEN bullets:
${exp.achievements.map((a) => `  • ${a}`).join("\n") || "  (none)"}`;
  })
  .join("\n\n")}

Return ONLY JSON matching the schema. For each unsupported claim, set experienceIndex, the offending rewritten bullet text, and a short issue description.`;

  const { result, usage } = await provider.runStructuredLLM(
    resolvedPrompt(VERIFY_SYSTEM, userPrompt, "generate_text"),
    { model: options.model },
    VerifySchema,
    "VerifyBulletsSchema"
  );

  return { flags: result.flags, usage };
}
