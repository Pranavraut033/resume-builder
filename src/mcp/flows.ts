/**
 * Flow catalog for the MCP server — mirrors the in-app pipelines
 * (`src/app/job/new/page.tsx`'s `GENERATION_STEPS`, `ProofreadDrawer.tsx`,
 * `ChatOverlay.tsx`'s ats-fix/humanize intents) as data, so `list_flows`
 * and `get_prompt`/`submit`'s `next` field can stay in sync by construction.
 *
 * `analyze_ats` is the one purpose reused by two flows with different
 * successors (add_job: score the base profile, then tailor; ats_fix: score
 * the already-tailored resume, then map fixes) — rather than adding a
 * `flow` parameter to every tool, `nextPurposeFor` disambiguates the same
 * way `server.ts` already needs to for context hydration: whether the job
 * already has a tailored resume.
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
      "Parse a job posting, score the base profile against it, tailor a resume, then draft a cover letter — creates a new job.",
    purposes: [
      "parse_job",
      "analyze_ats",
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
    name: "proofread",
    description:
      "Proofread an existing job's resume (lint findings are merged in automatically); apply any issues you want fixed with apply_resume_ops.",
    purposes: ["proofread_resume"],
  },
  {
    name: "ats_fix",
    description:
      "Score an existing job's tailored resume, map every finding to path-targeted edit ops, then apply them with apply_resume_ops.",
    purposes: ["analyze_ats", "fix_ats_issues"],
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
];

/**
 * The next purpose after `purpose` in its flow, or `null` if it's a flow's
 * last `get_prompt`/`submit` step (later steps in that flow are
 * `apply_resume_ops` calls, not another purpose).
 *
 * `hasResume` disambiguates `analyze_ats`'s two callers: false means no
 * tailored resume exists yet for the job (add_job, scoring the base
 * profile), true means one already does (ats_fix, scoring it directly).
 */
export function nextPurposeFor(
  purpose: PromptPurpose,
  { hasResume = false }: { hasResume?: boolean } = {}
): PromptPurpose | null {
  switch (purpose) {
    case "parse_job":
      return "analyze_ats";
    case "analyze_ats":
      return hasResume ? "fix_ats_issues" : "generate_tailored_resume";
    case "generate_tailored_resume":
      return "generate_cover_letter";
    case "generate_cover_letter":
    case "parse_resume":
    case "extract_fields_to_edit":
    case "proofread_resume":
    case "fix_ats_issues":
    case "humanize_content":
      return null;
    // Base-profile builder purposes and generate_text are never exposed via
    // MCP (see server.ts's MCP_PURPOSES allowlist) — no flow reaches them.
    default:
      return null;
  }
}
