/**
 * Client-side LLM operations
 * These functions run in the browser/Tauri context where API keys are accessible
 */

import { TokenUsagePurpose, TokenUsageProvider } from "@/actions/tokenUsage";
import LLMService from "@/lib/llm/llmService";
import { ProviderFactory } from "@/lib/llm/providers/factory";
import { trackTokenUsage, generateRequestId } from "@/lib/llm/tokenTracker";
import { createLogger } from "@/lib/logger";
import { ProviderType, Providers } from "@/types/llm";
import { ResumeJSON, JobDetails } from "@/types/resume";

import { PromptPurpose } from "@/lib/llm/prompts/promptSystem";

const logger = createLogger("ClientLLM");

/**
 * Parse job description using LLM
 */
function simpleParseJobDescription(description: string): JobDetails {
  // Very small heuristic-based parser to extract title and company when LLM parsing is not available
  const resultCompanyMatch = description.match(/at\s+([A-Za-z0-9&.\- ]+)/i);
  const resultTitleMatch =
    description.match(/^([A-Za-z0-9 .\-]+?)\s+(?:position|role|at)\b/i) ||
    description.match(/^([A-Za-z0-9 .\-]+?)\s+at\b/i) ||
    description.match(
      /^(?:Looking for a|We are looking for a)\s+([A-Za-z0-9 .\-]+)/i
    );

  const companyName = resultCompanyMatch ? resultCompanyMatch[1].trim() : "";
  const jobTitle = resultTitleMatch
    ? resultTitleMatch[1].trim()
    : description.split(" at ")[0].trim();

  return {
    job: {
      job_title: jobTitle || "",
      job_role_category: null,
      seniority_level: null,
      employment_type: null,
      workplace_type: null,
      reposted_status: null,
      application_volume_indicator: null,
    },
    company: {
      company_name: companyName || "",
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
  } as JobDetails;
}

export async function parseJobDescription(
  description: string,
  selectedModel: string,
  selectedProvider: ProviderType
): Promise<JobDetails> {
  try {
    const result = await LLMService.parseJob(description, {
      provider: selectedProvider,
      model: selectedModel,
    });

    return result.result;
  } catch (error) {
    logger.error("LLM job parsing failed, falling back to simple parser", {
      error,
    });
    // Fallback to simple parser
    return simpleParseJobDescription(description);
  }
}

/**
 * Parse resume text using LLM (structured output)
 */
export async function parseResume(
  resumeText: string,
  selectedModel: string,
  selectedProvider: string
): Promise<ResumeJSON> {
  try {
    const result = await LLMService.parseResume(resumeText, {
      provider: selectedProvider,
      model: selectedModel,
    });

    return result.result;
  } catch (error) {
    logger.error("LLM job parsing failed, falling back to simple parser", {
      error,
    });
    // Fallback to simple parser
    return simpleParseJobDescription(description);
  }

  const provider = await ProviderFactory.getInstance(selectedProvider);
  const requestId = generateRequestId();

  if (!provider) {
    throw new Error("No provider available for parsing");
  }

  // Use prompt template system for all providers
  const { getPromptByPurpose } = await import("@/lib/llm/prompts");
  const promptContext = {
    resumeText,
  };
  const resolvedPrompt = getPromptByPurpose("parse_resume", promptContext);

  if (selectedProvider === ProviderType.OPENAI && provider.parseResume) {
    // Use OpenAI's structured output method

    const result = await provider.runPrompt(
      [
        {
          role: "system",
          content: resolvedPrompt.systemPrompt,
        },
        {
          role: "user",
          content: resolvedPrompt.userPrompt,
        },
      ],
      selectedModel
    );

    // Track token usage
    if (result.usage?.prompt_tokens && result.usage?.completion_tokens) {
      await trackTokenUsage({
        model: selectedModel,
        provider: selectedProvider as TokenUsageProvider,
        inputTokens: result.usage.prompt_tokens,
        outputTokens: result.usage.completion_tokens,
        purpose: "RESUME_PARSING" as TokenUsagePurpose,
        requestId,
      });
    }

    const parsed = await provider.parseResume(resumeText, selectedModel);
    return parsed;
  }

  // For all other providers, use standard prompt with runPrompt
  const result = await provider.runPrompt(
    [
      {
        role: "system",
        content: resolvedPrompt.systemPrompt,
      },
      {
        role: "user",
        content: resolvedPrompt.userPrompt,
      },
    ],
    selectedModel
  );

  // Track token usage
  if (result.usage?.prompt_tokens && result.usage?.completion_tokens) {
    await trackTokenUsage({
      model: selectedModel,
      provider: selectedProvider as TokenUsageProvider,
      inputTokens: result.usage.prompt_tokens,
      outputTokens: result.usage.completion_tokens,
      purpose: "RESUME_PARSING" as TokenUsagePurpose,
      requestId,
    });
  }

  // Parse the response as JSON (this will be a ParsedResume structure)
  const content = result.content || "";
  const parsed = JSON.parse(content);

  // Convert ParsedResume to ResumeJSON format (same conversion as above)
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
    experience: parsed.experience.map(
      (exp: {
        company: string;
        role: string;
        startDate: string;
        endDate?: string;
        description: string;
        achievements: string[];
      }) => ({
        company: exp.company,
        role: exp.role,
        startDate: exp.startDate,
        endDate: exp.endDate || undefined,
        description: exp.description,
        achievements: exp.achievements,
      })
    ),
    projects: parsed.projects.map(
      (proj: {
        name: string;
        description: string;
        technologies: string[];
        url?: string;
        startDate?: string;
        endDate?: string;
      }) => ({
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies,
        url: proj.url || undefined,
        startDate: proj.startDate || undefined,
        endDate: proj.endDate || undefined,
      })
    ),
    skills: parsed.skills,
    education: parsed.education.map(
      (edu: {
        institution: string;
        degree: string;
        field: string;
        startDate: string;
        endDate?: string;
        gpa?: string;
      }) => ({
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        startDate: edu.startDate,
        endDate: edu.endDate || undefined,
        gpa: edu.gpa || undefined,
      })
    ),
    certifications: parsed.certifications.map(
      (cert: { name: string; issuer: string; date: string; url?: string }) => ({
        name: cert.name,
        issuer: cert.issuer,
        date: cert.date,
        url: cert.url || undefined,
      })
    ),
    publications: parsed.publications?.map(
      (pub: {
        title: string;
        authors: string;
        venue: string;
        date: string;
        url?: string;
        doi?: string;
      }) => ({
        title: pub.title,
        authors: pub.authors,
        venue: pub.venue,
        date: pub.date,
        url: pub.url || undefined,
        doi: pub.doi || undefined,
      })
    ),
    languages: parsed.languages?.map(
      (lang: { name: string; proficiency: string }) => ({
        name: lang.name,
        proficiency: lang.proficiency,
      })
    ),
    volunteer: parsed.volunteer?.map(
      (vol: {
        organization: string;
        role: string;
        startDate: string;
        endDate?: string;
        description: string;
      }) => ({
        organization: vol.organization,
        role: vol.role,
        startDate: vol.startDate,
        endDate: vol.endDate || undefined,
        description: vol.description,
      })
    ),
    awards: parsed.awards?.map(
      (award: {
        title: string;
        issuer: string;
        date: string;
        description?: string;
      }) => ({
        title: award.title,
        issuer: award.issuer,
        date: award.date,
        description: award.description || undefined,
      })
    ),
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
  selectedProvider: string
): Promise<ResumeJSON> {
  const provider = await ProviderFactory.getInstance(selectedProvider);
  const _requestId = generateRequestId();

  if (!provider) {
    throw new Error("Provider not available");
  }

  const { result, usage } = await provider.generateResume({
    baseProfile,
    jobDescription,
    jobRole,
    company,
    model: selectedModel,
  });

  if (usage) {
    await trackTokenUsage({
      model: selectedModel,
      provider: selectedProvider as TokenUsageProvider,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      purpose: "RESUME_GENERATION" as TokenUsagePurpose,
      requestId: _requestId,
    });
  }

  logger.debug("Resume generated", {
    model: selectedModel,
    provider: selectedProvider,
  });

  return result;
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
  selectedProvider: string
): Promise<string> {
  const provider = await ProviderFactory.getInstance(selectedProvider);
  const _requestId = generateRequestId();

  if (!provider) {
    throw new Error("Provider not available");
  }

  const { result, usage } = await provider.generateCoverLetter({
    baseProfile,
    jobDescription,
    jobRole,
    company,
    resume,
    model: selectedModel,
  });

  if (usage) {
    await trackTokenUsage({
      model: selectedModel,
      provider: selectedProvider as TokenUsageProvider,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      purpose: "COVER_LETTER_GENERATION" as TokenUsagePurpose,
      requestId: _requestId,
    });
  }

  logger.debug("Cover letter generated", {
    model: selectedModel,
    provider: selectedProvider,
  });

  return result;
}

/**
 * Fetch available models from all configured providers
 */
export async function fetchModels(): Promise<Record<string, string[]>> {
  const { getAvailableProviderTypes } = await import("@/lib/llm/providers");
  const providerTypes = getAvailableProviderTypes();
  const modelsMap: Record<string, string[]> = {};

  // Initialize empty model array for each provider
  for (const providerType of providerTypes) {
    modelsMap[providerType] = [];
  }

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

/**
 * Generate optimized text for a specific resume field using LLM
 * Context-aware generation using both resume and job data
 */
export async function generateResumeFieldText(
  field: string,
  context: {
    resumeData: ResumeJSON | null;
    jobData: JobDetails | null;
    jobDescription?: string;
    context?: Record<string, unknown>;
  },
  selectedModel?: string,
  selectedProvider?: string,
  _temperature?: number
): Promise<string> {
  let providerName = selectedProvider;
  let model = selectedModel;

  if (!providerName || !model) {
    const { useModelStore } = await import("@/store/modelStore");
    const store = useModelStore.getState?.();

    if (!store) {
      throw new Error("Model store not initialized");
    }

    providerName = providerName || store.getSelectedProvider?.();
    const allModels = store.getAllSelectedModels?.() || [];
    model = model || allModels[0];
  }

  if (!providerName || !model) {
    throw new Error("No LLM provider or model configured");
  }

  const normalizedField = field.toLowerCase();
  const fieldPurposeMap: Record<string, PromptPurpose> = {
    summary: "generate_summary",
    professional_summary: "generate_summary",
    experience: "generate_experience",
    job_description: "generate_experience",
    experience_description: "generate_experience",
    achievements: "generate_experience",
    skills: "generate_skills",
    projects: "generate_projects",
    project_description: "generate_projects",
    education: "generate_education",
    education_description: "generate_education",
  };

  const purpose = fieldPurposeMap[normalizedField] || "generate_summary";

  try {
    const { result, requestId } = await LLMService.generateFieldText(
      field,
      context.resumeData ?? null,
      context.jobData ?? null,
      context.jobDescription,
      {
        provider: providerName as Providers,
        model,
        temperature: _temperature,
        purpose,
      }
    );

    logger.debug("Resume field text generated", {
      field,
      model,
      provider: providerName,
      requestId,
    });

    return result;
  } catch (error) {
    logger.error("Failed to generate field text", { field, error });
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to generate field text");
  }
}

/**
 * Validate connection to an LLM provider
 */
export async function validateProviderConnection(
  providerType: Providers | ProviderType
): Promise<{ success: boolean; message: string }> {
  try {
    const provider = await ProviderFactory.getInstance(providerType);
    if (!provider) {
      return {
        success: false,
        message: `Provider ${providerType} is not available`,
      };
    }

    const result = await provider.validateConnection();
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to validate connection: ${errorMessage}`,
    };
  }
}

// Export ProviderFactory for use in other modules (e.g., atsLLMClient)
export { ProviderFactory };
