/**
 * Flow catalog for the MCP server — mirrors the in-app pipelines
 * (`src/app/job/new/page.tsx`'s `GENERATION_STEPS`, the Deep Analysis /
 * Fit Check drawers, `ChatOverlay.tsx`'s align-terms/humanize intents) as
 * data, so `list_flows` and `get_prompt`/`submit`'s `next` field can stay in
 * sync by construction.
 *
 * `analyze_document` is the one purpose reused by two flows with different
 * successors (add_job: score the base profile before tailoring; document_fix:
 * score the already-tailored resume, then align terms and apply) — rather
 * than adding a `flow` parameter to every tool, `nextPurposeFor`
 * disambiguates the same way `server.ts` already needs to for context
 * hydration: whether the job already has a tailored resume.
 */
import { PromptPurpose } from "@/lib/llm/prompts";

export interface McpFlow {
  name: string;
  description: string;
  purposes: PromptPurpose[];
}

export const FLOW_CATALOG: McpFlow[] = [
  {
    name: "add_job",
    description:
      "Parse a job posting, run Deep Analysis on the base profile against it, tailor a resume, then draft a cover letter — creates a new job.",
    purposes: [
      "parse_job",
      "analyze_document",
      "generate_tailored_resume",
      "generate_cover_letter",
    ],
  },
  {
    name: "edit",
    description:
      "Route a free-text edit instruction to the resume fields it targets, then apply the change with apply_resume_ops.",
    purposes: ["extract_fields_to_edit"],
  },
  {
    name: "document_fix",
    description:
      "Run Deep Analysis on an existing job's tailored resume (correctness, impact, keyword, duplication, provenance, and title findings — lint findings are merged in automatically). Turn the findings you want fixed into ops: form-only alignment swaps (acronym/expansion, alias matching) go through the align_resume_terms tool, everything else through apply_resume_ops directly.",
    purposes: ["analyze_document"],
  },
  {
    name: "humanize",
    description:
      "Rewrite AI-sounding text (a cover letter, or resume content) to read naturally while preserving every fact.",
    purposes: ["humanize_content"],
  },
  {
    name: "cover_letter",
    description:
      "Regenerate the cover letter for an existing job (tone/style carried in `input.styleGuide`).",
    purposes: ["generate_cover_letter"],
  },
  {
    name: "bookmark",
    description:
      "Save a job posting URL for later without generating anything — fetch_url, parse it, then submit parse_job with input.bookmark: true to create a BOOKMARKED job. One LLM call per URL.",
    purposes: ["parse_job"],
  },
  {
    name: "fit_check",
    description:
      "Blunt, substantive resume-vs-JD fit assessment for an existing job's tailored resume — knockout risks, missing experience, seniority, and domain gaps a keyword scorer can't see, each gap with a concrete (non-editing) solution, always closing with evidence-based strengths. This is a judgment call ('should I apply?'), not a document edit: nothing here is auto-appliable — for line-level changes, use the document_fix flow instead.",
    purposes: ["analyze_fit"],
  },
];

/**
 * The next purpose after `purpose` in its flow, or `null` if it's a flow's
 * last `get_prompt`/`submit` step (later steps in that flow are
 * `apply_resume_ops`/`align_resume_terms` calls, not another purpose).
 *
 * `hasResume` disambiguates `analyze_document`'s two callers: false means no
 * tailored resume exists yet for the job (add_job, scoring the base
 * profile, then continuing on to generate_tailored_resume), true means one
 * already does (document_fix, scoring it directly — the flow ends here,
 * the caller turns findings into ops itself).
 */
export function nextPurposeFor(
  purpose: PromptPurpose,
  { hasResume = false }: { hasResume?: boolean } = {}
): PromptPurpose | null {
  switch (purpose) {
    case "parse_job":
      return "analyze_document";
    case "analyze_document":
      return hasResume ? null : "generate_tailored_resume";
    case "generate_tailored_resume":
      return "generate_cover_letter";
    case "generate_cover_letter":
    case "extract_fields_to_edit":
    case "humanize_content":
    case "analyze_fit":
      return null;
    // Base-profile builder purposes and generate_text/parse_resume are
    // never exposed via MCP (see server.ts's MCP_PURPOSES allowlist) — no
    // flow reaches them.
    default:
      return null;
  }
}
