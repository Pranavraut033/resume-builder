/**
 * Template Registry
 * Centralized registry for all prompt templates
 */

import { PromptPurpose } from "@/lib/promptSystem";

import { PromptTemplate, FieldPromptTemplate } from "./types";

/**
 * Centralized template registry
 * Single source of truth for all prompt templates
 */
class TemplateRegistry {
  private static instance: TemplateRegistry;
  private templates: Map<string, PromptTemplate> = new Map();
  private fieldTemplates: Map<string, FieldPromptTemplate> = new Map();

  private constructor() { }

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
   * Register a field prompt template
   */
  registerField(template: FieldPromptTemplate): void {
    if (this.fieldTemplates.has(template.id)) {
      console.warn(`[Template Registry] Overwriting field template: ${template.id}`);
    }
    this.fieldTemplates.set(template.id, template);
  }

  /**
   * Get template by ID
   */
  get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get field template by ID
   */
  getField(id: string): FieldPromptTemplate | undefined {
    return this.fieldTemplates.get(id);
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
   * Get field template by field type
   */
  getFieldByType(fieldType: string): FieldPromptTemplate | undefined {
    for (const template of this.fieldTemplates.values()) {
      if (template.fieldType === fieldType) {
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
   * List all registered field templates
   */
  listAllFields(): FieldPromptTemplate[] {
    return Array.from(this.fieldTemplates.values());
  }

  /**
   * Clear all templates (useful for testing)
   */
  clear(): void {
    this.templates.clear();
    this.fieldTemplates.clear();
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    templateCount: number;
    fieldTemplateCount: number;
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
      "parse_job",
      "parse_resume",
      "analyze_ats"
    ];

    for (const purpose of purposeKeys) {
      purposeCoverage[purpose] = this.getByPurpose(purpose) !== undefined;
    }

    return {
      templateCount: this.templates.size,
      fieldTemplateCount: this.fieldTemplates.size,
      purposeCoverage,
    };
  }
}

export const templateRegistry = TemplateRegistry.getInstance();
export { TemplateRegistry };
