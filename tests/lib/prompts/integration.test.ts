/**
 * Integration Tests for Refactored Prompt System
 * Verifies that PromptSystem and fieldPromptSystem work with new template engine
 */

import { describe, it, expect } from "vitest";

import { ExtractedContext } from "@/lib/contextExtractor";
import { generateFieldPrompt } from "@/lib/fieldPromptSystem";
import PromptSystem, { PromptContext } from "@/lib/promptSystem";

describe("Refactored Prompt System Integration", () => {
  describe("PromptSystem with Templates", () => {
    it("should generate summary prompt using templates", () => {
      const context: PromptContext = {
        resume: {
          header: {
            name: "John Doe",
            email: "john@example.com",
            phone: "",
            location: "",
          },
          summary: "Experienced software engineer",
          skills: ["JavaScript", "TypeScript", "React"],
          experience: [
            {
              company: "Tech Corp",
              role: "Senior Developer",
              startDate: "2020-01",
              endDate: "2023-12",
              description: "Led development",
              achievements: [],
              technologies: [],
            },
          ],
          projects: [],
          education: [],
          certifications: [],
        },
        jobData: {
          details: {
            job: {
              job_title: "Staff Engineer",
              job_role_category: null,
              seniority_level: null,
              employment_type: null,
              workplace_type: null,
              reposted_status: null,
              application_volume_indicator: null,
            },
            company: {
              company_name: "Innovation Inc",
              industry: null,
              description: null,
              market_position: null,
            },
            location: null,
            responsibilities: null,
            requirements: null,
            benefits: null,
            salary: null,
            contact: null,
            raw_description: "",
          },
        },
        jobDescription: "Looking for a senior engineer with React experience",
      };

      const prompt = PromptSystem.generatePrompt("generate_summary", context);

      expect(prompt).toBeDefined();
      expect(prompt.purpose).toBe("generate_summary");
      expect(prompt.systemPrompt).toContain("expert resume writer");
      expect(prompt.userPrompt).toContain("professional summary");
      expect(prompt.context).toEqual(context);
    });

    it("should generate experience prompt using templates", () => {
      const context: PromptContext = {
        resume: {
          header: {
            name: "Jane Smith",
            email: "jane@example.com",
            phone: "",
            location: "",
          },
          summary: "",
          skills: [],
          experience: [
            {
              company: "StartUp Inc",
              role: "Developer",
              startDate: "2021-01",
              endDate: "2023-12",
              description: "Built features",
              achievements: ["Improved performance by 50%"],
              technologies: ["Python", "Django"],
            },
          ],
          projects: [],
          education: [],
          certifications: [],
        },
        jobData: {
          details: {
            job: {
              job_title: "Senior Backend Developer",
              job_role_category: null,
              seniority_level: null,
              employment_type: null,
              workplace_type: null,
              reposted_status: null,
              application_volume_indicator: null,
            },
            company: null,
            location: null,
            responsibilities: ["Build scalable APIs"],
            requirements: {
              required_skills: ["Python", "Django", "PostgreSQL"],
              nice_to_have_skills: null,
              years_of_experience: null,
              education: null,
              certifications: null,
              tech_stack: null,
            },
            benefits: null,
            salary: null,
            contact: null,
            raw_description: "",
          },
        },
      };

      const prompt = PromptSystem.generatePrompt("generate_experience", context);

      expect(prompt).toBeDefined();
      expect(prompt.purpose).toBe("generate_experience");
      expect(prompt.systemPrompt).toContain("work experience");
      expect(prompt.userPrompt).toContain("experience");
    });

    it("should handle parse_job purpose", () => {
      const context: PromptContext = {
        jobDescription:
          "We are looking for a Full Stack Developer with 5+ years experience in React and Node.js",
      };

      const prompt = PromptSystem.generatePrompt("parse_job", context);

      expect(prompt).toBeDefined();
      expect(prompt.purpose).toBe("parse_job");
      expect(prompt.systemPrompt).toContain("job market analyst");
      expect(prompt.userPrompt).toContain("Full Stack Developer");
    });
  });

  describe("Field Prompt System with Templates", () => {
    it("should generate summary field prompt", () => {
      const context: ExtractedContext = {
        currentContent: "Software engineer with 5 years experience",
        currentRole: "Senior Developer",
        yearsOfExperience: "5",
        keySkills: ["JavaScript", "React", "Node.js"],
        targetJobTitle: "Staff Engineer",
      };

      const prompt = generateFieldPrompt("summary", context);

      expect(prompt).toBeDefined();
      expect(prompt.systemPrompt).toContain("expert resume writer");
      expect(prompt.userPrompt).toContain("Software engineer with 5 years experience");
      expect(prompt.userPrompt).toContain("Senior Developer");
    });

    it("should generate experience field prompt", () => {
      const context: ExtractedContext = {
        currentContent: "Led development of new features",
        role: "Senior Developer",
        company: "Tech Corp",
        dateRange: "2020-01 - 2023-12",
        targetJobTitle: "Staff Engineer",
        relevantSkills: ["React", "TypeScript"],
      };

      const prompt = generateFieldPrompt("experience_description", context);

      expect(prompt).toBeDefined();
      expect(prompt.systemPrompt).toContain("expert resume writer");
      expect(prompt.userPrompt).toContain("Led development of new features");
      expect(prompt.userPrompt).toContain("Tech Corp");
    });

    it("should handle empty context gracefully", () => {
      const context: ExtractedContext = {
        currentContent: "",
      };

      const prompt = generateFieldPrompt("summary", context);

      expect(prompt).toBeDefined();
      expect(prompt.systemPrompt).toBeTruthy();
      expect(prompt.userPrompt).toBeTruthy();
      expect(prompt.userPrompt).toContain("[empty field]");
    });
  });

  describe("Format and Display Functions", () => {
    it("should format prompt for display", () => {
      const context: PromptContext = {
        resume: {
          header: {
            name: "Test User",
            email: "test@example.com",
            phone: "",
            location: "",
          },
          summary: "Test summary",
          skills: [],
          experience: [],
          projects: [],
          education: [],
          certifications: [],
        },
      };

      const prompt = PromptSystem.generatePrompt("generate_summary", context);
      const formatted = PromptSystem.formatPromptForDisplay(prompt);

      expect(formatted).toContain("System Prompt:");
      expect(formatted).toContain("User Prompt:");
    });

    it("should get purpose label", () => {
      const label = PromptSystem.getPurposeLabel("generate_summary");
      expect(label).toBe("Professional Summary Generation");
    });
  });
});
