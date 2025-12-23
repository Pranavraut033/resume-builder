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
export type JobDetails = z.infer<typeof JobDetailsSchema>;

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  description: string;
  achievements: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface ResumeJSON {
  header: ContactInfo;
  summary: string;
  experience: Experience[];
  projects: Project[];
  skills: string[];
  education: Education[];
  certifications: Certification[];
}

// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

export type TemplateType =
  | "tech-sidebar"
  | "business-professional"
  | "modern-minimal"
  | "elegant-timeline"
  | "creative-modern"
  | "bjet-professional";

export type PageFormat = "letter" | "a4";
export type FontSize = "small" | "medium" | "large";

export interface ResumeColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
}

export interface ResumeCustomization {
  template: TemplateType;
  pageFormat: PageFormat;
  fontSize: FontSize;
  fontFamily: string;
  colors: ResumeColors;
}

export const DEFAULT_COLORS: ResumeColors = {
  primary: "#3b82f6",
  secondary: "#64748b",
  accent: "#8b5cf6",
  text: "#1f2937",
  background: "#ffffff",
};

export const DEFAULT_CUSTOMIZATION: ResumeCustomization = {
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
];
