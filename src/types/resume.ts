// Types for resume data structure

import { z } from "zod";

// Job Identification
const JobIdentificationSchema = z.object({
  job_title: z.string(),
  job_role_category: z.string().nullable(),
  seniority_level: z.string().nullable(),
  employment_type: z.string().nullable(),
  workplace_type: z.string().nullable(),
  reposted_status: z.boolean().nullable(),
  application_volume_indicator: z.string().nullable(),
});

// Company Information
const CompanyInfoSchema = z.object({
  company_name: z.string(),
  company_industry: z.string().nullable(),
  company_description: z.string().nullable(),
  company_market_position: z.string().nullable(),
  company_location_city: z.string().nullable(),
  company_location_country: z.string().nullable(),
  office_location_details: z.string().nullable(),
});

// Job Location
const JobLocationSchema = z.object({
  city: z.string().nullable(),
  state_or_region: z.string().nullable(),
  country: z.string().nullable(),
  onsite_required: z.boolean().nullable(),
});

// Responsibilities
const ResponsibilitiesSchema = z.object({
  core_responsibilities: z.array(z.string()).nullable(),
  technical_responsibilities: z.array(z.string()).nullable(),
  collaboration_teams: z.array(z.string()).nullable(),
  architecture_responsibilities: z.array(z.string()).nullable(),
  performance_and_quality_expectations: z.array(z.string()).nullable(),
});

// Required Skills & Experience
const RequiredSkillsSchema = z.object({
  required_experience_years: z.number().nullable(),
  primary_technologies: z.array(z.string()).nullable(),
  programming_languages: z.array(z.string()).nullable(),
  frameworks_libraries: z.array(z.string()).nullable(),
  api_knowledge: z.array(z.string()).nullable(),
  version_control_tools: z.array(z.string()).nullable(),
  ux_ui_knowledge: z.array(z.string()).nullable(),
  soft_skills: z.array(z.string()).nullable(),
  language_requirements: z.array(z.string()).nullable(),
});

// Nice-to-Have Skills
const NiceToHaveSkillsSchema = z.object({
  ci_cd_experience: z.array(z.string()).nullable(),
  testing_experience: z.array(z.string()).nullable(),
  cloud_platforms: z.array(z.string()).nullable(),
  domain_interest: z.array(z.string()).nullable(),
});

// Tech Stack
const TechStackSchema = z.object({
  frontend_stack: z.array(z.string()).nullable(),
  backend_stack: z.array(z.string()).nullable(),
  database: z.array(z.string()).nullable(),
  cloud_stack: z.array(z.string()).nullable(),
  devops_tools: z.array(z.string()).nullable(),
});

// Benefits & Offerings
const BenefitsSchema = z.object({
  compensation_type: z.string().nullable(),
  work_environment: z.string().nullable(),
  career_growth_opportunities: z.boolean().nullable(),
  flexibility: z.array(z.string()).nullable(),
  office_perks: z.array(z.string()).nullable(),
  team_culture: z.array(z.string()).nullable(),
  events_and_travel: z.array(z.string()).nullable(),
});

// Application & Contact
const ContactSchema = z.object({
  recruiter_name: z.string().nullable(),
  recruiter_role: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_phone: z.string().nullable(),
  contact_whatsapp_available: z.boolean().nullable(),
});

// Complete Job Details Schema
export const JobDetailsSchema = z.object({
  job: JobIdentificationSchema,
  company: CompanyInfoSchema,
  location: JobLocationSchema,
  responsibilities: ResponsibilitiesSchema,
  requirements: RequiredSkillsSchema,
  nice_to_have: NiceToHaveSkillsSchema,
  tech_stack: TechStackSchema,
  benefits: BenefitsSchema,
  contact: ContactSchema,
  raw_description: z.string(),
});

// TypeScript type derived from schema
export type JobDetailsJSON = z.infer<typeof JobDetailsSchema>;
export type Responsibilities = z.infer<typeof ResponsibilitiesSchema>;
export type RequiredSkills = z.infer<typeof RequiredSkillsSchema>;
export type NiceToHaveSkills = z.infer<typeof NiceToHaveSkillsSchema>;
export type TechStack = z.infer<typeof TechStackSchema>;
export type Benefits = z.infer<typeof BenefitsSchema>;
export type JobIdentification = z.infer<typeof JobIdentificationSchema>;
export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;

// Resume Parsing Schema for structured output
export const ContactInfoSchema = z.object({
  name: z.string(),
  headline: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  website: z.string().nullable(),
});

export const ExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  description: z.string(),
  achievements: z.array(z.string()),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  url: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

export const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  gpa: z.string().nullable(),
});

export const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  date: z.string(),
  url: z.string().nullable(),
});

export const PublicationSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  venue: z.string(),
  date: z.string(),
  url: z.string().nullable(),
  doi: z.string().nullable(),
});

export const LanguageSchema = z.object({
  name: z.string(),
  proficiency: z.string(),
});

export const VolunteerSchema = z.object({
  organization: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  description: z.string(),
});

export const AwardSchema = z.object({
  title: z.string(),
  issuer: z.string(),
  date: z.string(),
  description: z.string().nullable(),
});

// Canonical built-in section ids — single source of truth for section
// ordering, replacing the old mismatched V2SectionId (7) / TXT (7) / template
// internal key (11) lists.
export const BUILTIN_SECTION_IDS = [
  "header",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "publications",
  "languages",
  "volunteer",
  "awards",
] as const;

export type BuiltinSectionId = (typeof BUILTIN_SECTION_IDS)[number];

export const BUILTIN_SECTION_LABELS: Record<BuiltinSectionId, string> = {
  header: "Personal Info",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  publications: "Publications",
  languages: "Languages",
  volunteer: "Volunteer",
  awards: "Awards",
};

// ponytail: custom-section content starts at bullets/text only. Add a
// "timeline" (dated entries) shape when a user actually needs one — the enum
// slot is reserved below, the UI/content model isn't built yet.
export const CustomSectionSchema = z.object({
  id: z.string(), // uuid; referenced by sectionLayout.order
  title: z.string(),
  type: z.enum(["bullets", "text", "timeline"]).default("bullets"),
  items: z.array(z.string()).default([]),
});

export type CustomSection = z.infer<typeof CustomSectionSchema>;

// Section order/visibility/custom-section structure. Optional + every field
// defaulted so existing rows (no sectionLayout) parse fine — buildSections()
// falls back to BUILTIN_SECTION_IDS order with nothing hidden/custom.
export const SectionLayoutSchema = z.object({
  order: z.array(z.string()),
  hidden: z.array(z.string()).default([]),
  custom: z.array(CustomSectionSchema).default([]),
});

export type SectionLayout = z.infer<typeof SectionLayoutSchema>;

/**
 * Resolve a resume's effective section layout. Pre-engine rows have no
 * `sectionLayout` — fall back to the canonical built-in order with nothing
 * hidden/custom, so old rows render identically until the user reorders and
 * it gets persisted. Lazy migration: no backfill script needed.
 */
export function getSectionLayout(resume: ResumeJSON): SectionLayout {
  return (
    resume.sectionLayout ?? {
      order: [...BUILTIN_SECTION_IDS],
      hidden: [],
      custom: [],
    }
  );
}

export const ResumeSchema = z.object({
  header: ContactInfoSchema,
  summary: z.string(),
  experience: z.array(ExperienceSchema),
  projects: z.array(ProjectSchema),
  skills: z.array(z.string()),
  education: z.array(EducationSchema),
  certifications: z.array(CertificationSchema),
  publications: z.array(PublicationSchema).nullable(),
  languages: z.array(LanguageSchema).nullable(),
  volunteer: z.array(VolunteerSchema).nullable(),
  awards: z.array(AwardSchema).nullable(),
  sectionLayout: SectionLayoutSchema.optional(),
});

export type ResumeJSON = z.infer<typeof ResumeSchema>;

export type ResumeField = keyof typeof ResumeSchema.shape;

export const RESUME_FIELD_NAMES = Object.keys(
  ResumeSchema.shape
) as ResumeField[];

export function getResumeSchemaForPrompt(): string {
  return JSON.stringify(z.toJSONSchema(ResumeSchema), null, 2);
}
export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type Publication = z.infer<typeof PublicationSchema>;
export type Language = z.infer<typeof LanguageSchema>;
export type Volunteer = z.infer<typeof VolunteerSchema>;
export type Award = z.infer<typeof AwardSchema>;

export const ATSAnalysisSchema = z.object({
  keyword_analysis: z.array(
    z.object({
      keyword: z.string(),
      match_type: z.enum(["exact", "semantic", "missing"]),
      match_status: z.enum(["present", "absent"]),
    })
  ),
  missing_keywords: z.array(z.string()),
  formatting_issues: z.array(
    z.object({
      section: z.string(),
      description: z.string(),
      severity: z.enum(["high", "medium", "low"]),
    })
  ),
  scores: z.object({
    keyword_match_score: z.number().min(0).max(100),
    formatting_score: z.number().min(0).max(100),
    content_quality_score: z.number().min(0).max(100),
    composite_score: z.number().min(0).max(100),
  }),
  improvements: z.array(
    z.object({
      section: z.string(),
      issue: z.string(),
      recommended_fix: z.string(),
      estimated_score_delta: z.number().min(0).max(100),
    })
  ),
  summary: z.string(),
});

export type ATSAnalysisJSON = z.infer<typeof ATSAnalysisSchema>;

export function atsAnalysisToCompactPositional(
  atsAnalysis: ATSAnalysisJSON
): string {
  return `
ATSKeyword_analysis:
${atsAnalysis.keyword_analysis
  .map((ka) => `${ka.keyword}|${ka.match_type}|${ka.match_status}`)
  .join("\n")}
${atsAnalysis.missing_keywords.join("|")}
ATSFormatting_issues:
${atsAnalysis.formatting_issues
  .map((fi) => `${fi.section}|${fi.description}|${fi.severity}`)
  .join("\n")}
ATSscores:
${[atsAnalysis.scores.keyword_match_score, atsAnalysis.scores.formatting_score, atsAnalysis.scores.content_quality_score, atsAnalysis.scores.composite_score].join("|")}
ATSImprovements:
${atsAnalysis.improvements
  .map(
    (imp) =>
      `${imp.section}|${imp.issue}|${imp.recommended_fix}|${imp.estimated_score_delta}`
  )
  .join("\n")}
ATSAnalysisSummary:
${atsAnalysis.summary}`;
}

export function resumeJsonToCompactPositional(resume: ResumeJSON): string {
  return `
  ${[resume.header.name, resume.header.email, resume.header.phone, resume.header.location, resume.header.linkedin, resume.header.github, resume.header.website].filter(Boolean).join("|")}
  ${resume.summary}
  ${resume.experience
    .map(
      (exp) =>
        `${exp.company}|${exp.role}|${exp.startDate}|${exp.endDate || "Present"}|${exp.description}|${exp.achievements.join(";")}`
    )
    .join("\n")}
  ${resume.projects
    .map(
      (proj) =>
        `${proj.name}|${proj.description}|${proj.technologies.join(",")}|${proj.url || ""}|${proj.startDate || ""}|${proj.endDate || ""}`
    )
    .join("\n")}
  ${resume.skills.join(",")}
  ${resume.education
    .map(
      (edu) =>
        `${edu.institution}|${edu.degree}|${edu.field}|${edu.startDate}|${edu.endDate || ""}|${edu.gpa || ""}`
    )
    .join("\n")}
  ${resume.certifications
    .map((cert) => `${cert.name}|${cert.issuer}|${cert.date}|${cert.url || ""}`)
    .join("\n")}
  ${
    resume.publications
      ?.map(
        (pub) =>
          `${pub.title}|${pub.authors.join(",")}|${pub.venue}|${pub.date}|${pub.url || ""}|${pub.doi || ""}`
      )
      .join("\n") || ""
  }
  ${
    resume.languages
      ?.map((lang) => `${lang.name}|${lang.proficiency}`)
      .join("\n") || ""
  }
  ${
    resume.volunteer
      ?.map(
        (vol) =>
          `${vol.organization}|${vol.role}|${vol.startDate}|${vol.endDate || "Present"}|${vol.description}`
      )
      .join("\n") || ""
  }
  ${
    resume.awards
      ?.map(
        (award) =>
          `${award.title}|${award.issuer}|${award.date}|${award.description || ""}`
      )
      .join("\n") || ""
  }
  `;
}

export function jobDetailsToCompactPositional(
  jobDetails: JobDetailsJSON
): string {
  return `
  ${[jobDetails.job.job_title, jobDetails.job.job_role_category, jobDetails.job.seniority_level, jobDetails.job.employment_type, jobDetails.job.workplace_type, jobDetails.job.reposted_status, jobDetails.job.application_volume_indicator].filter(Boolean).join("|")}
  ${[jobDetails.company.company_name, jobDetails.company.company_industry, jobDetails.company.company_description, jobDetails.company.company_market_position, jobDetails.company.company_location_city, jobDetails.company.company_location_country, jobDetails.company.office_location_details].filter(Boolean).join("|")}
  ${[jobDetails.location.city, jobDetails.location.state_or_region, jobDetails.location.country, jobDetails.location.onsite_required].filter(Boolean).join("|")}
  ${[jobDetails.responsibilities.core_responsibilities?.join(";"), jobDetails.responsibilities.technical_responsibilities?.join(";"), jobDetails.responsibilities.collaboration_teams?.join(";"), jobDetails.responsibilities.architecture_responsibilities?.join(";"), jobDetails.responsibilities.performance_and_quality_expectations?.join(";")].filter(Boolean).join("|")}
  ${[jobDetails.requirements.required_experience_years, jobDetails.requirements.primary_technologies?.join(";"), jobDetails.requirements.programming_languages?.join(";"), jobDetails.requirements.frameworks_libraries?.join(";"), jobDetails.requirements.api_knowledge?.join(";"), jobDetails.requirements.version_control_tools?.join(";"), jobDetails.requirements.ux_ui_knowledge?.join(";"), jobDetails.requirements.soft_skills?.join(";"), jobDetails.requirements.language_requirements?.join(";")].filter(Boolean).join("|")}
  ${[jobDetails.nice_to_have.ci_cd_experience?.join(";"), jobDetails.nice_to_have.testing_experience?.join(";"), jobDetails.nice_to_have.cloud_platforms?.join(";"), jobDetails.nice_to_have.domain_interest?.join(";")].filter(Boolean).join("|")}
  ${[jobDetails.tech_stack.frontend_stack?.join(";"), jobDetails.tech_stack.backend_stack?.join(";"), jobDetails.tech_stack.database?.join(";"), jobDetails.tech_stack.cloud_stack?.join(";"), jobDetails.tech_stack.devops_tools?.join(";")].filter(Boolean).join("|")}
  ${[jobDetails.benefits.compensation_type, jobDetails.benefits.work_environment, jobDetails.benefits.career_growth_opportunities, jobDetails.benefits.flexibility?.join(";"), jobDetails.benefits.office_perks?.join(";"), jobDetails.benefits.team_culture?.join(";"), jobDetails.benefits.events_and_travel?.join(";")].filter(Boolean).join("|")}
  ${[jobDetails.contact.recruiter_name, jobDetails.contact.recruiter_role, jobDetails.contact.contact_email, jobDetails.contact.contact_phone, jobDetails.contact.contact_whatsapp_available].filter(Boolean).join("|")}
  ${jobDetails.raw_description}
  `;
}
