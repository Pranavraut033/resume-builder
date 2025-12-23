import { vi } from "vitest";
import { LLMProvider } from "@/types/llm";
import { ResumeJSON, JobDetails } from "@/types/resume";
import {
  TEST_CONFIG,
  getTestApiKey,
  getTestModel,
} from "../config/test.config";

/**
 * Mock LLM Provider for testing
 */
export class MockLLMProvider implements LLMProvider {
  generateResume = vi.fn().mockResolvedValue({
    header: { name: "Test User", email: "test@example.com" },
    summary: "Mock generated summary",
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
  } as ResumeJSON);

  generateCoverLetter = vi.fn().mockResolvedValue("Mock cover letter content");

  fetchModels = vi.fn().mockResolvedValue(["mock-model-1", "mock-model-2"]);

  parseJobDetails = vi.fn().mockResolvedValue({
    job: {
      job_title: "Software Engineer",
      job_role_category: "Engineering",
      seniority_level: "Mid",
      employment_type: "Full-time",
      workplace_type: "Remote",
      reposted_status: null,
      application_volume_indicator: null,
    },
    company: {
      company_name: "Test Company",
      company_industry: "Technology",
      company_description: "A test company",
      company_market_position: null,
      company_location_city: null,
      company_location_country: null,
      office_location_details: null,
    },
    location: {
      city: "San Francisco",
      state_or_region: "CA",
      country: "USA",
      onsite_required: false,
    },
    responsibilities: {
      core_responsibilities: ["Develop features"],
      technical_responsibilities: ["Write code"],
      collaboration_teams: ["Product team"],
      architecture_responsibilities: null,
      performance_and_quality_expectations: null,
    },
    requirements: {
      required_experience_years: 3,
      primary_technologies: ["JavaScript", "TypeScript"],
      programming_languages: ["JavaScript"],
      frameworks_libraries: ["React", "Node.js"],
      api_knowledge: ["REST"],
      version_control_tools: ["Git"],
      ux_ui_knowledge: null,
      soft_skills: ["Communication"],
      language_requirements: ["English"],
    },
    nice_to_have: {
      ci_cd_experience: null,
      testing_experience: ["Jest"],
      cloud_platforms: ["AWS"],
      domain_interest: null,
    },
    tech_stack: {
      frontend_stack: ["React"],
      backend_stack: ["Node.js"],
      database: ["PostgreSQL"],
      cloud_stack: ["AWS"],
      devops_tools: ["Docker"],
    },
    benefits: {
      compensation_type: "Salary + Equity",
      work_environment: "Hybrid office with flexible hours",
      career_growth_opportunities: true,
      flexibility: ["Remote work", "Flexible hours"],
      office_perks: ["Health insurance", "Retirement plans"],
      team_culture: ["Collaborative", "Innovative"],
      events_and_travel: ["Team events", "Conference attendance"],
    },
    application: {
      application_url: "https://example.com/apply",
      contact_email: "hr@example.com",
      application_deadline: null,
    },
    contact: {
      recruiter_name: "Mock Recruiter",
      recruiter_role: "HR Manager",
      contact_email: "hr@example.com",
      contact_phone: null,
      contact_whatsapp_available: false,
    },
    raw_description: "Mock job description",
  } as JobDetails);
}

/**
 * Mock API key storage functions
 * Uses environment variables from TEST_CONFIG
 */
export const mockGetApiKey = vi.fn(
  (provider: string): Promise<string | null> => {
    const key = getTestApiKey(provider as any);
    return Promise.resolve(key || "mock-api-key");
  },
);
export const mockSetApiKey = vi.fn().mockResolvedValue(undefined);
export const mockDeleteApiKey = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/keyStorage", () => ({
  getApiKey: mockGetApiKey,
  setApiKey: mockSetApiKey,
  deleteApiKey: mockDeleteApiKey,
}));
