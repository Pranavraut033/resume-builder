/**
 * MCP server definition — 6 tools that let an external LLM (Claude Desktop,
 * etc.) drive this app's resume flows using its OWN reasoning. This module
 * never calls an LLM and never touches an API key: it only serves prompts
 * already built by this app's existing prompt system, and validates/
 * persists whatever structured JSON the external LLM sends back.
 *
 * Every tool handler is exported as a plain async function taking an
 * explicit `McpDeps` bag instead of reaching for the real DB/action
 * functions itself — `buildServer()` wires the real ones in, tests inject
 * fakes. See `tests/lib/mcp/` for the guard/flow/apply_resume_ops coverage;
 * transports (`stdio.ts`/`http.ts`) are intentionally not exercised here.
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
  getResumeSchemaForPrompt,
  JobDetailsJSON,
  JobDetailsSchema,
  ResumeJSON,
  ResumeSchema,
} from "@/types/resume";

import { FLOW_CATALOG, nextPurposeFor } from "./flows";
import {
  applyGuard,
  guardParsedResume,
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

// ── Purpose surface (Non-goal: no base-profile-builder purposes, no generate_text) ─

export const MCP_PURPOSES = [
  "parse_job",
  "parse_resume",
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
  parse_resume: ResumeSchema,
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

// The `result` param on `submit`/`validate`: a JSON object for every purpose
// except generate_cover_letter, which is a raw HTML string (see schemaFor
// above) — so this must accept both shapes. Each union branch keeps an
// explicit "type" in the generated JSON Schema (object | string) rather than
// falling back to z.unknown()'s empty `{}` schema: an untyped schema is
// ambiguous enough that some MCP clients stringify whatever they send,
// which then fails schemaFor(purpose).safeParse with "Expected object,
// received string" for every purpose but generate_cover_letter.
const McpResultSchema = z.union([
  z.record(z.string(), z.unknown()),
  z.string().min(1),
]);

// Resume-shaped purposes go through getResumeSchemaForPrompt() (native
// z.toJSONSchema, same as every other resume schema call site in this repo
// — see packages/llm-core's gemini.ts/ollama.ts for the same convention);
// everything else uses the same native helper directly rather than the
// zod-to-json-schema package, whose published types target zod/v3's
// ZodSchema and don't type-check against this repo's zod v4 schemas.
function getOutputSchemaJson(purpose: McpPurpose): unknown {
  if (purpose === "generate_tailored_resume" || purpose === "parse_resume") {
    return JSON.parse(getResumeSchemaForPrompt());
  }
  if (purpose === "generate_cover_letter") return null;
  return z.toJSONSchema(RESULT_SCHEMAS[purpose]);
}

function formatZodError(error: z.ZodError): string[] {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`
  );
}

// ── input passthrough (get_prompt/submit's `input`) ─────────────────────────

const McpInputSchema = z.object({
  jobDescription: z.string().optional(),
  resumeText: z.string().optional(),
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
  // The generate_tailored_resume submit's guarded output, carried forward by
  // the caller into the final generate_cover_letter submit — see that
  // handler below for why.
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

async function hydrateContext(
  deps: McpDeps,
  purpose: McpPurpose,
  jobId: number | undefined,
  rawInput: unknown
): Promise<PromptContext> {
  const input: McpInput = McpInputSchema.parse(rawInput ?? {});
  const job = jobId != null ? await deps.getJob(jobId) : null;
  const resumeRow = await safeGetResume(deps, jobId);

  switch (purpose) {
    case "parse_job":
      return { jobDescription: input.jobDescription };

    case "parse_resume":
      return { resumeText: input.resumeText };

    case "analyze_ats": {
      // add_job (no resume yet): score the base profile, mirroring
      // LLMService.analyzeATS(profile, jobDetails) in job/new/page.tsx.
      // ats_fix (resume already tailored): score it directly.
      const baseline = resumeRow
        ? resumeRow.contentJson
        : ((await deps.getProfileById(
            input.profileId ?? job?.profileId ?? null
          )) ?? undefined);
      return {
        resume: input.resume ?? baseline ?? null,
        jobDetails: input.jobDetails ?? job?.details ?? null,
      };
    }

    case "generate_tailored_resume": {
      const profile = await deps.getProfileById(
        input.profileId ?? job?.profileId ?? null
      );
      return {
        baseProfile: input.baseProfile ?? profile ?? null,
        jobDetails: input.jobDetails ?? job?.details ?? null,
        atsAnalysis:
          input.atsAnalysis ??
          job?.baseProfileAnalysis ??
          resumeRow?.atsAnalysis ??
          null,
      };
    }

    case "generate_cover_letter":
      return {
        jobDetails: input.jobDetails ?? job?.details ?? null,
        resume:
          input.resume ??
          input.tailoredResume ??
          resumeRow?.contentJson ??
          null,
        additionalInstructions: input.additionalInstructions,
        styleGuide: input.styleGuide,
      };

    case "humanize_content":
      return {
        userInput: input.userInput,
        resumeFull: input.resumeFull ?? resumeRow?.contentJson ?? undefined,
      };

    case "extract_fields_to_edit":
      return { userInput: input.userInput };

    case "fix_ats_issues":
      return {
        resume: input.resume ?? resumeRow?.contentJson ?? null,
        jobDetails: input.jobDetails ?? job?.details ?? null,
        userInput: input.userInput,
      };

    case "proofread_resume": {
      const baseProfile = job?.profileId
        ? await deps.getProfileById(job.profileId)
        : null;
      return {
        resumeFull: input.resumeFull ?? resumeRow?.contentJson ?? null,
        jobDetails: input.jobDetails ?? job?.details ?? null,
        baseProfile: input.baseProfile ?? baseProfile ?? undefined,
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

export async function getPromptTool(
  deps: McpDeps,
  args: { purpose: McpPurpose; jobId?: number; input?: unknown }
): Promise<GetPromptResult> {
  const context = await hydrateContext(
    deps,
    args.purpose,
    args.jobId,
    args.input
  );
  const resolved = PromptSystem.generatePrompt(args.purpose, context);
  const hasResume = (await safeGetResume(deps, args.jobId)) !== null;

  return {
    systemPrompt: resolved.systemPrompt,
    userPrompt: resolved.userPrompt,
    outputSchema: getOutputSchemaJson(args.purpose),
    next: nextPurposeFor(args.purpose, { hasResume }),
  };
}

// ── validate ─────────────────────────────────────────────────────────────

export type ValidateResult = { ok: true } | { ok: false; errors: string[] };

export function validateTool(args: {
  purpose: McpPurpose;
  result: unknown;
}): ValidateResult {
  const parsed = schemaFor(args.purpose).safeParse(args.result);
  if (!parsed.success) {
    return { ok: false, errors: formatZodError(parsed.error) };
  }
  return { ok: true };
}

// ── submit ───────────────────────────────────────────────────────────────

export interface SubmitSuccess {
  ok: true;
  jobId: number | null;
  next: PromptPurpose | null;
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
    result: unknown;
    input?: unknown;
  }
): Promise<SubmitResult> {
  const { purpose, jobId, result } = args;

  const parsed = schemaFor(purpose).safeParse(result);
  if (!parsed.success) {
    return { ok: false, errors: formatZodError(parsed.error) };
  }

  const input = McpInputSchema.parse(args.input ?? {});
  const hasResumeBefore = (await safeGetResume(deps, jobId)) !== null;
  const next = () => nextPurposeFor(purpose, { hasResume: hasResumeBefore });

  try {
    switch (purpose) {
      case "parse_job":
        // No standalone write for jobDetails alone — see generate_cover_letter
        // below for where a brand-new job is actually created. The caller
        // carries this validated JobDetailsJSON forward via input.jobDetails.
        return { ok: true, jobId: null, next: next() };

      case "parse_resume": {
        const guarded = applyGuard(() =>
          guardParsedResume(parsed.data as ResumeJSON)
        );
        if (!guarded.ok) return { ok: false, errors: [guarded.error] };
        return {
          ok: true,
          jobId: jobId ?? null,
          next: next(),
          result: guarded.value,
        };
      }

      case "analyze_ats": {
        if (jobId != null && hasResumeBefore) {
          await withBusyRetry(() =>
            deps.saveAtsAnalysis(jobId, parsed.data as ATSAnalysisJSON)
          );
          return {
            ok: true,
            jobId,
            next: nextPurposeFor(purpose, { hasResume: true }),
          };
        }
        // add_job phase: no resume exists yet to attach this analysis to
        // (job.baseProfileAnalysis is only settable via createJob's own
        // atsAnalysis param at creation time). Validated only; caller
        // carries this forward via input.atsAnalysis to the final
        // generate_cover_letter submit, which performs the real createJob.
        return { ok: true, jobId: jobId ?? null, next: next() };
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
          return {
            ok: true,
            jobId,
            next: nextPurposeFor(purpose, { hasResume: true }),
            result: guarded.value,
          };
        }

        // No job yet: nothing is persisted here. src/app/job/new/page.tsx
        // only ever calls createJob once, at the very end, bundling
        // jobDetails + tailoredResume + atsAnalysis + coverLetterText
        // together — the extracted DB layer (src/lib/db/job.ts) mirrors
        // that shape (createJob) but has no "attach a resume to an
        // already-created, resume-less job" primitive, so a brand-new job
        // can't be split across this write and generate_cover_letter's.
        // The caller carries this guarded resume forward via
        // input.tailoredResume to the final submit, which performs the
        // actual createJob call.
        return { ok: true, jobId: null, next: next(), result: guarded.value };
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
          return {
            ok: true,
            jobId,
            next: nextPurposeFor(purpose, { hasResume: true }),
          };
        }

        if (!input.jobDetails || !input.tailoredResume) {
          return {
            ok: false,
            errors: [
              "Creating a new job requires input.jobDetails (the validated parse_job result) and input.tailoredResume (the guarded generate_tailored_resume result) alongside the cover letter text.",
            ],
          };
        }

        let profileId = input.profileId;
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
            jobDetails: input.jobDetails as JobDetailsJSON,
            tailoredResume: input.tailoredResume,
            coverLetterText: text,
            atsAnalysis: input.atsAnalysis ?? undefined,
            url: input.url,
            profileId,
          })
        );
        return {
          ok: true,
          jobId: created.jobId,
          next: nextPurposeFor(purpose, { hasResume: true }),
        };
      }

      case "extract_fields_to_edit":
      case "fix_ats_issues":
      case "humanize_content":
        // Validate-only — the caller applies the result itself via
        // apply_resume_ops (edit ops / ATS fix ops) or a follow-up submit
        // (humanized cover-letter text), never a direct DB write here.
        return { ok: true, jobId: jobId ?? null, next: next() };

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
        return {
          ok: true,
          jobId,
          next: nextPurposeFor(purpose, { hasResume: true }),
          result: guardedResult,
        };
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
    baseProfileAnalysis: job.baseProfileAnalysis,
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
    content: [
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
  };
}

const purposeSchema = z.enum(MCP_PURPOSES);

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
    },
    async () => toToolResult(listFlowsTool())
  );

  server.registerTool(
    "get_prompt",
    {
      title: "Get prompt",
      description:
        "Get the system/user prompt and expected output JSON Schema for a purpose, hydrated from this app's DB (via jobId) and/or `input`. Reason over it yourself, then call submit with your JSON result.",
      inputSchema: {
        purpose: purposeSchema,
        jobId: z.number().int().positive().optional(),
        input: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async (args) => toToolResult(await getPromptTool(deps, args))
  );

  server.registerTool(
    "submit",
    {
      title: "Submit",
      description:
        "Submit your JSON result for a purpose. Validated against its schema, guarded (e.g. rejects a gutted tailored resume), persisted, and returns the next purpose to call (or null when the flow ends in apply_resume_ops instead).",
      inputSchema: {
        purpose: purposeSchema,
        jobId: z.number().int().positive().optional(),
        result: McpResultSchema,
        input: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async (args) => toToolResult(await submitTool(deps, args))
  );

  server.registerTool(
    "validate",
    {
      title: "Validate",
      description:
        "Dry-run schema validation for a purpose's result with no persistence — use to self-check before calling submit.",
      inputSchema: {
        purpose: purposeSchema,
        result: McpResultSchema,
      },
    },
    async (args) => toToolResult(validateTool(args))
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
    },
    async (args) => toToolResult(await listJobsTool(deps, args))
  );

  server.registerTool(
    "get_job_state",
    {
      title: "Get job state",
      description:
        "Get a job's details, resume path lines, ATS scores, and whether a cover letter exists — enough context to orient without re-fetching everything.",
      inputSchema: {
        jobId: z.number().int().positive(),
      },
    },
    async (args) => toToolResult(await getJobStateTool(deps, args))
  );

  return server;
}
