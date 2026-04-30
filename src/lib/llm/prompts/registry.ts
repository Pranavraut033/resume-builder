/**
 * Template Registry
 * Centralized registry for all prompt templates
 */

import { PromptTemplate, PromptPurpose } from "./types";

/**
 * Centralized template registry
 * Single source of truth for all prompt templates
 */
class TemplateRegistry {
  private static instance: TemplateRegistry;
  private templates: Map<string, PromptTemplate> = new Map();

  private constructor() {}

  static getInstance(): TemplateRegistry {
    if (!TemplateRegistry.instance) {
      TemplateRegistry.instance = new TemplateRegistry();
    }
    return TemplateRegistry.instance;
  }

  /**
   * Register a prompt template
   */
  register(template: PromptTemplate): void {
    if (this.templates.has(template.id)) {
      console.warn(`[Template Registry] Overwriting template: ${template.id}`);
    }
    this.templates.set(template.id, template);
  }

  /**
   * Get template by ID
   */
  get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get template by purpose
   */
  getByPurpose(purpose: PromptPurpose): PromptTemplate | undefined {
    for (const template of this.templates.values()) {
      if (template.purpose === purpose) {
        return template;
      }
    }
    return undefined;
  }

  /**
   * List all registered templates
   */
  listAll(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Clear all templates (useful for testing)
   */
  clear(): void {
    this.templates.clear();
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    templateCount: number;
    purposeCoverage: Record<string, boolean>;
  } {
    const purposeCoverage: Record<string, boolean> = {};

    // Check which purposes are covered
    const purposeKeys: PromptPurpose[] = [
      "generate_summary",
      "generate_experience",
      "generate_skills",
      "generate_projects",
      "generate_education",
      "edit_resume_chat",
      "parse_job",
      "parse_resume",
      "analyze_ats",
    ];

    for (const purpose of purposeKeys) {
      purposeCoverage[purpose] = this.getByPurpose(purpose) !== undefined;
    }

    return {
      templateCount: this.templates.size,
      purposeCoverage,
    };
  }
}

export const templateRegistry = TemplateRegistry.getInstance();
export { TemplateRegistry };
