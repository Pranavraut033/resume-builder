/**
 * One deterministic, path-based resume editor shared by every AI-driven
 * mutation flow (proofread, humanizer, chat edit, tailor pipeline — see the
 * op-format plan). The model never echoes text or whole arrays back; it
 * names an RFC-6902 JSON Pointer path and we apply it with `fast-json-patch`
 * (already used the same way by `ResumeHistory`), re-validating the whole
 * document with `ResumeSchema` after every single op.
 *
 * Ops are applied one at a time against an accumulating resume so a bad op
 * never blocks the rest of the batch — every failure mode lands in
 * `rejected` with a reason, `applyResumeOps` itself never throws.
 */
import { applyPatch, deepClone } from "fast-json-patch";

import { ResumeSchema } from "@/types/resume";

import type { ResumeJSON } from "@/types/resume";

export type ResumeOp =
  | { op: "replace"; path: string; value: unknown }
  | { op: "add"; path: string; value: unknown } // path ends /N or /- to insert
  | { op: "remove"; path: string };

export interface ApplyOpsResult {
  resume: ResumeJSON;
  applied: ResumeOp[];
  rejected: { op: ResumeOp; reason: string }[];
}

/**
 * `fast-json-patch`'s `JsonPatchError.message` is a multi-line dump —
 * the short message followed by `name: ...`, `operation: {...}`, and a
 * pretty-printed `tree: {...}` of the *entire* resume document. Only the
 * first line is meant for humans; the rest is intended for programmatic
 * inspection (`err.name`/`err.operation`/`err.tree`), not for display.
 */
function errorMessage(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  return err.message.split("\n")[0];
}

/**
 * Apply `ops` one at a time against `resume`. Each op is:
 *  1. Applied via `fast-json-patch#applyPatch` with validation on — this is
 *     what rejects out-of-range array indices, missing parent paths, and
 *     other structurally invalid pointers instead of silently no-op'ing or
 *     creating garbage.
 *  2. Re-validated as a whole document against `ResumeSchema` — an
 *     op that's structurally valid but produces a schema-invalid resume
 *     (wrong type, dropped required field, etc.) is rejected too.
 * A rejected op leaves the accumulating resume untouched and does not stop
 * later ops from being tried. Never throws.
 */
export function applyResumeOps(
  resume: ResumeJSON,
  ops: ResumeOp[]
): ApplyOpsResult {
  let current = resume;
  const applied: ResumeOp[] = [];
  const rejected: { op: ResumeOp; reason: string }[] = [];

  for (const op of ops) {
    try {
      const { newDocument } = applyPatch(
        deepClone(current),
        [op],
        /* validateOperation */ true
      );

      const parsed = ResumeSchema.safeParse(newDocument);
      if (!parsed.success) {
        rejected.push({ op, reason: parsed.error.message });
        continue;
      }

      // zod strips unrecognized object keys instead of failing, so an "add"
      // to a path that isn't part of the schema (e.g. /header/title instead
      // of /header/headline) would otherwise silently no-op while still
      // reporting as applied. Compare against the patched document to catch
      // that and reject it like any other invalid op.
      if (JSON.stringify(parsed.data) !== JSON.stringify(newDocument)) {
        rejected.push({
          op,
          reason: `path is not part of the resume schema: ${"path" in op ? op.path : ""}`,
        });
        continue;
      }

      current = parsed.data;
      applied.push(op);
    } catch (err) {
      rejected.push({ op, reason: errorMessage(err) });
    }
  }

  return { resume: current, applied, rejected };
}

// Every path segment emitted below is either a fixed field name (already a
// valid JSON Pointer token, e.g. "header", "achievements") or a numeric
// array index — neither ever needs RFC 6901 `~`/`/` escaping in this schema.
// (No resume field is keyed by an arbitrary string that could contain those
// characters, so there's no escaping call site — see RFC 6901 §3 if that
// ever changes.)

const MAX_LEAF_LEN = 160;

function truncate(value: string): string {
  if (value.length <= MAX_LEAF_LEN) return value;
  return `${value.slice(0, MAX_LEAF_LEN)}…`;
}

/**
 * Emit one line per string leaf (and per array field's length, immediately
 * before its entries, so the model knows valid `add` indices) as
 * `/json/pointer/path: "value"`. This is what the edit-oriented prompts feed
 * the model instead of pretty-printed field JSON — the model reads a path,
 * never echoes the value.
 */
export function resumePathLines(resume: ResumeJSON): string {
  const lines: string[] = [];

  const leaf = (path: string, value: string | null | undefined) => {
    if (value === undefined) return;
    // Null leaves must still be listed (not skipped) — otherwise the model
    // has no way to know a path like /skills/12/category exists at all when
    // it's currently unset, and can't reliably enumerate every item in a
    // bulk/array-wide edit (e.g. "group all my skills into two categories").
    lines.push(
      value === null ? `${path}: null` : `${path}: "${truncate(value)}"`
    );
  };

  const arrayLength = (path: string, length: number) => {
    lines.push(`${path}: ${length} items`);
  };

  // ── header ──────────────────────────────────────────────────────────────
  leaf("/header/name", resume.header.name);
  leaf("/header/headline", resume.header.headline);
  leaf("/header/email", resume.header.email);
  leaf("/header/phone", resume.header.phone);
  leaf("/header/location", resume.header.location);
  leaf("/header/linkedin", resume.header.linkedin);
  leaf("/header/github", resume.header.github);
  leaf("/header/website", resume.header.website);

  // ── summary ─────────────────────────────────────────────────────────────
  leaf("/summary", resume.summary);

  // ── experience ──────────────────────────────────────────────────────────
  arrayLength("/experience", resume.experience.length);
  resume.experience.forEach((exp, i) => {
    leaf(`/experience/${i}/company`, exp.company);
    leaf(`/experience/${i}/role`, exp.role);
    leaf(`/experience/${i}/startDate`, exp.startDate);
    leaf(`/experience/${i}/endDate`, exp.endDate);
    leaf(`/experience/${i}/description`, exp.description);
    arrayLength(`/experience/${i}/achievements`, exp.achievements.length);
    exp.achievements.forEach((achievement, j) =>
      leaf(`/experience/${i}/achievements/${j}`, achievement)
    );
  });

  // ── projects ────────────────────────────────────────────────────────────
  arrayLength("/projects", resume.projects.length);
  resume.projects.forEach((proj, i) => {
    leaf(`/projects/${i}/name`, proj.name);
    leaf(`/projects/${i}/description`, proj.description);
    arrayLength(`/projects/${i}/technologies`, proj.technologies.length);
    proj.technologies.forEach((tech, j) =>
      leaf(`/projects/${i}/technologies/${j}`, tech)
    );
    leaf(`/projects/${i}/url`, proj.url);
    leaf(`/projects/${i}/startDate`, proj.startDate);
    leaf(`/projects/${i}/endDate`, proj.endDate);
  });

  // ── skills ──────────────────────────────────────────────────────────────
  arrayLength("/skills", resume.skills.length);
  resume.skills.forEach((skill, i) => {
    leaf(`/skills/${i}/name`, skill.name);
    leaf(`/skills/${i}/category`, skill.category);
    leaf(`/skills/${i}/tier`, skill.tier);
  });

  // ── education ───────────────────────────────────────────────────────────
  arrayLength("/education", resume.education.length);
  resume.education.forEach((edu, i) => {
    leaf(`/education/${i}/institution`, edu.institution);
    leaf(`/education/${i}/degree`, edu.degree);
    leaf(`/education/${i}/field`, edu.field);
    leaf(`/education/${i}/gpa`, edu.gpa);
  });

  // ── certifications ──────────────────────────────────────────────────────
  arrayLength("/certifications", resume.certifications.length);
  resume.certifications.forEach((cert, i) => {
    leaf(`/certifications/${i}/name`, cert.name);
    leaf(`/certifications/${i}/issuer`, cert.issuer);
    leaf(`/certifications/${i}/date`, cert.date);
    leaf(`/certifications/${i}/url`, cert.url);
  });

  // ── publications ────────────────────────────────────────────────────────
  if (resume.publications) {
    arrayLength("/publications", resume.publications.length);
    resume.publications.forEach((pub, i) => {
      leaf(`/publications/${i}/title`, pub.title);
      leaf(`/publications/${i}/venue`, pub.venue);
      leaf(`/publications/${i}/date`, pub.date);
      leaf(`/publications/${i}/doi`, pub.doi);
    });
  }

  // ── languages ───────────────────────────────────────────────────────────
  if (resume.languages) {
    arrayLength("/languages", resume.languages.length);
    resume.languages.forEach((lang, i) => {
      leaf(`/languages/${i}/name`, lang.name);
      leaf(`/languages/${i}/proficiency`, lang.proficiency);
    });
  }

  // ── volunteer ───────────────────────────────────────────────────────────
  if (resume.volunteer) {
    arrayLength("/volunteer", resume.volunteer.length);
    resume.volunteer.forEach((vol, i) => {
      leaf(`/volunteer/${i}/organization`, vol.organization);
      leaf(`/volunteer/${i}/role`, vol.role);
      leaf(`/volunteer/${i}/description`, vol.description);
    });
  }

  // ── awards ──────────────────────────────────────────────────────────────
  if (resume.awards) {
    arrayLength("/awards", resume.awards.length);
    resume.awards.forEach((award, i) => {
      leaf(`/awards/${i}/title`, award.title);
      leaf(`/awards/${i}/issuer`, award.issuer);
      leaf(`/awards/${i}/description`, award.description);
    });
  }

  // ── hobbies ─────────────────────────────────────────────────────────────
  if (resume.hobbies) {
    arrayLength("/hobbies", resume.hobbies.length);
    resume.hobbies.forEach((hobby, i) => leaf(`/hobbies/${i}`, hobby));
  }

  // ── sectionLayout.custom ────────────────────────────────────────────────
  if (resume.sectionLayout) {
    arrayLength("/sectionLayout/custom", resume.sectionLayout.custom.length);
    resume.sectionLayout.custom.forEach((section, i) => {
      arrayLength(`/sectionLayout/custom/${i}/items`, section.items.length);
      section.items.forEach((item, j) =>
        leaf(`/sectionLayout/custom/${i}/items/${j}`, item)
      );
    });
  }

  return lines.join("\n");
}
