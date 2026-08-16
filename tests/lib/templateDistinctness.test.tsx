import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { TemplateEngine } from "@/components/job-v2/engine/TemplateEngine";
import {
  resolveTemplateConfig,
  TEMPLATE_CONFIG,
} from "@/components/job-v2/engine/templates";
import { InlineEditProvider } from "@/components/job-v2/resume/InlineEditContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { DEFAULT_CUSTOMIZATION, TemplateType } from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

// jsdom has no ResizeObserver; useBlockPaginator only needs `observe`/
// `disconnect` to exist so it doesn't throw — it never fires, so every
// column renders on a single page, which is what these tests want.
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only global polyfill
  (global as any).ResizeObserver = StubResizeObserver;
});

const TEMPLATE_IDS = Object.keys(TEMPLATE_CONFIG) as TemplateType[];

const fixtureResume: ResumeJSON = {
  header: {
    name: "Jane Doe",
    headline: "Senior Software Engineer",
    email: "jane@example.com",
    phone: "555-0100",
    location: "Remote",
    linkedin: "https://linkedin.com/in/janedoe",
    github: "https://github.com/janedoe",
    website: "https://janedoe.dev",
    workAuthorization: null,
    nationality: null,
    dateOfBirth: null,
    photoDataUrl: null,
  },
  summary: "Builds distinctive resume templates for a living.",
  experience: [
    {
      company: "Acme Corp",
      role: "Senior Engineer",
      startDate: "2022-01",
      endDate: null,
      description: "Led the platform team.",
      achievements: ["Shipped the template engine", "Cut build time in half"],
    },
  ],
  projects: [
    {
      name: "Resume Builder",
      description: "A local-first resume builder.",
      technologies: ["TypeScript", "React"],
      url: "https://example.com",
      startDate: "2023-01",
      endDate: null,
    },
  ],
  skills: [
    { name: "TypeScript", category: "Languages", tier: "primary" },
    { name: "React", category: "Frameworks", tier: null },
  ],
  education: [
    {
      institution: "State University",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2016-09",
      endDate: "2020-05",
      gpa: "3.8",
    },
  ],
  certifications: [],
  publications: null,
  languages: null,
  volunteer: [
    {
      organization: "Code for Good",
      role: "Mentor",
      startDate: "2021-01",
      endDate: null,
      description: "Mentored bootcamp graduates.",
    },
  ],
  awards: null,
  hobbies: null,
  sectionLayout: null,
};

const AXIS_KEYS = [
  "columns",
  "header",
  "heading",
  "headingSidebar",
  "headingAlign",
  "entryStyle",
  "skillStyle",
  "dateStyle",
  "bulletStyle",
  "sidebarSide",
  "sidebarFill",
  "headerSpan",
  "justifyText",
  "nameWeight",
  "sectionDivider",
  "photoShape",
  "photoFrame",
] as const;

describe("template config distinctness", () => {
  it("covers all 13 templates", () => {
    expect(TEMPLATE_IDS).toHaveLength(13);
  });

  it("every pair of templates differs on at least 3 visual axes", () => {
    const resolved = TEMPLATE_IDS.map((id) => ({
      id,
      config: resolveTemplateConfig(TEMPLATE_CONFIG[id]!),
    }));

    const failures: string[] = [];
    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        const a = resolved[i];
        const b = resolved[j];
        const diffCount = AXIS_KEYS.filter(
          (key) => a.config[key] !== b.config[key]
        ).length;
        if (diffCount < 3) {
          failures.push(`${a.id} vs ${b.id}: only ${diffCount} axes differ`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("template DOM output distinctness", () => {
  it("renders visibly different markup for every template", () => {
    const outputs = TEMPLATE_IDS.map((id) => {
      const { container, unmount } = render(
        <ToastProvider>
          <TemplateEngine
            resume={fixtureResume}
            customization={{ ...DEFAULT_CUSTOMIZATION, template: id }}
            config={TEMPLATE_CONFIG[id]!}
          />
        </ToastProvider>
      );
      const html = container.innerHTML;
      unmount();
      return { id, html };
    });

    const seen = new Map<string, string>();
    for (const { id, html } of outputs) {
      const clash = seen.get(html);
      expect(
        clash,
        `${id} rendered identical markup to ${clash ?? "?"}`
      ).toBeUndefined();
      seen.set(html, id);
    }
  });
});

describe("template editability parity", () => {
  it("exposes the same editable fields in every template", () => {
    const counts = TEMPLATE_IDS.map((id) => {
      const { container, unmount } = render(
        <ToastProvider>
          <InlineEditProvider resume={fixtureResume} updateResume={() => {}}>
            <TemplateEngine
              resume={fixtureResume}
              customization={{ ...DEFAULT_CUSTOMIZATION, template: id }}
              config={TEMPLATE_CONFIG[id]!}
            />
          </InlineEditProvider>
        </ToastProvider>
      );

      const result = {
        id,
        clickToEdit: container.querySelectorAll('[role="button"]').length,
        bulletTextareas: container.querySelectorAll("textarea").length,
        dragHandles: container.querySelectorAll(
          '[aria-label^="Drag to reorder"]'
        ).length,
        deleteButtons: container.querySelectorAll('[aria-label^="Delete "]')
          .length,
      };
      unmount();
      return result;
    });

    const [baseline, ...rest] = counts;
    for (const c of rest) {
      expect(c, `${c.id} vs ${baseline.id}`).toEqual({
        ...baseline,
        id: c.id,
      });
    }
  });
});
