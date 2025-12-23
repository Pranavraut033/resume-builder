/**
 * Client-side LLM operations
 * These functions run in the browser/Tauri context where API keys are accessible
 */

import { OpenAIProvider } from "@/lib/llm/providers/openai";
import { GeminiProvider } from "@/lib/llm/providers/gemini";
import { GrokProvider } from "@/lib/llm/providers/grok";
import { PerplexityProvider } from "@/lib/llm/providers/perplexity";
import { OllamaProvider } from "@/lib/llm/providers/ollama";
import { ResumeJSON, JobDetails } from "@/types/resume";
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
    try {
      const parsed = await provider.parseJobDetails(description, selectedModel);
      return { ...parsed, raw_description: description };
    } catch (error) {
      logger.error("Structured parsing failed", {
        error,
        provider: selectedProvider,
      });
    }
  }

  // Fallback to simple parsing for non-OpenAI providers
  const companyMatch = description.match(
    /\s+at\s+([A-Z][a-zA-Z\s&.]+?)(?:\s+to|\s+in|\s+for|\s*$|\.|,)/i,
  );
  const companyName = companyMatch ? companyMatch[1].trim() : "Unknown Company";

  const roleMatch =
    description.match(
      /(?:position|role|job)\s+(?:of|for|as)?\s*([A-Z][a-zA-Z\s]+?)(?:\s|$|at|\.)/i,
    ) || description.match(/^([A-Z][a-zA-Z\s]+?)(?:\s|$|at)/i);
  const jobTitle = roleMatch ? roleMatch[1].trim() : "Unknown Position";

  return {
    job: {
      job_title: jobTitle,
      job_role_category: null,
      seniority_level: null,
      employment_type: null,
      workplace_type: null,
      reposted_status: null,
      application_volume_indicator: null,
    },
    company: {
      company_name: companyName,
      company_industry: null,
      company_description: null,
      company_market_position: null,
      company_location_city: null,
      company_location_country: null,
      office_location_details: null,
    },
    location: {
      city: null,
      state_or_region: null,
      country: null,
      onsite_required: null,
    },
    responsibilities: {
      core_responsibilities: null,
      technical_responsibilities: null,
      collaboration_teams: null,
      architecture_responsibilities: null,
      performance_and_quality_expectations: null,
    },
    requirements: {
      required_experience_years: null,
      primary_technologies: null,
      programming_languages: null,
      frameworks_libraries: null,
      api_knowledge: null,
      version_control_tools: null,
      ux_ui_knowledge: null,
      soft_skills: null,
      language_requirements: null,
    },
    nice_to_have: {
      ci_cd_experience: null,
      testing_experience: null,
      cloud_platforms: null,
      domain_interest: null,
    },
    tech_stack: {
      frontend_stack: null,
      backend_stack: null,
      database: null,
      cloud_stack: null,
      devops_tools: null,
    },
    benefits: {
      compensation_type: null,
      work_environment: null,
      career_growth_opportunities: null,
      flexibility: null,
      office_perks: null,
      team_culture: null,
      events_and_travel: null,
    },
    contact: {
      recruiter_name: null,
      recruiter_role: null,
      contact_email: null,
      contact_phone: null,
      contact_whatsapp_available: null,
    },
    raw_description: description,
  };
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
