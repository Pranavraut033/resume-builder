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

  it("returns undefined for a clearly non-EU job", () => {
    expect(
      resolveRegionGuidance(buildJob({ country: "United States" }))
    ).toBeUndefined();
    expect(resolveRegionGuidance(buildJob({ country: "UK" }))).toBeUndefined();
    expect(
      resolveRegionGuidance(buildJob({ country: "India" }))
    ).toBeUndefined();
  });

  it("returns German-specific guidance for a job located in Germany", () => {
    const guidance = resolveRegionGuidance(buildJob({ country: "Germany" }));
    expect(guidance).toBeDefined();
    expect(guidance).toContain("CEFR");
    expect(guidance).toContain("Blue Card");
  });

  it("defaults to German guidance when no country is stated", () => {
    expect(
      resolveRegionGuidance(buildJob({ country: null, companyCountry: null }))
    ).toBeDefined();
  });

  it("falls back to the company country when job.location.country is unset", () => {
    expect(
      resolveRegionGuidance(
        buildJob({ country: null, companyCountry: "United States" })
      )
    ).toBeUndefined();
    expect(
      resolveRegionGuidance(buildJob({ country: null, companyCountry: "DE" }))
    ).toBeDefined();
  });
});
