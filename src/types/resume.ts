// Types for resume data structure

import { z } from "zod";

import { colorsFromCSV, colorsToCSV } from "@/lib/colorUtils";

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

export const ResumeParsingSchema = z.object({
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
});

export type ResumeJSON = z.infer<typeof ResumeParsingSchema>;

export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type Publication = z.infer<typeof PublicationSchema>;
export type Language = z.infer<typeof LanguageSchema>;
export type Volunteer = z.infer<typeof VolunteerSchema>;
export type Award = z.infer<typeof AwardSchema>;

// Schema for resume generation (same structure as parsing, used for structured output)
export const ResumeGenerationSchema = z.object({
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
});

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

/**
 * Adapted from Resumify (https://github.com/Afif718/Resumify)
 * Copyright (c) 2025 M. H. A. Afif
 * Licensed under MIT License
 */
export type TemplateType =
  | "tech-sidebar"
  | "business-professional"
  | "modern-minimal"
  | "elegant-timeline"
  | "creative-modern"
  | "bjet-professional";

export type PageFormat = "letter" | "a4";
export type FontSize = "small" | "medium" | "large";

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
}

export interface ThemeCustomization {
  template: TemplateType;
  pageFormat: PageFormat;
  fontSize: FontSize;
  fontFamily: string;
  colors: ThemeColors;
}

export const DEFAULT_COLORS: ThemeColors = {
  primary: "#3b82f6",
  secondary: "#64748b",
  accent: "#8b5cf6",
  text: "#1f2937",
  background: "#ffffff",
};

export const DEFAULT_CUSTOMIZATION: ThemeCustomization = {
  template: "modern-minimal",
  pageFormat: "letter",
  fontSize: "medium",
  fontFamily: "Inter",
  colors: DEFAULT_COLORS,
};

export const AVAILABLE_TEMPLATES: Array<{
  id: TemplateType;
  name: string;
  description: string;
  fontFamily: string;
  features: string[];
  bestFor: string;
}> = [
  {
    id: "tech-sidebar",
    name: "Tech Sidebar",
    description: "Perfect for developers and engineers with sidebar layout",
    fontFamily: "Inter",
    features: [
      "Two-column layout",
      "Tech-focused design",
      "Profile photo support",
    ],
    bestFor: "Software developers, engineers, technical roles",
  },
  {
    id: "business-professional",
    name: "Business Professional",
    description: "Clean and formal design for corporate roles",
    fontFamily: "Georgia",
    features: ["Single column", "Professional typography", "Minimal design"],
    bestFor: "Corporate positions, management roles, traditional industries",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Balanced design for creative and technical roles",
    fontFamily: "Poppins",
    features: ["Two-column layout", "Clean typography", "Modern aesthetics"],
    bestFor: "Creative professionals, designers, modern companies",
  },
  {
    id: "elegant-timeline",
    name: "Elegant Timeline",
    description: "Timeline-based layout emphasizing career progression",
    fontFamily: "Lora",
    features: ["Timeline visualization", "Elegant typography", "Career focus"],
    bestFor: "Experienced professionals, career changers",
  },
  {
    id: "creative-modern",
    name: "Creative Modern",
    description: "Bold and creative design for standout applications",
    fontFamily: "Montserrat",
    features: ["Creative layout", "Bold colors", "Visual hierarchy"],
    bestFor: "Creative roles, startups, design-focused companies",
  },
  {
    id: "bjet-professional",
    name: "BJet Professional",
    description: "Executive-level professional template",
    fontFamily: "Playfair Display",
    features: ["Executive style", "Premium look", "Professional layout"],
    bestFor: "Senior positions, executive roles, premium applications",
  },
];

export const AVAILABLE_FONTS = [
  "Inter",
  "Georgia",
  "Poppins",
  "Lora",
  "Montserrat",
  "Playfair Display",
  "Roboto",
  "Open Sans",
  "Arial",
  "Times New Roman",
  "Helvetica",
  "Verdana",
  "Trebuchet MS",
  "Garamond",
  "Courier New",
  "Source Sans Pro",
  "Merriweather",
  "Raleway",
  "Ubuntu",
  "Nunito",
];

// Cover Letter Types - Use same templates as Resume for consistency
export type CoverLetterTemplate = TemplateType;

export interface CoverLetterCustomization {
  template: CoverLetterTemplate;
  fontSize: FontSize;
  fontFamily: string;
  colors: ThemeColors;
  lineHeight?: "tight" | "normal" | "relaxed";
}

export const DEFAULT_COVER_LETTER_CUSTOMIZATION: CoverLetterCustomization = {
  template: "modern-minimal",
  fontSize: "medium",
  fontFamily: "Inter",
  colors: DEFAULT_COLORS,
  lineHeight: "normal",
};

export interface CoverLetterMetadata {
  provider: string;
  model: string;
  customPrompt?: string;
  generatedAt: string;
  version: number;
}

const VALID_TEMPLATE_IDS = new Set(
  AVAILABLE_TEMPLATES.map((template) => template.id)
);
const VALID_FONT_FAMILIES = new Set(AVAILABLE_FONTS);
const VALID_PAGE_FORMATS: PageFormat[] = ["letter", "a4"];
const VALID_FONT_SIZES: FontSize[] = ["small", "medium", "large"];
const REQUIRED_COLOR_KEYS: Array<keyof ThemeColors> = [
  "primary",
  "secondary",
  "accent",
  "text",
  "background",
];
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

type CustomizationTarget = {
  template?: string;
  fontSize?: string;
  pageFormat?: string;
  fontFamily?: string;
  colors?: string;
};

function validateColors(colors: ThemeColors) {
  const missingKeys = REQUIRED_COLOR_KEYS.filter((key) => !colors[key]);
  if (missingKeys.length > 0) {
    throw new Error(`Missing color values for: ${missingKeys.join(", ")}`);
  }

  const invalidKeys = REQUIRED_COLOR_KEYS.filter((key) => {
    const value = colors[key];
    return typeof value !== "string" || !HEX_COLOR_REGEX.test(value);
  });

  if (invalidKeys.length > 0) {
    throw new Error(
      `Invalid color format for: ${invalidKeys.join(", ")}. Expected hex values like #3b82f6.`
    );
  }
}

export function validateCustomization(
  customization?: Partial<ThemeCustomization>
) {
  if (!customization) return;

  const { template, fontSize, pageFormat, fontFamily, colors } = customization;

  if (template && !VALID_TEMPLATE_IDS.has(template)) {
    throw new Error("Invalid template selected.");
  }

  if (fontSize && !VALID_FONT_SIZES.includes(fontSize)) {
    throw new Error("Invalid font size selected.");
  }

  if (pageFormat && !VALID_PAGE_FORMATS.includes(pageFormat)) {
    throw new Error("Invalid page format selected.");
  }

  if (fontFamily && !VALID_FONT_FAMILIES.has(fontFamily)) {
    throw new Error("Invalid font family selected.");
  }

  if (colors) {
    validateColors(colors);
  }
}

export function applyCustomization(
  customization: Partial<ThemeCustomization> | undefined,
  data: CustomizationTarget
) {
  validateCustomization(customization);

  if (!customization) return;

  const { template, fontSize, pageFormat, fontFamily, colors } = customization;

  if (template) data.template = template;
  if (fontSize) data.fontSize = fontSize;
  if (pageFormat) data.pageFormat = pageFormat;
  if (fontFamily) data.fontFamily = fontFamily;
  if (colors) {
    data.colors = colorsToCSV(colors);
  }
}

export function extractCustomization(
  source?: CustomizationTarget
): ThemeCustomization {
  const customization = {
    ...DEFAULT_CUSTOMIZATION,
    ...source,
    colors: source?.colors
      ? colorsFromCSV(source.colors)
      : DEFAULT_CUSTOMIZATION.colors,
  };

  return {
    template: customization.template as TemplateType,
    pageFormat: customization.pageFormat as PageFormat,
    fontSize: customization.fontSize as FontSize,
    fontFamily: customization.fontFamily,
    colors: customization.colors,
  };
}
