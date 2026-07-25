import { describe, expect, it } from "vitest";

import { JobDetailsJSON } from "@/types/resume";

import { resolveRegionGuidance } from "./regionGuidance";

function buildJob(overrides: {
  country?: string | null;
  companyCountry?: string | null;
  rawDescription?: string;
}): JobDetailsJSON {
  return {
    job: {
      job_title: "Software Engineer",
      job_role_category: null,
      seniority_level: null,
      employment_type: null,
      workplace_type: null,
      reposted_status: null,
      application_volume_indicator: null,
    },
    company: {
      company_name: "Acme Corp",
      company_industry: null,
      company_description: null,
      company_market_position: null,
      company_location_city: null,
      company_location_country: overrides.companyCountry ?? null,
      office_location_details: null,
    },
    location: {
      city: null,
      state_or_region: null,
      country: overrides.country ?? null,
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
    raw_description:
      overrides.rawDescription ?? "We are hiring a great engineer.",
  };
}

describe("resolveRegionGuidance", () => {
  it("returns undefined for null/undefined job", () => {
    expect(resolveRegionGuidance(null)).toBeUndefined();
    expect(resolveRegionGuidance(undefined)).toBeUndefined();
  });

  it("returns undefined for a US job", () => {
    const job = buildJob({ country: "United States" });
    expect(resolveRegionGuidance(job)).toBeUndefined();
  });

  it("returns defined German-specific guidance for a job located in Germany", () => {
    const job = buildJob({ country: "Germany" });
    const guidance = resolveRegionGuidance(job);
    expect(guidance).toBeDefined();
    expect(guidance).toContain("CEFR");
    expect(guidance).toContain("Blue Card");
  });

  it("detects a DE country code on location.country", () => {
    const job = buildJob({ country: "DE" });
    expect(resolveRegionGuidance(job)).toBeDefined();
  });

  it("detects an EU-like company location country when job.location.country is unset", () => {
    const job = buildJob({ country: null, companyCountry: "Austria" });
    expect(resolveRegionGuidance(job)).toBeDefined();
  });

  it("detects a German-language signal in the raw job description", () => {
    const job = buildJob({
      country: null,
      companyCountry: null,
      rawDescription:
        "Wir suchen eine erfahrene Softwareentwicklerin (m/w/d) für unser Team in München. Ihre Aufgaben: Entwicklung von Backend-Services.",
    });
    expect(resolveRegionGuidance(job)).toBeDefined();
  });
});
