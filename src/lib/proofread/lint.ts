/**
 * Deterministic proofread linter.
 *
 * Pure, synchronous, no LLM — regexes and set logic over the resume's
 * serialized string fields, catching the mechanical defect classes from the
 * proofread plan's corpus: render artifacts, formatting inconsistencies, and
 * exact-duplicate bullets. Perfect recall, zero cost, but only catches what
 * a regex can see — the judgment-requiring classes (spelling of prose,
 * truncated fragments, provenance) are the LLM pass's job (see
 * src/lib/llm/prompts/templates/deep-analysis.ts), merged in by
 * src/lib/llm/domainOps.ts::analyzeDocument.
 *
 * Every finding here carries `source: "lint"` — see the doc comment on
 * `DocumentFindingSchema.source` in src/types/documentAnalysis.ts.
 * Downstream consumers auto-apply `source: "lint"` findings WITHOUT human
 * review, on the theory that a deterministic check is always safe to apply
 * unattended. That is the bar every check in this file must clear: no new
 * check belongs here unless a false positive is acceptable to land on a
 * real user's resume with nobody looking first.
 *
 * ponytail: regexes over the serialized fields, not a parser. Each check is
 * independently testable. Add a real tokenizer only if a check needs
 * sentence structure — at which point it belongs in the LLM pass instead.
 */
import { DocumentFinding } from "@/types/documentAnalysis";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

interface LeafRef {
  // JSON Pointer to this leaf, matching the exact pointer scheme emitted by
  // src/lib/resume/editor.ts::resumePathLines — keep the two in sync.
  path: string;
  text: string;
}

function collectLeafStrings(resume: ResumeJSON): LeafRef[] {
  const leaves: LeafRef[] = [];
  const push = (path: string, text: string | null | undefined) => {
    if (text) leaves.push({ path, text });
  };

  push("/header/name", resume.header.name);
  push("/header/headline", resume.header.headline);
  push("/header/email", resume.header.email);
  push("/header/phone", resume.header.phone);
  push("/header/location", resume.header.location);
  push("/header/linkedin", resume.header.linkedin);
  push("/header/github", resume.header.github);
  push("/header/website", resume.header.website);

  push("/summary", resume.summary);

  resume.experience.forEach((exp, i) => {
    push(`/experience/${i}/description`, exp.description);
    exp.achievements.forEach((bullet, j) =>
      push(`/experience/${i}/achievements/${j}`, bullet)
    );
  });

  resume.projects.forEach((proj, i) => {
    push(`/projects/${i}/description`, proj.description);
    push(`/projects/${i}/url`, proj.url);
  });

  resume.education.forEach((edu, i) => {
    push(`/education/${i}/institution`, edu.institution);
    push(`/education/${i}/degree`, edu.degree);
    push(`/education/${i}/field`, edu.field);
    push(`/education/${i}/gpa`, edu.gpa);
  });

  resume.certifications.forEach((cert, i) => {
    push(`/certifications/${i}/name`, cert.name);
    push(`/certifications/${i}/issuer`, cert.issuer);
    push(`/certifications/${i}/url`, cert.url);
  });

  (resume.publications ?? []).forEach((pub, i) => {
    push(`/publications/${i}/title`, pub.title);
    push(`/publications/${i}/venue`, pub.venue);
    push(`/publications/${i}/url`, pub.url);
  });

  (resume.volunteer ?? []).forEach((vol, i) => {
    push(`/volunteer/${i}/description`, vol.description);
  });

  (resume.awards ?? []).forEach((award, i) => {
    push(`/awards/${i}/description`, award.description);
  });

  (resume.hobbies ?? []).forEach((hobby, i) => push(`/hobbies/${i}`, hobby));

  return leaves;
}

function makeFinding(
  partial: Omit<DocumentFinding, "source">
): DocumentFinding {
  return { ...partial, source: "lint" };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function lintLeafPatterns(leaf: LeafRef): DocumentFinding[] {
  const findings: DocumentFinding[] = [];

  for (const match of leaf.text.matchAll(STRAY_ARTIFACT_RE)) {
    findings.push(
      makeFinding({
        kind: "correctness",
        severity: "error",
        path: leaf.path,
        original: match[0],
        suggestion: "",
        why: "Stray bullet glyph glued to a hyphen — looks like a rendering artifact.",
      })
    );
  }

  for (const match of leaf.text.matchAll(TRAILING_URL_PUNCT_RE)) {
    findings.push(
      makeFinding({
        kind: "correctness",
        severity: "error",
        path: leaf.path,
        original: match[0],
        suggestion: match[0].slice(0, -1),
        why: `Trailing "${match[0].slice(-1)}" glued to a URL — likely a rendering/generation artifact.`,
      })
    );
  }

  for (const match of leaf.text.matchAll(DOUBLE_SPACE_RE)) {
    findings.push(
      makeFinding({
        kind: "correctness",
        severity: "warning",
        path: leaf.path,
        original: match[0],
        suggestion: " ",
        why: "Multiple consecutive spaces.",
      })
    );
  }

  for (const match of leaf.text.matchAll(SPACE_BEFORE_PUNCT_RE)) {
    findings.push(
      makeFinding({
        kind: "correctness",
        severity: "warning",
        path: leaf.path,
        original: match[0],
        suggestion: match[1],
        why: "Space before punctuation.",
      })
    );
  }

  for (const match of leaf.text.matchAll(PLACEHOLDER_RE)) {
    findings.push(
      makeFinding({
        kind: "correctness",
        severity: "warning",
        path: leaf.path,
        original: match[0],
        suggestion: "",
        why: "Placeholder text left in the resume.",
      })
    );
  }

  for (const match of leaf.text.matchAll(PLACEHOLDER_BRACKET_RE)) {
    findings.push(
      makeFinding({
        kind: "correctness",
        severity: "warning",
        path: leaf.path,
        original: match[0],
        suggestion: "",
        why: "Placeholder/template bracket left in the resume.",
      })
    );
  }

  return findings;
}

// ── Cross-leaf checks ───────────────────────────────────────────────────────

// Space-separated digit groups: "+49 1551 0256211", "+49 015510 256211".
// Requires at least 2 space-separated groups after the first so a plain
// 4-digit year (e.g. inside a "2020 - 2021" date range) never matches.
const PHONE_RE = /\+?\d{1,4}(?: \d{2,8}){2,}/g;

function lintPhoneConsistency(leaves: LeafRef[]): DocumentFinding[] {
  const groups = new Map<string, { path: string; text: string }[]>();

  for (const leaf of leaves) {
    for (const match of leaf.text.matchAll(PHONE_RE)) {
      const digits = match[0].replace(/\D/g, "");
      const list = groups.get(digits) ?? [];
      list.push({ path: leaf.path, text: match[0] });
      groups.set(digits, list);
    }
  }

  const findings: DocumentFinding[] = [];
  for (const occurrences of groups.values()) {
    const distinctForms = [...new Set(occurrences.map((o) => o.text))];
    if (distinctForms.length < 2) continue;

    // Canonical: prefer the header phone's spelling, else the most frequent.
    const header = occurrences.find((o) => o.path === "/header/phone");
    const frequency = new Map<string, number>();
    for (const o of occurrences)
      frequency.set(o.text, (frequency.get(o.text) ?? 0) + 1);
    const mostFrequent = [...frequency.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0][0];
    const canonical = header?.text ?? mostFrequent;

    for (const occurrence of occurrences) {
      if (occurrence.text === canonical) continue;
      findings.push(
        makeFinding({
          kind: "correctness",
          severity: "warning",
          path: occurrence.path,
          original: occurrence.text,
          suggestion: canonical,
          why: `Phone number formatted inconsistently elsewhere in the resume ("${canonical}").`,
        })
      );
    }
  }
  return findings;
}

const URL_TOKEN_RE = /\b[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+\/[^\s,;]*/g;

function lintUrlCasing(leaves: LeafRef[]): DocumentFinding[] {
  const groups = new Map<string, { path: string; text: string }[]>();

  for (const leaf of leaves) {
    for (const match of leaf.text.matchAll(URL_TOKEN_RE)) {
      const key = match[0].toLowerCase();
      const list = groups.get(key) ?? [];
      list.push({ path: leaf.path, text: match[0] });
      groups.set(key, list);
    }
  }

  const findings: DocumentFinding[] = [];
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
      findings.push(
        makeFinding({
          kind: "correctness",
          severity: "warning",
          path: occurrence.path,
          original: occurrence.text,
          suggestion: canonical,
          why: `Same link appears with different casing elsewhere ("${canonical}").`,
        })
      );
    }
  }
  return findings;
}

const DATE_RANGE_RE =
  /\b(\d{4}|Present|present)\s*([-–])\s*(\d{4}|Present|present)\b/g;

function lintDateSeparators(leaves: LeafRef[]): DocumentFinding[] {
  type Occurrence = { path: string; text: string; separator: string };
  const occurrences: Occurrence[] = [];

  for (const leaf of leaves) {
    for (const match of leaf.text.matchAll(DATE_RANGE_RE)) {
      occurrences.push({
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
      makeFinding({
        kind: "correctness",
        severity: "warning",
        path: o.path,
        original: o.text,
        suggestion: o.text.replace("–", "-"),
        why: "Date range uses an en dash (–) while other date ranges in this resume use a hyphen (-).",
      })
    );
}

function lintBulletPunctuation(resume: ResumeJSON): DocumentFinding[] {
  type Bullet = { path: string; text: string };
  const bullets: Bullet[] = [];
  resume.experience.forEach((exp, expIndex) => {
    exp.achievements.forEach((bullet, i) => {
      if (bullet.trim()) {
        bullets.push({
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
        makeFinding({
          kind: "correctness",
          severity: "warning",
          path: b.path,
          original: b.text,
          suggestion: `${b.text}.`,
          why: "Most bullets in this resume end with a period; this one doesn't.",
        })
      );
  }
  if (ratio < 0.3) {
    return endsInPeriod.map((b) =>
      makeFinding({
        kind: "correctness",
        severity: "warning",
        path: b.path,
        original: b.text,
        suggestion: b.text.replace(/\.\s*$/, ""),
        why: "Most bullets in this resume don't end with a period; this one does.",
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

function lintExactDuplicateBullets(resume: ResumeJSON): DocumentFinding[] {
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

  const findings: DocumentFinding[] = [];
  for (const occurrences of byNormalized.values()) {
    const distinctCompanies = new Set(occurrences.map((o) => o.company));
    if (distinctCompanies.size < 2) continue;

    // First occurrence is the "original"; every later one is the duplicate.
    for (const dup of occurrences.slice(1)) {
      findings.push(
        makeFinding({
          kind: "duplication",
          severity: "error",
          path: `/experience/${dup.expIndex}/achievements/${dup.index}`,
          original: dup.text,
          suggestion: "",
          why: `Identical bullet also appears under ${occurrences[0].company}.`,
        })
      );
    }
  }
  return findings;
}

// ── Canonical brand casing ──────────────────────────────────────────────────
//
// Deliberately capped: this table has no natural stopping point, and every
// entry is a maintenance liability (a brand that re-styles its own name
// makes a "wrong" form correct overnight). Kept to well-known developer
// tools/platforms whose incorrect casing is unambiguous and whose correctly
// cased name never collides with a common English word — that ambiguity is
// exactly what would make an auto-applied false positive.

interface BrandEntry {
  canonical: string;
  wrong: string[];
}

const BRAND_TABLE: BrandEntry[] = [
  { canonical: "JavaScript", wrong: ["Javascript", "javascript"] },
  { canonical: "TypeScript", wrong: ["Typescript", "typescript"] },
  { canonical: "Node.js", wrong: ["NodeJS", "Nodejs", "nodejs", "Node.JS"] },
  { canonical: "GitHub", wrong: ["Github", "github"] },
  { canonical: "GitLab", wrong: ["Gitlab", "gitlab"] },
  {
    canonical: "PostgreSQL",
    wrong: ["Postgres", "postgres", "Postgresql", "postgresql"],
  },
  { canonical: "MySQL", wrong: ["Mysql", "mysql", "MySql"] },
  { canonical: "MongoDB", wrong: ["Mongodb", "mongodb", "MongoDb"] },
  { canonical: "Kubernetes", wrong: ["kubernetes"] },
  { canonical: "Docker", wrong: ["docker"] },
  { canonical: "Jenkins", wrong: ["jenkins"] },
  { canonical: "Terraform", wrong: ["terraform"] },
  { canonical: "GraphQL", wrong: ["Graphql", "graphql"] },
  { canonical: "RabbitMQ", wrong: ["Rabbitmq", "rabbitmq"] },
  {
    canonical: "Elasticsearch",
    wrong: ["ElasticSearch", "elasticsearch", "Elastic Search"],
  },
  { canonical: "Kibana", wrong: ["kibana"] },
  { canonical: "Grafana", wrong: ["grafana"] },
  { canonical: "Prometheus", wrong: ["prometheus"] },
  { canonical: "WordPress", wrong: ["Wordpress", "wordpress"] },
  { canonical: "Salesforce", wrong: ["SalesForce", "salesforce"] },
  { canonical: "LinkedIn", wrong: ["Linkedin", "linkedin", "LinkedIN"] },
  { canonical: "YouTube", wrong: ["Youtube", "youtube"] },
]; // 22 entries — start ~20, hard cap 25 (see comment above).

function lintBrandCasing(leaves: LeafRef[]): DocumentFinding[] {
  const findings: DocumentFinding[] = [];
  for (const leaf of leaves) {
    for (const entry of BRAND_TABLE) {
      for (const wrong of entry.wrong) {
        // Not just \b: a word boundary still matches inside "docker-compose",
        // "github.com", or "nodejs.org", and this finding auto-applies with
        // no human review — rewriting a URL or a hyphenated tool name is a
        // silent corruption, not a bad suggestion. Require the match to be
        // free-standing: no adjacent -, ., /, @ or : on either side. (_ and
        // alphanumerics are already excluded by \b itself.)
        const re = new RegExp(
          `(?<![-./@:\\w])${escapeRegExp(wrong)}(?![-./@:\\w])`,
          "g"
        );
        for (const match of leaf.text.matchAll(re)) {
          findings.push(
            makeFinding({
              kind: "correctness",
              severity: "warning",
              path: leaf.path,
              original: match[0],
              suggestion: entry.canonical,
              why: `"${match[0]}" should use the canonical brand casing "${entry.canonical}".`,
            })
          );
        }
      }
    }
  }
  return findings;
}

/** Canonical brand-table casing for `text`, if `text` names a table entry. */
function brandCanonicalFor(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const entry of BRAND_TABLE) {
    if (entry.canonical.toLowerCase() === lower) return entry.canonical;
    if (entry.wrong.some((w) => w.toLowerCase() === lower))
      return entry.canonical;
  }
  return undefined;
}

// ── Internal consistency ────────────────────────────────────────────────────
//
// "Same term written two ways" is only safe to auto-apply for a narrow token
// shape: identifiers that mix letters with a digit (K8s/k8s, S3/s3, Web3/web3,
// OAuth2/oauth2, B2B/b2b). Prose capitalization varies by sentence position
// far too much to lint safely (a lowercase word mid-sentence isn't a
// casing bug), so this deliberately does not attempt general word-casing
// consistency — that class stays the LLM pass's job.
const IDENTIFIER_TOKEN_RE =
  /\b(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*[0-9])[A-Za-z][A-Za-z0-9]*\b/g;

function lintInternalConsistency(leaves: LeafRef[]): DocumentFinding[] {
  type Occurrence = { path: string; text: string };
  const groups = new Map<string, Occurrence[]>();

  for (const leaf of leaves) {
    for (const match of leaf.text.matchAll(IDENTIFIER_TOKEN_RE)) {
      const key = match[0].toLowerCase();
      const list = groups.get(key) ?? [];
      list.push({ path: leaf.path, text: match[0] });
      groups.set(key, list);
    }
  }

  const findings: DocumentFinding[] = [];
  for (const occurrences of groups.values()) {
    const distinctForms = [...new Set(occurrences.map((o) => o.text))];
    if (distinctForms.length < 2) continue;

    // Brand-table terms are already normalized by lintBrandCasing
    // regardless of frequency — skip here so the same substring never gets
    // two conflicting findings.
    if (brandCanonicalFor(distinctForms[0])) continue;

    const frequency = new Map<string, number>();
    for (const o of occurrences)
      frequency.set(o.text, (frequency.get(o.text) ?? 0) + 1);
    const canonical = [...frequency.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    for (const occurrence of occurrences) {
      if (occurrence.text === canonical) continue;
      findings.push(
        makeFinding({
          kind: "correctness",
          severity: "warning",
          path: occurrence.path,
          original: occurrence.text,
          suggestion: canonical,
          why: `Written as "${canonical}" elsewhere in this resume — keep the same spelling throughout.`,
        })
      );
    }
  }
  return findings;
}

// ── Skill-entry merge ────────────────────────────────────────────────────────

// Strips a trailing ".js"/"js" suffix so "React" and "React.js" (or
// "Node"/"NodeJS" → normalized "node") group together. Doesn't collide with
// real skill names ending "...js" as a coincidence of spelling (none do in
// common resume vocabulary).
const SKILL_JS_SUFFIX_RE = /\.?js$/i;

function normalizeSkillKey(name: string): string {
  return name.trim().replace(SKILL_JS_SUFFIX_RE, "").trim().toLowerCase();
}

function lintSkillMerge(resume: ResumeJSON): DocumentFinding[] {
  type Occurrence = { index: number; name: string };
  const groups = new Map<string, Occurrence[]>();

  resume.skills.forEach((skill, index) => {
    const key = normalizeSkillKey(skill.name);
    if (!key) return;
    const list = groups.get(key) ?? [];
    list.push({ index, name: skill.name });
    groups.set(key, list);
  });

  const findings: DocumentFinding[] = [];
  for (const occurrences of groups.values()) {
    if (occurrences.length < 2) continue;

    // Prefer the entry with no ".js"/"js" suffix as canonical when there's
    // exactly one such candidate (matches the "React" over "React.js"
    // convention); otherwise fall back to the first occurrence, same
    // first-wins rule as lintExactDuplicateBullets.
    const withoutSuffix = occurrences.filter(
      (o) => !SKILL_JS_SUFFIX_RE.test(o.name.trim())
    );
    const canonical =
      withoutSuffix.length === 1 ? withoutSuffix[0] : occurrences[0];

    for (const occurrence of occurrences) {
      if (occurrence.index === canonical.index) continue;
      findings.push(
        makeFinding({
          kind: "duplication",
          severity: "warning",
          path: `/skills/${occurrence.index}/name`,
          original: occurrence.name,
          suggestion: "",
          why: `Duplicate skill entry — "${occurrence.name}" and "${canonical.name}" are the same skill; keep one.`,
        })
      );
    }
  }
  return findings;
}

// ── Language notation ───────────────────────────────────────────────────────
//
// Region-gated via regionGuidance's German/EU signal (not a new mechanism):
// CEFR shorthand ("C1") is the CORRECT, expected notation in this app's
// German/EU default market (see regionGuidance.ts's own "never a vague
// 'fluent'" rule) — so this check only fires once the job is clearly outside
// that market, where a plain descriptive word reads better than an
// unexplained letter+number code (playbook §13 / KIT).

// ── Spelling variant (en-US ↔ en-GB) ────────────────────────────────────────
//
// Lives here rather than in the align_resume_terms tool precisely because
// it's a REPLACEMENT, not an addition — swapping "organize" for "organise"
// fails the additive-only token-subset guard by design. That's intentional:
// a deterministic spelling-convention match against the job's own wording is
// safe to auto-apply, even though it wouldn't pass the tool's guard.

interface SpellingPair {
  us: string;
  gb: string;
}

const SPELLING_PAIRS: SpellingPair[] = [
  { us: "organize", gb: "organise" },
  { us: "organized", gb: "organised" },
  { us: "organizing", gb: "organising" },
  { us: "organization", gb: "organisation" },
  { us: "organizations", gb: "organisations" },
  { us: "recognize", gb: "recognise" },
  { us: "recognized", gb: "recognised" },
  { us: "optimize", gb: "optimise" },
  { us: "optimized", gb: "optimised" },
  { us: "optimizing", gb: "optimising" },
  { us: "prioritize", gb: "prioritise" },
  { us: "prioritized", gb: "prioritised" },
  { us: "analyze", gb: "analyse" },
  { us: "analyzed", gb: "analysed" },
  { us: "analyzing", gb: "analysing" },
  { us: "customize", gb: "customise" },
  { us: "customized", gb: "customised" },
  { us: "standardize", gb: "standardise" },
  { us: "standardized", gb: "standardised" },
  { us: "utilize", gb: "utilise" },
  { us: "utilized", gb: "utilised" },
  { us: "realize", gb: "realise" },
  { us: "realized", gb: "realised" },
  { us: "finalize", gb: "finalise" },
  { us: "finalized", gb: "finalised" },
  { us: "initialize", gb: "initialise" },
  { us: "initialized", gb: "initialised" },
  { us: "specialize", gb: "specialise" },
  { us: "specialized", gb: "specialised" },
  { us: "modernize", gb: "modernise" },
  { us: "modernized", gb: "modernised" },
  { us: "color", gb: "colour" },
  { us: "colors", gb: "colours" },
  { us: "favor", gb: "favour" },
  { us: "favorite", gb: "favourite" },
  { us: "honor", gb: "honour" },
  { us: "labor", gb: "labour" },
  { us: "behavior", gb: "behaviour" },
  { us: "neighbor", gb: "neighbour" },
  { us: "center", gb: "centre" },
  { us: "centers", gb: "centres" },
];

/**
 * Which spelling variant the job description is written in, by counting
 * unambiguous -ize/-ise and -or/-our word occurrences. `null` when there's
 * no signal or it's a tie — guessing wrong would auto-apply the wrong
 * spelling, so silence is the safe default.
 */
function detectSpellingVariant(text: string): "us" | "gb" | null {
  let usCount = 0;
  let gbCount = 0;
  for (const pair of SPELLING_PAIRS) {
    const usRe = new RegExp(`\\b${pair.us}\\b`, "gi");
    const gbRe = new RegExp(`\\b${pair.gb}\\b`, "gi");
    usCount += (text.match(usRe) ?? []).length;
    gbCount += (text.match(gbRe) ?? []).length;
  }
  if (usCount === 0 && gbCount === 0) return null;
  if (usCount === gbCount) return null;
  return usCount > gbCount ? "us" : "gb";
}

function matchCase(sample: string, template: string): string {
  if (sample === sample.toUpperCase()) return template.toUpperCase();
  if (sample[0] === sample[0].toUpperCase())
    return template[0].toUpperCase() + template.slice(1);
  return template;
}

function lintSpellingVariant(
  leaves: LeafRef[],
  jobDetails: JobDetailsJSON
): DocumentFinding[] {
  const targetVariant = detectSpellingVariant(jobDetails.raw_description);
  if (!targetVariant) return [];

  const findings: DocumentFinding[] = [];
  for (const leaf of leaves) {
    for (const pair of SPELLING_PAIRS) {
      const wrongWord = targetVariant === "us" ? pair.gb : pair.us;
      const rightWord = targetVariant === "us" ? pair.us : pair.gb;
      const re = new RegExp(`\\b${wrongWord}\\b`, "gi");
      for (const match of leaf.text.matchAll(re)) {
        findings.push(
          makeFinding({
            kind: "correctness",
            severity: "suggestion",
            path: leaf.path,
            original: match[0],
            suggestion: matchCase(match[0], rightWord),
            why: `The job description is written in ${targetVariant === "us" ? "US" : "UK"} English; this resume uses the other spelling ("${match[0]}").`,
          })
        );
      }
    }
  }
  return findings;
}

export interface LintResumeOptions {
  // Target job for the resume. Optional and additive: existing callers that
  // pass only a resume keep working unchanged.
  // Feeds lintSpellingVariant, which needs the JD's own wording to know which
  // spelling variant to match — with no jobDetails, that check doesn't run.
  jobDetails?: JobDetailsJSON | null;
}

/**
 * Run every deterministic check against a resume. Pure, synchronous, no
 * network calls. All returned findings have `source: "lint"`.
 */
export function lintResume(
  resume: ResumeJSON,
  options: LintResumeOptions = {}
): DocumentFinding[] {
  const { jobDetails } = options;
  const leaves = collectLeafStrings(resume);

  return [
    ...leaves.flatMap(lintLeafPatterns),
    ...lintPhoneConsistency(leaves),
    ...lintUrlCasing(leaves),
    ...lintDateSeparators(leaves),
    ...lintBulletPunctuation(resume),
    ...lintExactDuplicateBullets(resume),
    ...lintBrandCasing(leaves),
    ...lintInternalConsistency(leaves),
    ...lintSkillMerge(resume),
    ...(jobDetails ? lintSpellingVariant(leaves, jobDetails) : []),
  ];
}
