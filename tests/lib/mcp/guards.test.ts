import { describe, expect, it } from "vitest";

import {
  applyGuard,
  guardAlignOps,
  guardDocumentAnalysis,
  guardTailoredResume,
} from "@/mcp/guards";
import {
  DocumentAnalysisJSON,
  DocumentFinding,
} from "@/types/documentAnalysis";
import { ResumeJSON } from "@/types/resume";

function makeResume(overrides: Partial<ResumeJSON> = {}): ResumeJSON {
  return {
    header: {
      name: "Jamie Rivera",
      headline: "Backend Engineer",
      email: "jamie@example.com",
      phone: "555-0100",
      location: "Berlin, DE",
      linkedin: null,
      github: null,
      website: null,
      workAuthorization: null,
      nationality: null,
      dateOfBirth: null,
      photoDataUrl: null,
    },
    summary: "Senior backend engineer with 6 years building payment systems.",
    experience: [
      {
        company: "Acme Corp",
        role: "Senior Engineer",
        startDate: "2020",
        endDate: "2021",
        description: "Owned the checkout platform.",
        achievements: [
          "Cut checkout latency 40%.",
          "Managed the deploy pipeline.",
        ],
      },
    ],
    projects: [],
    skills: [
      { name: "CPA", category: null, tier: "primary" },
      { name: "K8s", category: null, tier: "primary" },
      { name: "TypeScript", category: null, tier: "primary" },
    ],
    education: [
      {
        institution: "State University",
        degree: "B.S.",
        field: "Computer Science",
        startDate: "2016",
        endDate: "2020",
        gpa: null,
      },
    ],
    certifications: [],
    publications: null,
    languages: null,
    volunteer: null,
    awards: null,
    hobbies: null,
    sectionLayout: { order: ["header", "summary"], hidden: [], custom: [] },
    ...overrides,
  };
}

describe("applyGuard", () => {
  it("wraps a successful guard in { ok: true, value }", () => {
    const result = applyGuard(() => 42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it("turns a thrown guard rejection into { ok: false } instead of letting it escape", () => {
    const result = applyGuard(() => {
      throw new Error("boom");
    });
    expect(result).toEqual({ ok: false, error: "boom" });
  });
});

describe("guardTailoredResume", () => {
  it("carries the base profile's sectionLayout over onto the tailored resume", () => {
    const base = makeResume({
      sectionLayout: {
        order: ["header", "experience"],
        hidden: ["hobbies"],
        custom: [],
      },
    });
    const tailored = makeResume({
      sectionLayout: { order: ["header"], hidden: [], custom: [] },
    });

    const result = guardTailoredResume(base, tailored);

    expect(result.sectionLayout).toEqual(base.sectionLayout);
  });

  it("throws (via assertResumeNotGutted) when the tailored resume empties out sections the base profile had", () => {
    const base = makeResume();
    const gutted = makeResume({
      experience: [],
      skills: [],
      education: [],
      summary: "",
    });

    expect(() => guardTailoredResume(base, gutted)).toThrow(/emptied out/);
  });

  it("surfaces a gutted-resume rejection as { ok: false } via applyGuard, not a thrown error", () => {
    const base = makeResume();
    const gutted = makeResume({
      experience: [],
      skills: [],
      education: [],
      summary: "",
    });

    const result = applyGuard(() => guardTailoredResume(base, gutted));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/emptied out/);
    }
  });

  it("does not throw for a resume that is merely pruned, not gutted", () => {
    const base = makeResume();
    const pruned = makeResume({ projects: [] });

    expect(() => guardTailoredResume(base, pruned)).not.toThrow();
  });
});

describe("guardDocumentAnalysis", () => {
  const baseFinding: DocumentFinding = {
    path: "/summary",
    original: "Senior backend engineer with 6 years building payment systems.",
    suggestion: "",
    kind: "impact",
    severity: "warning",
    why: "No metrics given.",
    source: "llm",
  };

  it('re-stamps every submitted finding to source: "llm", even one claiming source: "lint"', () => {
    const resume = makeResume();
    const submitted: DocumentAnalysisJSON = {
      v: 2,
      findings: [{ ...baseFinding, source: "lint" }],
      summary: "test",
    };

    const result = guardDocumentAnalysis(resume, submitted);

    const judgmentFinding = result.findings.find(
      (finding) => finding.path === "/summary"
    );
    expect(judgmentFinding?.source).toBe("llm");
  });

  it("merges in this server's own lintResume() findings, tagged source: lint", () => {
    // Double space in the summary is a real lintResume()-detectable defect.
    const resume = makeResume({
      summary: "Senior backend  engineer with double spacing.",
    });
    const submitted: DocumentAnalysisJSON = {
      v: 2,
      findings: [],
      summary: "test",
    };

    const result = guardDocumentAnalysis(resume, submitted);

    expect(result.findings.length).toBeGreaterThan(0);
    for (const finding of result.findings) {
      expect(finding.source).toBe("lint");
    }
  });

  it("drops a submitted finding that duplicates a lint finding rather than double-reporting it", () => {
    const resume = makeResume({
      summary: "Senior backend  engineer with double spacing.",
    });
    const submitted: DocumentAnalysisJSON = {
      v: 2,
      findings: [
        {
          ...baseFinding,
          kind: "correctness",
          original: "  ",
          suggestion: " ",
          source: "llm",
        },
      ],
      summary: "test",
    };

    const result = guardDocumentAnalysis(resume, submitted);

    const spacingFindings = result.findings.filter(
      (finding) => finding.original.trim() === ""
    );
    // Deduped: only the lint-produced instance survives, not a second
    // LLM-reported copy of the same defect.
    expect(spacingFindings).toHaveLength(1);
    expect(spacingFindings[0].source).toBe("lint");
  });
});

describe("guardAlignOps", () => {
  function mapping(ops: Parameters<typeof guardAlignOps>[1]["ops"]) {
    return { ops };
  }

  it('rejects a rewrite smuggled in as an "add" on an existing member', () => {
    // RFC 6902 `add` REPLACES an existing object member (fast-json-patch
    // implements this faithfully), so gating the subset check on op name
    // instead of on what the path resolves to left a hole: the same rewrite
    // rejected as "replace" sailed through as "add".
    const resume = makeResume();

    expect(() =>
      guardAlignOps(
        resume,
        mapping([
          {
            item: "summary rewrite",
            op: "add",
            path: "/summary",
            value: "Architected a 40% faster deploy pipeline",
          },
        ])
      )
    ).toThrow(/not additive/);
  });

  it("still accepts a genuine append to an unresolved path", () => {
    const resume = makeResume();

    const result = guardAlignOps(
      resume,
      mapping([
        {
          item: "new skill",
          op: "add",
          path: "/skills/-",
          value: "Kubernetes (K8s)",
        },
      ])
    );

    expect(result).toHaveLength(1);
  });

  it("accepts an acronym -> expansion swap (CPA -> Certified Public Accountant (CPA))", () => {
    const resume = makeResume();

    const result = guardAlignOps(
      resume,
      mapping([
        {
          item: "CPA keyword",
          op: "replace",
          path: "/skills/0/name",
          value: "Certified Public Accountant (CPA)",
        },
      ])
    );

    expect(result).toEqual([
      {
        op: "replace",
        path: "/skills/0/name",
        value: "Certified Public Accountant (CPA)",
      },
    ]);
  });

  it("accepts an abbreviation -> full-name-plus-abbreviation swap (K8s -> Kubernetes (K8s))", () => {
    const resume = makeResume();

    const result = guardAlignOps(
      resume,
      mapping([
        {
          item: "Kubernetes keyword",
          op: "replace",
          path: "/skills/1/name",
          value: "Kubernetes (K8s)",
        },
      ])
    );

    expect(result).toEqual([
      { op: "replace", path: "/skills/1/name", value: "Kubernetes (K8s)" },
    ]);
  });

  it("rejects a rewrite disguised as a swap (Managed the deploy pipeline -> Architected a 40% faster pipeline)", () => {
    const resume = makeResume();

    expect(() =>
      guardAlignOps(
        resume,
        mapping([
          {
            item: "Impact keyword",
            op: "replace",
            path: "/experience/0/achievements/1",
            value: "Architected a 40% faster pipeline",
          },
        ])
      )
    ).toThrow(/not additive/);
  });

  it("rejects an op whose path does not resolve to an existing string value", () => {
    const resume = makeResume();

    expect(() =>
      guardAlignOps(
        resume,
        mapping([
          {
            item: "Nonexistent field",
            op: "replace",
            path: "/experience/0/achievements/99",
            value: "Anything",
          },
        ])
      )
    ).toThrow(/does not resolve/);
  });

  it("rejects the whole call if even one op among several fails the rule", () => {
    const resume = makeResume();

    expect(() =>
      guardAlignOps(
        resume,
        mapping([
          {
            item: "CPA keyword",
            op: "replace",
            path: "/skills/0/name",
            value: "Certified Public Accountant (CPA)",
          },
          {
            item: "Impact keyword",
            op: "replace",
            path: "/experience/0/achievements/1",
            value: "Architected a 40% faster pipeline",
          },
        ])
      )
    ).toThrow(/not additive/);
  });

  it('rejects a "remove" op — removal is never additive', () => {
    const resume = makeResume();

    expect(() =>
      guardAlignOps(
        resume,
        mapping([
          { item: "Drop it", op: "remove", path: "/skills/2", value: null },
        ])
      )
    ).toThrow(/never additive/);
  });

  it('accepts an "add" op without checking token overlap (new content never overwrites existing content)', () => {
    const resume = makeResume();

    const result = guardAlignOps(
      resume,
      mapping([
        {
          item: "New certification keyword",
          op: "add",
          path: "/skills/-",
          value: "Certified Public Accountant (CPA)",
        },
      ])
    );

    expect(result).toEqual([
      {
        op: "add",
        path: "/skills/-",
        value: "Certified Public Accountant (CPA)",
      },
    ]);
  });
});
