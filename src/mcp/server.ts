/**
 * MCP server definition — 8 tools that let an external LLM (Claude Desktop,
 * etc.) drive this app's resume flows using its OWN reasoning. This module
 * never calls an LLM and never touches an API key: it only serves prompts
 * already built by this app's existing prompt system, and validates/
 * persists whatever structured JSON the external LLM sends back.
 *
 * Every tool handler is exported as a plain async function taking an
 * explicit `McpDeps` bag instead of reaching for the real DB/action
 * functions itself — `buildServer()` wires the real ones in, tests inject
 * fakes. See `tests/lib/mcp/` for the guard/flow/submit/apply_resume_ops
 * coverage; transports (`stdio.ts`/`http.ts`) are intentionally not
 * exercised here.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Side-effect imports: these two purposes self-register on module load only
// (they live in src/lib/llm/chat-bot/prompts/, not the templates/ barrel
// src/lib/llm/prompts/index.ts already imports) — without these,
// templateRegistry.getByPurpose("extract_fields_to_edit" | "fix_ats_issues")
// returns undefined and get_prompt/submit would 404 on them.
import "@/lib/llm/chat-bot/prompts/extractFieldsToEdit";
import "@/lib/llm/chat-bot/prompts/keywordMappingPrompt";

import { getAllProfiles, getProfileById } from "@/actions/profile";
import { fetchJobDescriptionFromUrl } from "@/actions/urlFetcher";
import {
  createJob as dbCreateJob,
  getAllJob,
  getCoverLetterByJobId,
  getJob,
  getResumeByJobId,
  saveAtsAnalysis as dbSaveAtsAnalysis,
  updateCoverLetter as dbUpdateCoverLetter,
  updateResume as dbUpdateResume,
} from "@/lib/db/job";
import { EditFieldOutputSchema } from "@/lib/llm/chat-bot/prompts/extractFieldsToEdit";
import { AtsFixMappingSchema } from "@/lib/llm/chat-bot/prompts/keywordMappingPrompt";
import { PromptContext, PromptPurpose, PromptSystem } from "@/lib/llm/prompts";
import { applyResumeOps, resumePathLines, ResumeOp } from "@/lib/resume/editor";
import { HumanizerSchema } from "@/types/humanizer";
import { ProofreadJSON, ProofreadSchema } from "@/types/proofread";
import {
  ATSAnalysisJSON,
  ATSAnalysisSchema,
  JobDetailsJSON,
  JobDetailsSchema,
  ResumeJSON,
  ResumeSchema,
} from "@/types/resume";

import {
  createDraft,
  Draft,
  DraftField,
  deleteDraft,
  getDraft,
  shouldInline,
  updateDraft,
} from "./draft";
import { FLOW_CATALOG, nextPurposeFor } from "./flows";
import {
  applyGuard,
  guardProofreadResult,
  guardTailoredResume,
} from "./guards";

// ── Dependency injection (tests supply fakes; buildServer() supplies these) ─

export interface McpDeps {
  getJob: typeof getJob;
  getResumeByJobId: typeof getResumeByJobId;
  getCoverLetterByJobId: typeof getCoverLetterByJobId;
  getAllJob: typeof getAllJob;
  getProfileById: typeof getProfileById;
  getAllProfiles: typeof getAllProfiles;
  createJob: typeof dbCreateJob;
  updateResume: typeof dbUpdateResume;
  saveAtsAnalysis: typeof dbSaveAtsAnalysis;
  updateCoverLetter: typeof dbUpdateCoverLetter;
}

export const defaultDeps: McpDeps = {
  getJob,
  getResumeByJobId,
  getCoverLetterByJobId,
  getAllJob,
  getProfileById,
  getAllProfiles,
  createJob: dbCreateJob,
  updateResume: dbUpdateResume,
  saveAtsAnalysis: dbSaveAtsAnalysis,
  updateCoverLetter: dbUpdateCoverLetter,
};

// ── Purpose surface (Non-goal: no base-profile-builder purposes, no
// generate_text, no parse_resume — unreachable via any FLOW_CATALOG flow) ──

export const MCP_PURPOSES = [
  "parse_job",
  "analyze_ats",
  "generate_tailored_resume",
  "generate_cover_letter",
  "humanize_content",
  "extract_fields_to_edit",
  "fix_ats_issues",
  "proofread_resume",
] as const;

export type McpPurpose = (typeof MCP_PURPOSES)[number];

// `generate_cover_letter`'s template has no `outputSchema` (it returns raw
// HTML via runLLM, not runStructuredLLM/ResumeSchema-style structured
// output) — validated as a non-empty string instead.
const RESULT_SCHEMAS: Record<
  Exclude<McpPurpose, "generate_cover_letter">,
  z.ZodTypeAny
> = {
  parse_job: JobDetailsSchema,
  analyze_ats: ATSAnalysisSchema,
  generate_tailored_resume: ResumeSchema,
  humanize_content: HumanizerSchema,
  extract_fields_to_edit: EditFieldOutputSchema,
  fix_ats_issues: AtsFixMappingSchema,
  proofread_resume: ProofreadSchema,
};

function schemaFor(purpose: McpPurpose): z.ZodTypeAny {
  return purpose === "generate_cover_letter"
    ? z.string().min(1)
    : RESULT_SCHEMAS[purpose];
}

// The `result` param on `submit`: a JSON object for every purpose except
// generate_cover_letter, which is a raw HTML string (see schemaFor above) —
// so this must accept both shapes. Each union branch keeps an explicit
// "type" in the generated JSON Schema (object | string) rather than falling
// back to z.unknown()'s empty `{}` schema: an untyped schema is ambiguous
// enough that some MCP clients stringify whatever they send, which then
// fails schemaFor(purpose).safeParse with "Expected object, received
// string" for every purpose but generate_cover_letter.
const McpResultSchema = z.union([
  z.record(z.string(), z.unknown()),
  z.string().min(1),
]);

// generate_tailored_resume goes through z.toJSONSchema(ResumeSchema)
// directly (native, same convention as every other resume schema call site
// in this repo — see packages/llm-core's gemini.ts/ollama.ts); everything
// else uses the same native helper rather than the zod-to-json-schema
// package, whose published types target zod/v3's ZodSchema and don't
// type-check against this repo's zod v4 schemas.
function getOutputSchemaJson(purpose: McpPurpose): unknown {
  if (purpose === "generate_tailored_resume") {
    return z.toJSONSchema(ResumeSchema);
  }
  if (purpose === "generate_cover_letter") return null;
  return z.toJSONSchema(RESULT_SCHEMAS[purpose]);
}

function formatZodError(error: z.ZodError): string[] {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`
  );
}

/**
 * Some MCP clients JSON-stringify an object-typed tool argument before
 * sending it (observed in practice, not just theoretical — see
 * McpResultSchema's comment above). Because that schema's string branch
 * exists for generate_cover_letter's real string result, a stringified
 * object silently passes the outer MCP arg validation and only fails once
 * schemaFor(purpose) tries to parse it as the wrong purpose's object shape,
 * surfacing as a confusing "Expected object, received string" on every
 * field — including a trivial one-key probe payload. Unwrap it here rather
 * than let that failure mode reach the caller.
 */
function coerceResult(purpose: McpPurpose, result: unknown): unknown {
  if (purpose === "generate_cover_letter" || typeof result !== "string") {
    return result;
  }
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
}

// ── input passthrough (get_prompt/submit's `input`) ─────────────────────────

const McpInputSchema = z.object({
  jobDescription: z.string().optional(),
  userInput: z.string().optional(),
  additionalInstructions: z.string().optional(),
  styleGuide: z.string().optional(),
  profileId: z.number().int().positive().optional(),
  url: z.string().optional(),
  jobDetails: JobDetailsSchema.optional(),
  atsAnalysis: ATSAnalysisSchema.nullable().optional(),
  baseProfile: ResumeSchema.optional(),
  resume: ResumeSchema.optional(),
  resumeFull: ResumeSchema.optional(),
  // Back-compat override: a caller can still force-carry a value forward
  // via `input` even though the draft (below) now does this by default.
  tailoredResume: ResumeSchema.optional(),
});

type McpInput = z.infer<typeof McpInputSchema>;

async function safeGetResume(deps: McpDeps, jobId: number | undefined) {
  if (jobId == null) return null;
  try {
    return await deps.getResumeByJobId(jobId);
  } catch {
    return null;
  }
}

type ResumeRow = Awaited<ReturnType<typeof safeGetResume>>;

interface Hydrated {
  context: PromptContext;
  resumeRow: ResumeRow;
}

/** `value` if it should be re-inlined into the prompt, `undefined` if the
 * host's own conversation already has this exact value (see draft.ts). */
function pick<T>(
  draft: Draft | null,
  field: DraftField,
  value: T | null | undefined
): T | null | undefined {
  if (value == null) return value;
  return shouldInline(draft, field, value) ? value : undefined;
}

async function hydrateContext(
  deps: McpDeps,
  purpose: McpPurpose,
  jobId: number | undefined,
  rawInput: unknown,
  draft: Draft | null
): Promise<Hydrated> {
  const input: McpInput = McpInputSchema.parse(rawInput ?? {});
  const job = jobId != null ? await deps.getJob(jobId) : null;
  const resumeRow = await safeGetResume(deps, jobId);

  switch (purpose) {
    case "parse_job":
      return { context: { jobDescription: input.jobDescription }, resumeRow };

    case "analyze_ats": {
      // add_job (no resume yet): score the base profile, mirroring
      // LLMService.analyzeATS(profile, jobDetails) in job/new/page.tsx.
      // ats_fix (resume already tailored): score it directly.
      const baseline = resumeRow
        ? resumeRow.contentJson
        : ((await deps.getProfileById(
            input.profileId ?? job?.profileId ?? null
          )) ?? undefined);
      const resumeValue = input.resume ?? baseline ?? null;
      const jobDetailsValue =
        input.jobDetails ?? draft?.jobDetails ?? job?.details ?? null;
      return {
        context: {
          resume: pick(draft, "baseProfile", resumeValue),
          jobDetails: pick(draft, "jobDetails", jobDetailsValue),
        },
        resumeRow,
      };
    }

    case "generate_tailored_resume": {
      const profile = await deps.getProfileById(
        input.profileId ?? job?.profileId ?? null
      );
      const baseProfileValue = input.baseProfile ?? profile ?? null;
      const jobDetailsValue =
        input.jobDetails ?? draft?.jobDetails ?? job?.details ?? null;
      const atsAnalysisValue =
        input.atsAnalysis ??
        draft?.atsAnalysis ??
        job?.baseProfileAnalysis ??
        resumeRow?.atsAnalysis ??
        null;
      return {
        context: {
          baseProfile: pick(draft, "baseProfile", baseProfileValue),
          jobDetails: pick(draft, "jobDetails", jobDetailsValue),
          atsAnalysis: pick(draft, "atsAnalysis", atsAnalysisValue),
        },
        resumeRow,
      };
    }

    case "generate_cover_letter": {
      const resumeValue =
        input.resume ??
        input.tailoredResume ??
        draft?.tailoredResume ??
        resumeRow?.contentJson ??
        null;
      const jobDetailsValue =
        input.jobDetails ?? draft?.jobDetails ?? job?.details ?? null;
      return {
        context: {
          jobDetails: pick(draft, "jobDetails", jobDetailsValue),
          resume: pick(draft, "tailoredResume", resumeValue),
          additionalInstructions: input.additionalInstructions,
          styleGuide: input.styleGuide,
        },
        resumeRow,
      };
    }

    case "humanize_content":
      // Unlike every other purpose, there is no DB fallback for this one —
      // humanize_content can operate on a resume bullet, a whole cover
      // letter, or arbitrary pasted text, and the server has no way to know
      // which the caller means. Silently rendering CONTENT as an empty
      // block (the previous behavior) makes an empty humanize prompt look
      // like a valid "nothing to rewrite" result instead of the missing
      // argument it actually is — fail loudly instead.
      if (!input.userInput) {
        throw new Error(
          "humanize_content requires input.userInput — the exact text to rewrite (a resume bullet, a whole cover letter, etc.). The server does not fetch it from the database automatically."
        );
      }
      return {
        context: {
          userInput: input.userInput,
          resumeFull: input.resumeFull ?? resumeRow?.contentJson ?? undefined,
        },
        resumeRow,
      };

    case "extract_fields_to_edit":
      return { context: { userInput: input.userInput }, resumeRow };

    case "fix_ats_issues":
      return {
        context: {
          resume: input.resume ?? resumeRow?.contentJson ?? null,
          jobDetails: input.jobDetails ?? job?.details ?? null,
          userInput: input.userInput,
        },
        resumeRow,
      };

    case "proofread_resume": {
      const baseProfile = job?.profileId
        ? await deps.getProfileById(job.profileId)
        : null;
      return {
        context: {
          resumeFull: input.resumeFull ?? resumeRow?.contentJson ?? null,
          jobDetails: input.jobDetails ?? job?.details ?? null,
          baseProfile: input.baseProfile ?? baseProfile ?? undefined,
        },
        resumeRow,
      };
    }
  }
}

// ── get_prompt ───────────────────────────────────────────────────────────

export interface GetPromptResult {
  systemPrompt: string;
  userPrompt: string;
  outputSchema: unknown;
  next: PromptPurpose | null;
}

async function resolvePrompt(
  deps: McpDeps,
  purpose: McpPurpose,
  jobId: number | undefined,
  input: unknown,
  draft: Draft | null
): Promise<GetPromptResult> {
  const { context, resumeRow } = await hydrateContext(
    deps,
    purpose,
    jobId,
    input,
    draft
  );
  const resolved = PromptSystem.generatePrompt(purpose, context);
  const hasResume =
    jobId != null ? resumeRow !== null : draft?.tailoredResume != null;

  return {
    systemPrompt: resolved.systemPrompt,
    userPrompt: resolved.userPrompt,
    outputSchema: getOutputSchemaJson(purpose),
    next: nextPurposeFor(purpose, { hasResume }),
  };
}

export async function getPromptTool(
  deps: McpDeps,
  args: {
    purpose: McpPurpose;
    jobId?: number;
    draftId?: string;
    input?: unknown;
  }
): Promise<GetPromptResult> {
  return resolvePrompt(
    deps,
    args.purpose,
    args.jobId,
    args.input,
    getDraft(args.draftId)
  );
}

// ── submit ───────────────────────────────────────────────────────────────

export interface SubmitSuccess {
  ok: true;
  jobId: number | null;
  draftId?: string;
  hint?: string;
  next: PromptPurpose | null;
  nextPrompt?: GetPromptResult;
  guardChanges?: string[];
  result?: unknown;
}
export interface SubmitFailure {
  ok: false;
  errors: string[];
}
export type SubmitResult = SubmitSuccess | SubmitFailure;

const BUSY_RETRY_ATTEMPTS = 3;

/**
 * Two processes (this server + the Next app / bundled Tauri server) can
 * write to the same SQLite file concurrently. WAL mode (src/mcp/db.ts)
 * handles most of that, but a write can still transiently lose a
 * SQLITE_BUSY race — retry a few times with a short backoff rather than
 * failing the whole submit outright.
 */
async function withBusyRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < BUSY_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const isBusy =
        (err as { code?: string } | null)?.code === "SQLITE_BUSY" ||
        message.includes("SQLITE_BUSY");
      if (!isBusy || attempt === BUSY_RETRY_ATTEMPTS - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function submitTool(
  deps: McpDeps,
  args: {
    purpose: McpPurpose;
    jobId?: number;
    draftId?: string;
    result: unknown;
    input?: unknown;
  }
): Promise<SubmitResult> {
  const { purpose, jobId } = args;
  const result = coerceResult(purpose, args.result);

  // A string surviving coerceResult for a non-string purpose means it
  // looked like a string to begin with but wasn't valid JSON — most likely
  // truncated or corrupted in transit (a large/unescaped payload hitting a
  // transport size limit), not a legitimate string result. Surface that
  // directly instead of the confusing generic "Expected object, received
  // string" schemaFor(purpose) would otherwise produce.
  if (purpose !== "generate_cover_letter" && typeof result === "string") {
    return {
      ok: false,
      errors: [
        `result must be a JSON object for purpose "${purpose}", but arrived as a string that isn't valid JSON either — this usually means the payload was truncated or malformed in transit (check for an oversized or unescaped result). Received ${result.length} character(s), starting with: ${JSON.stringify(result.slice(0, 80))}`,
      ],
    };
  }

  const parsed = schemaFor(purpose).safeParse(result);
  if (!parsed.success) {
    return { ok: false, errors: formatZodError(parsed.error) };
  }

  const input = McpInputSchema.parse(args.input ?? {});
  const hasResumeBefore = (await safeGetResume(deps, jobId)) !== null;
  const next = () => nextPurposeFor(purpose, { hasResume: hasResumeBefore });

  // No jobId yet: this submit belongs to the stateless add_job draft phase.
  // Mint a draft on first use so the caller doesn't have to carry every
  // field forward as `input` itself.
  let draftId = args.draftId;
  if (jobId == null) {
    if (draftId == null) {
      draftId = createDraft();
    } else if (getDraft(draftId) == null) {
      // A draftId was supplied but doesn't resolve to anything — expired
      // (2h idle sweep), mistyped, or from a different/completed flow.
      // Silently treating this as "no draft" would drop whatever the
      // caller thinks it already carried forward (jobDetails, atsAnalysis,
      // the tailored resume) with no signal until a much later, more
      // confusing failure — fail loudly and specifically instead.
      return {
        ok: false,
        errors: [
          `draftId "${draftId}" was not found — it may have expired (drafts are cleared after 2h idle) or been mistyped. Start the add_job flow over with get_prompt({ purpose: "parse_job" }) and reuse the NEW draftId that submit returns from then on, or pass input.jobDetails/input.atsAnalysis/input.tailoredResume explicitly instead of relying on a draft.`,
        ],
      };
    }
  }
  const draft = jobId == null ? getDraft(draftId) : null;

  const withNextPrompt = async (
    base: Omit<SubmitSuccess, "nextPrompt">
  ): Promise<SubmitSuccess> => {
    // draftId is never carried automatically across calls — a host that
    // drops it silently starts a brand-new, empty draft on the next call
    // and loses everything gathered so far (only surfacing as a confusing
    // failure at the flow's last step). Repeat the reminder on every
    // draft-phase response rather than relying on the host recalling the
    // tool description from earlier in the conversation.
    const withHint: SubmitSuccess = base.draftId
      ? {
          ...base,
          hint: `Pass draftId: "${base.draftId}" on your NEXT get_prompt/submit call to continue this add_job flow — it is not carried automatically.`,
        }
      : (base as SubmitSuccess);
    if (!withHint.next) return withHint;
    const nextPrompt = await resolvePrompt(
      deps,
      withHint.next as McpPurpose,
      withHint.jobId ?? undefined,
      undefined,
      withHint.jobId == null ? getDraft(draftId) : null
    );
    return { ...withHint, nextPrompt };
  };

  try {
    switch (purpose) {
      case "parse_job": {
        // No standalone write for jobDetails alone — see generate_cover_letter
        // below for where a brand-new job is actually created. The draft
        // carries this validated JobDetailsJSON forward automatically.
        if (draftId)
          updateDraft(draftId, { jobDetails: parsed.data as JobDetailsJSON });
        return withNextPrompt({ ok: true, jobId: null, draftId, next: next() });
      }

      case "analyze_ats": {
        if (jobId != null && hasResumeBefore) {
          await withBusyRetry(() =>
            deps.saveAtsAnalysis(jobId, parsed.data as ATSAnalysisJSON)
          );
          return withNextPrompt({
            ok: true,
            jobId,
            next: nextPurposeFor(purpose, { hasResume: true }),
          });
        }
        // add_job phase: no resume exists yet to attach this analysis to
        // (job.baseProfileAnalysis is only settable via createJob's own
        // atsAnalysis param at creation time). Validated only; the draft
        // carries this forward to the final generate_cover_letter submit,
        // which performs the real createJob.
        if (draftId)
          updateDraft(draftId, { atsAnalysis: parsed.data as ATSAnalysisJSON });
        return withNextPrompt({ ok: true, jobId: null, draftId, next: next() });
      }

      case "generate_tailored_resume": {
        const baseProfile =
          input.baseProfile ??
          (await deps.getProfileById(
            input.profileId ??
              (jobId != null ? (await deps.getJob(jobId)).profileId : null) ??
              null
          ));
        if (!baseProfile) {
          return {
            ok: false,
            errors: [
              "No base profile available to guard against — supply input.baseProfile, input.profileId, or make sure a profile exists.",
            ],
          };
        }

        const guarded = applyGuard(() =>
          guardTailoredResume(baseProfile, parsed.data as ResumeJSON)
        );
        if (!guarded.ok) return { ok: false, errors: [guarded.error] };

        const submittedLayout = (parsed.data as ResumeJSON).sectionLayout;
        const guardChanges =
          JSON.stringify(submittedLayout) !==
          JSON.stringify(guarded.value.sectionLayout)
            ? [
                "sectionLayout carried over from base profile (display-only field, not model-authored)",
              ]
            : undefined;

        if (jobId != null) {
          const resumeRow = await deps.getResumeByJobId(jobId);
          await withBusyRetry(() =>
            deps.updateResume(
              jobId,
              guarded.value,
              resumeRow.customizations,
              "MCP tailor"
            )
          );
          return withNextPrompt({
            ok: true,
            jobId,
            next: nextPurposeFor(purpose, { hasResume: true }),
            guardChanges,
          });
        }

        // No job yet: nothing is persisted here. src/app/job/new/page.tsx
        // only ever calls createJob once, at the very end, bundling
        // jobDetails + tailoredResume + atsAnalysis + coverLetterText
        // together — the extracted DB layer (src/lib/db/job.ts) mirrors
        // that shape (createJob) but has no "attach a resume to an
        // already-created, resume-less job" primitive, so a brand-new job
        // can't be split across this write and generate_cover_letter's.
        // The draft carries this guarded resume forward to the final
        // submit, which performs the actual createJob call.
        if (draftId) updateDraft(draftId, { tailoredResume: guarded.value });
        return withNextPrompt({
          ok: true,
          jobId: null,
          draftId,
          next: next(),
          guardChanges,
        });
      }

      case "generate_cover_letter": {
        const text = parsed.data as string;

        if (jobId != null) {
          const coverLetterRow = await deps
            .getCoverLetterByJobId(jobId)
            .catch(() => null);
          if (!coverLetterRow) {
            return {
              ok: false,
              errors: [
                "No cover letter exists yet for this job — generate_cover_letter can only update one that already exists (e.g. created by add_job's own final step).",
              ],
            };
          }
          await withBusyRetry(() =>
            deps.updateCoverLetter(jobId, text, coverLetterRow.customizations)
          );
          return withNextPrompt({
            ok: true,
            jobId,
            next: nextPurposeFor(purpose, { hasResume: true }),
          });
        }

        const jobDetails = input.jobDetails ?? draft?.jobDetails;
        const tailoredResume = input.tailoredResume ?? draft?.tailoredResume;
        if (!jobDetails || !tailoredResume) {
          return {
            ok: false,
            errors: [
              "Creating a new job requires jobDetails (from parse_job) and a tailoredResume (from generate_tailored_resume). These are only carried forward if you passed the SAME draftId (returned by parse_job's submit) on every call since — draftId is not tracked automatically across calls, you must pass it yourself each time. If you didn't, or the draft expired, pass input.jobDetails/input.tailoredResume explicitly instead.",
            ],
          };
        }

        let profileId = input.profileId ?? draft?.profileId;
        if (profileId == null) {
          // Jobs are only visible in the app's dashboard when their
          // profileId matches the currently-selected profile there (see
          // src/app/page.tsx's `getAllJob(selectedProfileId)`), so a job
          // created with no profileId silently disappears from the UI even
          // though it's really in the DB — this bit a real MCP-driven
          // add_job run. Auto-pick when there's exactly one profile (the
          // common case); otherwise the caller must disambiguate via
          // list_profiles rather than us guessing which person's job list
          // this belongs to.
          const profiles = await deps.getAllProfiles();
          if (profiles.length === 1) {
            profileId = profiles[0].id;
          } else if (profiles.length > 1) {
            return {
              ok: false,
              errors: [
                `Multiple profiles exist (${profiles.map((p) => `${p.id}: ${p.label}`).join(", ")}) — call list_profiles and pass the right one as input.profileId, or the job will be created with no profile and won't show up in the app's dashboard.`,
              ],
            };
          }
        }

        const created = await withBusyRetry(() =>
          deps.createJob({
            jobDetails: jobDetails as JobDetailsJSON,
            tailoredResume: tailoredResume as ResumeJSON,
            coverLetterText: text,
            atsAnalysis: input.atsAnalysis ?? draft?.atsAnalysis ?? undefined,
            url: input.url ?? draft?.url,
            profileId,
          })
        );
        if (draftId) deleteDraft(draftId);
        return withNextPrompt({
          ok: true,
          jobId: created.jobId,
          next: nextPurposeFor(purpose, { hasResume: true }),
        });
      }

      case "extract_fields_to_edit":
      case "fix_ats_issues":
      case "humanize_content":
        // Validate-only — the caller applies the result itself via
        // apply_resume_ops (edit ops / ATS fix ops) or a follow-up submit
        // (humanized cover-letter text), never a direct DB write here.
        return withNextPrompt({ ok: true, jobId: jobId ?? null, next: next() });

      case "proofread_resume": {
        if (jobId == null) {
          return {
            ok: false,
            errors: ["proofread_resume requires an existing jobId."],
          };
        }
        const resumeRow = await deps.getResumeByJobId(jobId);
        const guardedResult = guardProofreadResult(
          resumeRow.contentJson,
          parsed.data as ProofreadJSON
        );
        return withNextPrompt({
          ok: true,
          jobId,
          next: nextPurposeFor(purpose, { hasResume: true }),
          result: guardedResult,
        });
      }
    }
  } catch (err) {
    return {
      ok: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

// ── apply_resume_ops ─────────────────────────────────────────────────────

const ResumeOpSchema = z.union([
  z.object({ op: z.literal("replace"), path: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("add"), path: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("remove"), path: z.string() }),
]);

export async function applyResumeOpsTool(
  deps: McpDeps,
  args: { jobId: number; ops: ResumeOp[] }
) {
  const resumeRow = await deps.getResumeByJobId(args.jobId);
  const { resume, applied, rejected } = applyResumeOps(
    resumeRow.contentJson,
    args.ops
  );

  if (applied.length > 0) {
    await withBusyRetry(() =>
      deps.updateResume(
        args.jobId,
        resume,
        resumeRow.customizations,
        "MCP edit"
      )
    );
  }

  return { applied, rejected };
}

// ── list_profiles / list_jobs / get_job_state ───────────────────────────

/**
 * Lets the caller discover which profile id to pass as `input.profileId`
 * before creating a job — required whenever more than one profile exists
 * (see the guard in submitTool's generate_cover_letter branch).
 */
export async function listProfilesTool(deps: McpDeps) {
  const profiles = await deps.getAllProfiles();
  return profiles.map((p) => ({ profileId: p.id, label: p.label }));
}

export async function listJobsTool(
  deps: McpDeps,
  args: { profileId?: number } = {}
) {
  const jobs = await deps.getAllJob(args.profileId ?? null);
  return jobs.map((job) => ({
    jobId: job.id,
    role: job.role,
    company: job.company.name,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }));
}

export async function fetchUrlTool(args: { url: string }) {
  const result = await fetchJobDescriptionFromUrl(args.url);
  return result.success
    ? { ok: true, content: result.content }
    : { ok: false, error: result.error };
}

export async function getJobStateTool(deps: McpDeps, args: { jobId: number }) {
  const job = await deps.getJob(args.jobId);
  const resumeRow = await safeGetResume(deps, args.jobId);
  const coverLetter = await deps
    .getCoverLetterByJobId(args.jobId)
    .catch(() => null);

  return {
    jobId: job.id,
    role: job.role,
    status: job.status,
    company: job.company.name,
    jobDetails: job.details,
    resume: resumeRow
      ? {
          pathLines: resumePathLines(resumeRow.contentJson),
          atsAnalysis: resumeRow.atsAnalysis,
        }
      : null,
    hasCoverLetter: coverLetter !== null,
  };
}

// ── list_flows ───────────────────────────────────────────────────────────

export function listFlowsTool() {
  return FLOW_CATALOG;
}

// ── McpServer wiring ─────────────────────────────────────────────────────

function toToolResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
  };
}

const purposeSchema = z.enum(MCP_PURPOSES);

// These are hints, not enforcement — they let a host skip confirmation
// prompts on read-only calls and avoid blindly retrying a non-idempotent
// write. Native to @modelcontextprotocol/sdk's registerTool, no new
// dependency.
const readOnly = { readOnlyHint: true, idempotentHint: true } as const;

export function buildServer(deps: McpDeps = defaultDeps): McpServer {
  const server = new McpServer({
    name: "resume-builder-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "list_flows",
    {
      title: "List flows",
      description:
        "List every flow (add_job, edit, proofread, ats_fix, humanize, cover_letter) and the ordered purposes each one walks through get_prompt/submit.",
      annotations: readOnly,
    },
    async () => toToolResult(listFlowsTool())
  );

  server.registerTool(
    "get_prompt",
    {
      title: "Get prompt",
      description:
        "Get the system/user prompt and expected output JSON Schema for a purpose, hydrated from this app's DB (via jobId) and/or `input`. Reason over it yourself, then call submit with your JSON result. Usually unnecessary mid-flow — submit's response already includes nextPrompt.",
      inputSchema: {
        purpose: purposeSchema,
        jobId: z.number().int().positive().optional(),
        draftId: z.string().optional(),
        input: z.record(z.string(), z.unknown()).optional(),
      },
      annotations: readOnly,
    },
    async (args) => toToolResult(await getPromptTool(deps, args))
  );

  server.registerTool(
    "submit",
    {
      title: "Submit",
      description:
        "Submit your JSON result for a purpose. Validated against its schema, guarded (e.g. rejects a gutted tailored resume), persisted when a jobId exists, and returns the next purpose's prompt inline as `nextPrompt` (or nothing when the flow ends in apply_resume_ops instead). Before a job exists, pass the returned `draftId` on every call instead of re-uploading jobDetails/atsAnalysis/the tailored resume yourself.",
      inputSchema: {
        purpose: purposeSchema,
        jobId: z.number().int().positive().optional(),
        draftId: z.string().optional(),
        result: McpResultSchema,
        input: z.record(z.string(), z.unknown()).optional(),
      },
      annotations: { readOnlyHint: false, idempotentHint: false },
    },
    async (args) => toToolResult(await submitTool(deps, args))
  );

  server.registerTool(
    "apply_resume_ops",
    {
      title: "Apply resume ops",
      description:
        "Apply RFC-6902 JSON Patch-style ops (replace/add/remove, path from resumePathLines) to a job's resume one at a time. Never throws — bad ops land in `rejected` with a reason, good ops still apply.",
      inputSchema: {
        jobId: z.number().int().positive(),
        ops: z.array(ResumeOpSchema),
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
    },
    async (args) =>
      toToolResult(
        await applyResumeOpsTool(
          deps,
          args as { jobId: number; ops: ResumeOp[] }
        )
      )
  );

  server.registerTool(
    "list_profiles",
    {
      title: "List profiles",
      description:
        "List every base profile (id + label) this app knows about. Call before creating a job (generate_cover_letter's final submit) whenever there's more than one — pass the right id as input.profileId, or the created job won't show up in the app's dashboard (it's filtered by the currently-selected profile there).",
      annotations: readOnly,
    },
    async () => toToolResult(await listProfilesTool(deps))
  );

  server.registerTool(
    "list_jobs",
    {
      title: "List jobs",
      description:
        "List every job (optionally scoped to a profile) — id, role, company, status.",
      inputSchema: {
        profileId: z.number().int().positive().optional(),
      },
      annotations: readOnly,
    },
    async (args) => toToolResult(await listJobsTool(deps, args))
  );

  server.registerTool(
    "fetch_url",
    {
      title: "Fetch URL",
      description:
        "Fetch a job posting URL server-side and return its extracted text content. Use this when a host's own fetch is blocked (e.g. LinkedIn, or other sites requiring a browser/CORS) so a job description can still be parsed. HTTP/HTTPS only; internal/private network addresses are rejected.",
      inputSchema: {
        url: z.string().url(),
      },
      annotations: readOnly,
    },
    async (args) => toToolResult(await fetchUrlTool(args))
  );

  server.registerTool(
    "get_job_state",
    {
      title: "Get job state",
      description:
        "Get a job's details, resume path lines, ATS score, and whether a cover letter exists — enough context to orient without re-fetching everything.",
      inputSchema: {
        jobId: z.number().int().positive(),
      },
      annotations: readOnly,
    },
    async (args) => toToolResult(await getJobStateTool(deps, args))
  );

  return server;
}
