import { describe, expect, it } from "vitest";

import { buildSections } from "@/components/job-v2/engine/buildSections";
import { TemplateConfig } from "@/components/job-v2/engine/types";
import { legacyToTheme } from "@/lib/theme/legacyToTheme";
import {
  DEFAULT_CUSTOMIZATION,
  defaultThemeFromScalars,
} from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

const baseResume: ResumeJSON = {
  header: {
    name: "Jane Doe",
    headline: null,
    email: "jane@example.com",
    phone: null,
    location: null,
    linkedin: null,
    github: null,
    website: null,
    workAuthorization: null,
    nationality: null,
    dateOfBirth: null,
    photoDataUrl: null,
  },
  summary: "A summary",
  experience: [],
  projects: [],
  skills: [{ name: "TypeScript", category: null, tier: null }],
  education: [],
  certifications: [],
  publications: null,
  languages: null,
  volunteer: null,
  awards: null,
  hobbies: null,
  sectionLayout: null,
};

const CONFIG: TemplateConfig = {
  columns: 1,
  heading: "underline",
};

describe("buildSections", () => {
  it("falls back to canonical built-in order when sectionLayout is absent", () => {
    const sections = buildSections(baseResume, CONFIG);
    expect(sections.map((s) => s.id)).toContain("summary");
    expect(sections.map((s) => s.id)).toContain("skills");
    // "header" resolves like any other built-in id here — renderers that
    // special-case it (TemplateEngine, txtExport) do so by it having no
    // SECTION_REGISTRY entry, not by buildSections filtering it out.
    expect(sections.map((s) => s.id)).toContain("header");
  });

  it("drops hidden sections", () => {
    const resume: ResumeJSON = {
      ...baseResume,
      sectionLayout: {
        order: ["summary", "skills"],
        hidden: ["skills"],
        custom: [],
        columns: {},
      },
    };
    const sections = buildSections(resume, CONFIG);
    expect(sections.map((s) => s.id)).toEqual(["summary"]);
  });

  it("injects custom sections in the requested order", () => {
    const resume: ResumeJSON = {
      ...baseResume,
      sectionLayout: {
        order: ["custom-1", "summary"],
        hidden: [],
        custom: [
          {
            id: "custom-1",
            title: "Publications List",
            type: "bullets",
            items: ["A paper"],
          },
        ],
        columns: {},
      },
    };
    const sections = buildSections(resume, CONFIG);
    expect(sections.map((s) => s.id)).toEqual(["custom-1", "summary"]);
    expect(sections[0].title).toBe("Publications List");
    expect(sections[0].type).toBe("custom");
  });

  describe("column overrides", () => {
    const TWO_COL_CONFIG: TemplateConfig = {
      columns: 2,
      heading: "underline",
      sectionColumn: {
        skills: 0,
        education: 0,
        experience: 1,
        summary: 1,
        custom: 1,
      },
    };

    it("moves a movable section from side to main via override", () => {
      const resume: ResumeJSON = {
        ...baseResume,
        sectionLayout: {
          order: ["skills", "experience"],
          hidden: [],
          custom: [],
          columns: { skills: 1 },
        },
      };
      const sections = buildSections(resume, TWO_COL_CONFIG);
      expect(sections.find((s) => s.id === "skills")?.column).toBe(1);
      expect(sections.find((s) => s.id === "experience")?.column).toBe(1);
    });

    it("ignores an override on a main-column-locked section", () => {
      const resume: ResumeJSON = {
        ...baseResume,
        sectionLayout: {
          order: ["experience"],
          hidden: [],
          custom: [],
          columns: { experience: 0 },
        },
      };
      const sections = buildSections(resume, TWO_COL_CONFIG);
      expect(sections.find((s) => s.id === "experience")?.column).toBe(1);
    });

    it("ignores all column overrides when the template is 1-column", () => {
      const resume: ResumeJSON = {
        ...baseResume,
        sectionLayout: {
          order: ["skills"],
          hidden: [],
          custom: [],
          columns: { skills: 1 },
        },
      };
      const sections = buildSections(resume, CONFIG);
      expect(sections.find((s) => s.id === "skills")?.column).toBe(0);
    });

    it("places different custom sections in different columns independently", () => {
      const resume: ResumeJSON = {
        ...baseResume,
        sectionLayout: {
          order: ["custom-a", "custom-b"],
          hidden: [],
          custom: [
            { id: "custom-a", title: "A", type: "bullets", items: [] },
            { id: "custom-b", title: "B", type: "bullets", items: [] },
          ],
          columns: { "custom-a": 0, "custom-b": 1 },
        },
      };
      const sections = buildSections(resume, TWO_COL_CONFIG);
      expect(sections.find((s) => s.id === "custom-a")?.column).toBe(0);
      expect(sections.find((s) => s.id === "custom-b")?.column).toBe(1);
    });
  });
});

describe("legacyToTheme", () => {
  it("derives a ThemeConfig from legacy scalar columns when themeJson is null", () => {
    const theme = legacyToTheme(DEFAULT_CUSTOMIZATION);
    expect(theme).toEqual(defaultThemeFromScalars(DEFAULT_CUSTOMIZATION));
  });

  it("prefers themeJson when present", () => {
    const stored = defaultThemeFromScalars(DEFAULT_CUSTOMIZATION);
    stored.fonts.family = "Georgia";
    const theme = legacyToTheme({
      ...DEFAULT_CUSTOMIZATION,
      themeJson: JSON.stringify(stored),
    });
    expect(theme.fonts.family).toBe("Georgia");
  });
});
