/**
 * Prompt Template System Tests
 * Basic tests for template resolution and context shaping
 */

import { describe, it, expect, beforeEach } from "vitest";

import { templateRegistry } from "@/lib/llm/prompts/registry";
import {
  shapeContext,
  resolveTemplate,
  estimateTokens,
} from "@/lib/llm/prompts/resolver";
import { PromptTemplate } from "@/lib/llm/prompts/types";

describe("Prompt Template System", () => {
  describe("Context Shaping", () => {
    it("should extract simple nested paths", () => {
      const context = {
        resume: {
          summary: "Experienced developer",
          skills: ["JavaScript", "TypeScript"],
        },
      };

      const shaped = shapeContext(context, ["resume.summary"]);

      expect(shaped.data).toEqual({
        resume: {
          summary: "Experienced developer",
        },
      });
      expect(shaped.paths).toEqual(["resume.summary"]);
      expect(shaped.unused).toEqual([]);
    });

    it("should handle array indexing", () => {
      const context = {
        resume: {
          experience: [
            { role: "Senior Dev", company: "Tech Corp" },
            { role: "Junior Dev", company: "Start Inc" },
          ],
        },
      };

      const shaped = shapeContext(context, [
        "resume.experience[0].role",
        "resume.experience[0].company",
      ]);

      expect(shaped.data).toEqual({
        resume: {
          experience: [{ role: "Senior Dev", company: "Tech Corp" }],
        },
      });
      expect(shaped.paths).toHaveLength(2);
    });

    it("should track missing paths", () => {
      const context = {
        resume: {
          summary: "Test",
        },
      };

      const shaped = shapeContext(context, [
        "resume.summary",
        "resume.nonexistent",
      ]);

      expect(shaped.paths).toEqual(["resume.summary"]);
      expect(shaped.unused).toEqual(["resume.nonexistent"]);
    });
  });

  describe("Token Estimation", () => {
    it("should estimate tokens correctly", () => {
      const text = "This is a test string with approximately twenty words";
      const tokens = estimateTokens(text);

      // Roughly ~14 tokens (56 chars / 4)
      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(20);
    });
  });

  describe("Template Resolution", () => {
    const testTemplate: PromptTemplate = {
      id: "test_template",
      purpose: "generate_summary",
      systemPrompt: "You are a test assistant.",
      userPrompt: "Generate a summary for {{resume.summary}}",
      requiredContext: ["resume.summary"],
    };

    beforeEach(() => {
      templateRegistry.clear();
      templateRegistry.register(testTemplate);
    });

    it("should resolve template with context", () => {
      const context = {
        resume: {
          summary: "Software engineer with 5 years experience",
        },
      };

      const resolved = resolveTemplate(testTemplate, context, {
        warnUnused: false,
        warnLarge: false,
      });

      expect(resolved.systemPrompt).toBe("You are a test assistant.");
      expect(resolved.userPrompt).toContain(
        "Software engineer with 5 years experience"
      );
      expect(resolved.purpose).toBe("generate_summary");
      expect(resolved.estimatedTokens).toBeGreaterThan(0);
    });

    it("should handle missing context gracefully", () => {
      const context = {};

      const resolved = resolveTemplate(testTemplate, context, {
        warnUnused: false,
      });

      // Should still resolve, but with empty values
      expect(resolved.userPrompt).toContain("Generate a summary for");
      expect(resolved.estimatedTokens).toBeGreaterThan(0);
    });
  });

  describe("Template Registry", () => {
    beforeEach(() => {
      templateRegistry.clear();
    });

    it("should register and retrieve templates", () => {
      const template: PromptTemplate = {
        id: "test",
        purpose: "generate_summary",
        systemPrompt: "System",
        userPrompt: "User",
        requiredContext: [],
      };

      templateRegistry.register(template);

      const retrieved = templateRegistry.get("test");
      expect(retrieved).toEqual(template);
    });

    it("should retrieve templates by purpose", () => {
      const template: PromptTemplate = {
        id: "test",
        purpose: "generate_skills",
        systemPrompt: "System",
        userPrompt: "User",
        requiredContext: [],
      };

      templateRegistry.register(template);

      const retrieved = templateRegistry.getByPurpose("generate_skills");
      expect(retrieved).toEqual(template);
    });

    it("should provide registry statistics", () => {
      const template: PromptTemplate = {
        id: "test",
        purpose: "generate_summary",
        systemPrompt: "System",
        userPrompt: "User",
        requiredContext: [],
      };

      templateRegistry.register(template);

      const stats = templateRegistry.getStats();
      expect(stats.templateCount).toBe(1);
      expect(stats.fieldTemplateCount).toBe(0);
      expect(stats.purposeCoverage["generate_summary"]).toBe(true);
    });
  });
});
