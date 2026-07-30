/**
 * Deterministic proofread linter.
 *
 * Pure, synchronous, no LLM — regexes and set logic over the resume's
 * serialized string fields, catching the mechanical defect classes from the
 * proofread plan's corpus: render artifacts, formatting inconsistencies, and
 * exact-duplicate bullets. Perfect recall, zero cost, but only catches what
 * a regex can see — the judgment-requiring classes (spelling, truncated
 * fragments, provenance) are the LLM pass's job (see
 * src/lib/llm/prompts/templates/proofread.ts), merged in by
 * src/lib/llm/domainOps.ts::proofreadResume.
 *
 * ponytail: regexes over the serialized fields, not a parser. Each check is
 * independently testable. Add a real tokenizer only if a check needs
 * sentence structure — at which point it belongs in the LLM pass instead.
 */
import { ProofreadIssue } from "@/types/proofread";
import { ResumeField, ResumeJSON } from "@/types/resume";

interface LeafRef {
  field: ResumeField;
  location: string;
  // JSON Pointer to this leaf, matching the exact pointer scheme emitted by
  // src/lib/resume/editor.ts::resumePathLines — keep the two in sync.
  path: string;
  text: string;
}

function collectLeafStrings(resume: ResumeJSON): LeafRef[] {
  const leaves: LeafRef[] = [];
  const push = (
    field: ResumeField,
    location: string,
    path: string,
    text: string | null | undefined
  ) => {
    if (text) leaves.push({ field, location, path, text });
  };

  push("header", "Header → Name", "/header/name", resume.header.name);
  push(
    "header",
    "Header → Headline",
    "/header/headline",
    resume.header.headline
  );
  push("header", "Header → Email", "/header/email", resume.header.email);
  push("header", "Header → Phone", "/header/phone", resume.header.phone);
  push(
    "header",
    "Header → Location",
    "/header/location",
    resume.header.location
  );
  push(
    "header",
    "Header → LinkedIn",
    "/header/linkedin",
    resume.header.linkedin
  );
  push("header", "Header → GitHub", "/header/github", resume.header.github);
  push("header", "Header → Website", "/header/website", resume.header.website);

  push("summary", "Summary", "/summary", resume.summary);

  resume.experience.forEach((exp, i) => {
    push(
      "experience",
      `Experience → ${exp.company} → Description`,
      `/experience/${i}/description`,
      exp.description
    );
    exp.achievements.forEach((bullet, j) =>
      push(
        "experience",
        `Experience → ${exp.company} → bullet ${j + 1}`,
        `/experience/${i}/achievements/${j}`,
        bullet
      )
    );
  });

  resume.projects.forEach((proj, i) => {
    push(
      "projects",
      `Projects → ${proj.name} → Description`,
      `/projects/${i}/description`,
      proj.description
    );
    push(
      "projects",
      `Projects → ${proj.name} → URL`,
      `/projects/${i}/url`,
      proj.url
    );
  });

  resume.education.forEach((edu, i) => {
    push(
      "education",
      `Education → ${edu.institution} → Institution`,
      `/education/${i}/institution`,
      edu.institution
    );
    push(
      "education",
      `Education → ${edu.institution} → Degree`,
      `/education/${i}/degree`,
      edu.degree
    );
    push(
      "education",
      `Education → ${edu.institution} → Field`,
      `/education/${i}/field`,
      edu.field
    );
    push(
      "education",
      `Education → ${edu.institution} → GPA`,
      `/education/${i}/gpa`,
      edu.gpa
    );
  });

  resume.certifications.forEach((cert, i) => {
    push(
      "certifications",
      `Certifications → ${cert.name} → Name`,
      `/certifications/${i}/name`,
      cert.name
    );
    push(
      "certifications",
      `Certifications → ${cert.name} → Issuer`,
      `/certifications/${i}/issuer`,
      cert.issuer
    );
    push(
      "certifications",
      `Certifications → ${cert.name} → URL`,
      `/certifications/${i}/url`,
      cert.url
    );
  });

  (resume.publications ?? []).forEach((pub, i) => {
    push(
      "publications",
      `Publications → ${pub.title} → Title`,
      `/publications/${i}/title`,
      pub.title
    );
    push(
      "publications",
      `Publications → ${pub.title} → Venue`,
      `/publications/${i}/venue`,
      pub.venue
    );
    push(
      "publications",
      `Publications → ${pub.title} → URL`,
      `/publications/${i}/url`,
      pub.url
    );
  });

  (resume.volunteer ?? []).forEach((vol, i) => {
    push(
      "volunteer",
      `Volunteer → ${vol.organization} → Description`,
      `/volunteer/${i}/description`,
      vol.description
    );
  });

  (resume.awards ?? []).forEach((award, i) => {
    push(
      "awards",
      `Awards → ${award.title} → Description`,
      `/awards/${i}/description`,
      award.description
    );
  });

  (resume.hobbies ?? []).forEach((hobby, i) =>
    push("hobbies", `Hobbies → item ${i + 1}`, `/hobbies/${i}`, hobby)
  );

  return leaves;
}

function makeIssue(partial: Omit<ProofreadIssue, "source">): ProofreadIssue {
  return { ...partial, source: "lint" };
}

// ── Per-leaf regex checks ──────────────────────────────────────────────────

const STRAY_ARTIFACT_RE = /[•·]\s*-|-\s*[•·]/g;
// A real domain (curated TLD list, not any `.word`) immediately followed by
// a path and a trailing -, . or , right before whitespace/end —
// "github.com/pranavraut033-". Restricting to known TLDs is deliberate: a
// generic `\.[a-zA-Z]{2,}` also matches tech-stack shorthand like
// "Next.js/React/Tailwind," (".js" isn't a URL, it's a framework name).
const URL_TLDS =
  "com|io|dev|org|net|co|ai|app|gg|me|us|edu|gov|info|xyz|tech|so";
const TRAILING_URL_PUNCT_RE = new RegExp(
  `\\b[\\w-]+\\.(?:${URL_TLDS})\\/\\S*[-.,](?=\\s|$)`,
  "gi"
);
const DOUBLE_SPACE_RE = /  +/g;
const SPACE_BEFORE_PUNCT_RE = / +([,.;:!?])/g;
const PLACEHOLDER_RE = /\bTODO\b|\bXXX\b|lorem ipsum/gi;
const PLACEHOLDER_BRACKET_RE = /\[Company\]|\[Role\]|\{\{/g;

function lintLeafPatterns(leaf: LeafRef): ProofreadIssue[] {
  const issues: ProofreadIssue[] = [];

  for (const match of leaf.text.matchAll(STRAY_ARTIFACT_RE)) {
    issues.push(
      makeIssue({
        field: leaf.field,
        category: "stray_artifact",
        severity: "error",
        location: leaf.location,
        path: leaf.path,
        original: match[0],
        suggestion: "",
        explanation:
          "Stray bullet glyph glued to a hyphen — looks like a rendering artifact.",
      })
    );
  }

  for (const match of leaf.text.matchAll(TRAILING_URL_PUNCT_RE)) {
    issues.push(
      makeIssue({
        field: leaf.field,
        category: "stray_artifact",
        severity: "error",
        location: leaf.location,
        path: leaf.path,
        original: match[0],
        suggestion: match[0].slice(0, -1),
        explanation: `Trailing "${match[0].slice(-1)}" glued to a URL — likely a rendering/generation artifact.`,
      })
    );
  }

  for (const match of leaf.text.matchAll(DOUBLE_SPACE_RE)) {
    issues.push(
      makeIssue({
        field: leaf.field,
        category: "spacing",
        severity: "warning",
        location: leaf.location,
        path: leaf.path,
        original: match[0],
        suggestion: " ",
        explanation: "Multiple consecutive spaces.",
      })
    );
  }

  for (const match of leaf.text.matchAll(SPACE_BEFORE_PUNCT_RE)) {
    issues.push(
      makeIssue({
        field: leaf.field,
        category: "spacing",
        severity: "warning",
        location: leaf.location,
        path: leaf.path,
        original: match[0],
        suggestion: match[1],
        explanation: "Space before punctuation.",
      })
    );
  }

  for (const match of leaf.text.matchAll(PLACEHOLDER_RE)) {
    issues.push(
      makeIssue({
        field: leaf.field,
        category: "placeholder_text",
        severity: "warning",
        location: leaf.location,
        path: leaf.path,
        original: match[0],
        suggestion: "",
        explanation: "Placeholder text left in the resume.",
      })
    );
  }

  for (const match of leaf.text.matchAll(PLACEHOLDER_BRACKET_RE)) {
    issues.push(
      makeIssue({
        field: leaf.field,
        category: "placeholder_text",
        severity: "warning",
        location: leaf.location,
        path: leaf.path,
        original: match[0],
        suggestion: "",
        explanation: "Placeholder/template bracket left in the resume.",
      })
    );
  }

  return issues;
}

// ── Cross-leaf checks ───────────────────────────────────────────────────────

// Space-separated digit groups: "+49 1551 0256211", "+49 015510 256211".
// Requires at least 2 space-separated groups after the first so a plain
// 4-digit year (e.g. inside a "2020 - 2021" date range) never matches.
const PHONE_RE = /\+?\d{1,4}(?: \d{2,8}){2,}/g;

function lintPhoneConsistency(leaves: LeafRef[]): ProofreadIssue[] {
  const groups = new Map<
    string,
    { field: ResumeField; location: string; path: string; text: string }[]
  >();

  for (const leaf of leaves) {
    for (const match of leaf.text.matchAll(PHONE_RE)) {
      const digits = match[0].replace(/\D/g, "");
      const list = groups.get(digits) ?? [];
      list.push({
        field: leaf.field,
        location: leaf.location,
        path: leaf.path,
        text: match[0],
      });
      groups.set(digits, list);
    }
  }

  const issues: ProofreadIssue[] = [];
  for (const occurrences of groups.values()) {
    const distinctForms = [...new Set(occurrences.map((o) => o.text))];
    if (distinctForms.length < 2) continue;

    // Canonical: prefer the header phone's spelling, else the most frequent.
    const header = occurrences.find((o) => o.location === "Header → Phone");
    const frequency = new Map<string, number>();
    for (const o of occurrences)
      frequency.set(o.text, (frequency.get(o.text) ?? 0) + 1);
    const mostFrequent = [...frequency.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0][0];
    const canonical = header?.text ?? mostFrequent;

    for (const occurrence of occurrences) {
      if (occurrence.text === canonical) continue;
      issues.push(
        makeIssue({
          field: occurrence.field,
          category: "contact_format",
          severity: "warning",
          location: occurrence.location,
          path: occurrence.path,
          original: occurrence.text,
          suggestion: canonical,
          explanation: `Phone number formatted inconsistently elsewhere in the resume ("${canonical}").`,
        })
      );
    }
  }
  return issues;
}

const URL_TOKEN_RE = /\b[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+\/[^\s,;]*/g;

function lintUrlCasing(leaves: LeafRef[]): ProofreadIssue[] {
  const groups = new Map<
    string,
    { field: ResumeField; location: string; path: string; text: string }[]
  >();

  for (const leaf of leaves) {
    for (const match of leaf.text.matchAll(URL_TOKEN_RE)) {
      const key = match[0].toLowerCase();
      const list = groups.get(key) ?? [];
      list.push({
        field: leaf.field,
        location: leaf.location,
        path: leaf.path,
        text: match[0],
      });
      groups.set(key, list);
    }
  }

  const issues: ProofreadIssue[] = [];
  for (const occurrences of groups.values()) {
    const distinctForms = [...new Set(occurrences.map((o) => o.text))];
    if (distinctForms.length < 2) continue;

    const allLowercase = occurrences.find(
      (o) => o.text === o.text.toLowerCase()
    );
    const frequency = new Map<string, number>();
    for (const o of occurrences)
      frequency.set(o.text, (frequency.get(o.text) ?? 0) + 1);
    const mostFrequent = [...frequency.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0][0];
    const canonical = allLowercase?.text ?? mostFrequent;

    for (const occurrence of occurrences) {
      if (occurrence.text === canonical) continue;
      issues.push(
        makeIssue({
          field: occurrence.field,
          category: "url_casing",
          severity: "warning",
          location: occurrence.location,
          path: occurrence.path,
          original: occurrence.text,
          suggestion: canonical,
          explanation: `Same link appears with different casing elsewhere ("${canonical}").`,
        })
      );
    }
  }
  return issues;
}

const DATE_RANGE_RE =
  /\b(\d{4}|Present|present)\s*([-–])\s*(\d{4}|Present|present)\b/g;

function lintDateSeparators(leaves: LeafRef[]): ProofreadIssue[] {
  type Occurrence = {
    field: ResumeField;
    location: string;
    path: string;
    text: string;
    separator: string;
  };
  const occurrences: Occurrence[] = [];

  for (const leaf of leaves) {
    for (const match of leaf.text.matchAll(DATE_RANGE_RE)) {
      occurrences.push({
        field: leaf.field,
        location: leaf.location,
        path: leaf.path,
        text: match[0],
        separator: match[2],
      });
    }
  }

  const usesHyphen = occurrences.some((o) => o.separator === "-");
  const usesEnDash = occurrences.some((o) => o.separator === "–");
  if (!usesHyphen || !usesEnDash) return [];

  // Hyphen is the canonical/default form; flag the en-dash occurrences.
  return occurrences
    .filter((o) => o.separator === "–")
    .map((o) =>
      makeIssue({
        field: o.field,
        category: "date_format",
        severity: "warning",
        location: o.location,
        path: o.path,
        original: o.text,
        suggestion: o.text.replace("–", "-"),
        explanation:
          "Date range uses an en dash (–) while other date ranges in this resume use a hyphen (-).",
      })
    );
}

function lintBulletPunctuation(resume: ResumeJSON): ProofreadIssue[] {
  type Bullet = {
    field: ResumeField;
    location: string;
    path: string;
    text: string;
  };
  const bullets: Bullet[] = [];
  resume.experience.forEach((exp, expIndex) => {
    exp.achievements.forEach((bullet, i) => {
      if (bullet.trim()) {
        bullets.push({
          field: "experience",
          location: `Experience → ${exp.company} → bullet ${i + 1}`,
          path: `/experience/${expIndex}/achievements/${i}`,
          text: bullet,
        });
      }
    });
  });

  if (bullets.length < 2) return [];

  const endsInPeriod = bullets.filter((b) => /\.\s*$/.test(b.text));
  const ratio = endsInPeriod.length / bullets.length;

  // Only report when there's a clear majority convention (>70% either way)
  // — otherwise it's ambiguous and reporting would be a false positive.
  if (ratio > 0.7) {
    return bullets
      .filter((b) => !/\.\s*$/.test(b.text))
      .map((b) =>
        makeIssue({
          field: b.field,
          category: "bullet_punctuation",
          severity: "warning",
          location: b.location,
          path: b.path,
          original: b.text,
          suggestion: `${b.text}.`,
          explanation:
            "Most bullets in this resume end with a period; this one doesn't.",
        })
      );
  }
  if (ratio < 0.3) {
    return endsInPeriod.map((b) =>
      makeIssue({
        field: b.field,
        category: "bullet_punctuation",
        severity: "warning",
        location: b.location,
        path: b.path,
        original: b.text,
        suggestion: b.text.replace(/\.\s*$/, ""),
        explanation:
          "Most bullets in this resume don't end with a period; this one does.",
      })
    );
  }
  return [];
}

function normalizeBullet(bullet: string): string {
  return bullet
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,;:!?]+$/, "");
}

function lintExactDuplicateBullets(resume: ResumeJSON): ProofreadIssue[] {
  type Occurrence = {
    company: string;
    expIndex: number;
    index: number;
    text: string;
  };
  const byNormalized = new Map<string, Occurrence[]>();

  resume.experience.forEach((exp, expIndex) => {
    exp.achievements.forEach((bullet, i) => {
      const normalized = normalizeBullet(bullet);
      if (!normalized) return;
      const list = byNormalized.get(normalized) ?? [];
      list.push({ company: exp.company, expIndex, index: i, text: bullet });
      byNormalized.set(normalized, list);
    });
  });

  const issues: ProofreadIssue[] = [];
  for (const occurrences of byNormalized.values()) {
    const distinctCompanies = new Set(occurrences.map((o) => o.company));
    if (distinctCompanies.size < 2) continue;

    // First occurrence is the "original"; every later one is the duplicate.
    for (const dup of occurrences.slice(1)) {
      issues.push(
        makeIssue({
          field: "experience",
          category: "exact_duplicate_bullet",
          severity: "error",
          location: `Experience → ${dup.company} → bullet ${dup.index + 1}`,
          path: `/experience/${dup.expIndex}/achievements/${dup.index}`,
          original: dup.text,
          suggestion: "",
          explanation: `Identical bullet also appears under ${occurrences[0].company}.`,
        })
      );
    }
  }
  return issues;
}

/**
 * Run every deterministic check against a resume. Pure, synchronous, no
 * network calls. All returned issues have `source: "lint"`.
 */
export function lintResume(resume: ResumeJSON): ProofreadIssue[] {
  const leaves = collectLeafStrings(resume);

  return [
    ...leaves.flatMap(lintLeafPatterns),
    ...lintPhoneConsistency(leaves),
    ...lintUrlCasing(leaves),
    ...lintDateSeparators(leaves),
    ...lintBulletPunctuation(resume),
    ...lintExactDuplicateBullets(resume),
  ];
}
