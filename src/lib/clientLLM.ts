/**
 * Client-side LLM operations
 * These functions run in the browser/Tauri context where API keys are accessible
 */

import { OpenAIProvider } from "@/lib/llm/providers/openai";
import { GeminiProvider } from "@/lib/llm/providers/gemini";
import { GrokProvider } from "@/lib/llm/providers/grok";
import { PerplexityProvider } from "@/lib/llm/providers/perplexity";
import { OllamaProvider } from "@/lib/llm/providers/ollama";
import { ResumeJSON, JobDetails, ParsedResume } from "@/types/resume";
import { getApiKey } from "@/lib/keyStorage";
import { LLMProvider } from "@/types/llm";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ClientLLM");

// Provider Factory for managing instances
class ProviderFactory {
  private static instances: Map<string, LLMProvider> = new Map();

  static async getInstance(providerName: string): Promise<LLMProvider | null> {
    const apiKey =
      providerName === "ollama" ? undefined : await getApiKey(providerName);
    const key = `${providerName}`;

    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    let instance = null;

    switch (providerName) {
      case "openai":
        if (apiKey) instance = new OpenAIProvider(apiKey);
        break;
      case "gemini":
        if (apiKey) instance = new GeminiProvider(apiKey);
        break;
      case "grok":
        if (apiKey) instance = new GrokProvider(apiKey);
        break;
      case "perplexity":
        if (apiKey) instance = new PerplexityProvider(apiKey);
        break;
      case "ollama":
        instance = new OllamaProvider();
        break;
    }

    if (instance) {
      this.instances.set(key, instance);
    }

    return instance;
  }

  static clearCache() {
    this.instances.clear();
  }
}

/**
 * Parse job description using LLM
 */
export async function parseJobDescription(
  description: string,
  selectedModel: string,
  selectedProvider: string,
): Promise<JobDetails> {
  const provider = await ProviderFactory.getInstance(selectedProvider);

  console.log({ provider, selectedProvider, selectedModel });

  if (!provider) {
    throw new Error("No provider available for parsing");
  }

  if (selectedProvider === "openai" && provider instanceof OpenAIProvider) {
    const parsed = await provider.parseJobDetails(description, selectedModel);
    return { ...parsed, raw_description: description };
  }

  throw new Error(
    `Job description parsing is only supported with OpenAI provider. Current provider: ${selectedProvider}`,
  );
}

/**
 * Parse resume text using LLM (structured output)
 */
export async function parseResume(
  resumeText: string,
  selectedModel: string,
  selectedProvider: string,
): Promise<ResumeJSON> {
  const provider = await ProviderFactory.getInstance(selectedProvider);

  if (!provider) {
    throw new Error("No provider available for parsing");
  }

  if (selectedProvider === "openai" && provider instanceof OpenAIProvider) {
    const parsed = await provider.parseResume(resumeText, selectedModel);

    // Convert ParsedResume to ResumeJSON format
    return {
      header: {
        name: parsed.header.name,
        email: parsed.header.email,
        phone: parsed.header.phone || undefined,
        location: parsed.header.location || undefined,
        linkedin: parsed.header.linkedin || undefined,
        github: parsed.header.github || undefined,
        website: parsed.header.website || undefined,
      },
      summary: parsed.summary,
      experience: parsed.experience.map((exp) => ({
        company: exp.company,
        role: exp.role,
        startDate: exp.startDate,
        endDate: exp.endDate || undefined,
        description: exp.description,
        achievements: exp.achievements,
      })),
      projects: parsed.projects.map((proj) => ({
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies,
        url: proj.url || undefined,
        startDate: proj.startDate || undefined,
        endDate: proj.endDate || undefined,
      })),
      skills: parsed.skills,
      education: parsed.education.map((edu) => ({
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        startDate: edu.startDate,
        endDate: edu.endDate || undefined,
        gpa: edu.gpa || undefined,
      })),
      certifications: parsed.certifications.map((cert) => ({
        name: cert.name,
        issuer: cert.issuer,
        date: cert.date,
        url: cert.url || undefined,
      })),
      publications: parsed.publications?.map((pub) => ({
        title: pub.title,
        authors: pub.authors,
        venue: pub.venue,
        date: pub.date,
        url: pub.url || undefined,
        doi: pub.doi || undefined,
      })),
      languages: parsed.languages?.map((lang) => ({
        name: lang.name,
        proficiency: lang.proficiency,
      })),
      volunteer: parsed.volunteer?.map((vol) => ({
        organization: vol.organization,
        role: vol.role,
        startDate: vol.startDate,
        endDate: vol.endDate || undefined,
        description: vol.description,
      })),
      awards: parsed.awards?.map((award) => ({
        title: award.title,
        issuer: award.issuer,
        date: award.date,
        description: award.description || undefined,
      })),
    };
  }

  throw new Error(
    `Resume parsing is only supported with OpenAI provider. Current provider: ${selectedProvider}`,
  );
}


/**
 * Generate tailored resume using LLM
 */
export async function generateResume(
  baseProfile: ResumeJSON,
  jobDescription: string,
  jobRole: string,
  company: string,
  selectedModel: string,
  selectedProvider: string,
): Promise<ResumeJSON> {
  const provider = await ProviderFactory.getInstance(selectedProvider);

  if (!provider) {
    throw new Error("Provider not available");
  }

  return await provider.generateResume({
    baseProfile,
    jobDescription,
    jobRole,
    company,
    model: selectedModel,
  });
}

/**
 * Generate cover letter using LLM
 */
export async function generateCoverLetter(
  baseProfile: ResumeJSON,
  resume: ResumeJSON,
  jobDescription: string,
  jobRole: string,
  company: string,
  selectedModel: string,
  selectedProvider: string,
): Promise<string> {
  const provider = await ProviderFactory.getInstance(selectedProvider);

  if (!provider) {
    throw new Error("Provider not available");
  }

  return await provider.generateCoverLetter({
    baseProfile,
    jobDescription,
    jobRole,
    company,
    resume,
    model: selectedModel,
  });
}

/**
 * Fetch available models from all configured providers
 */
export async function fetchModels(): Promise<Record<string, string[]>> {
  const modelsMap: Record<string, string[]> = {
    openai: [],
    gemini: [],
    grok: [],
    perplexity: [],
    ollama: [],
  };
  console.log("Hello");

  for (const [name] of Object.entries(modelsMap)) {
    try {
      const provider = await ProviderFactory.getInstance(name);
      if (provider) {
        // Provider successfully initialized, use static models
        modelsMap[name] = await provider.fetchModels();
        logger.debug(`Models loaded for ${name}`, {
          count: modelsMap[name].length,
        });
      } else {
        // Provider not available (likely no API key), return empty array
        modelsMap[name] = [];
        logger.debug(`Provider ${name} not available (no API key)`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`Failed to initialize provider ${name}`, {
        error,
        errorMessage,
      });
      modelsMap[name] = [];
    }
  }

  return modelsMap;
}

// Export for testing
export { ProviderFactory };
