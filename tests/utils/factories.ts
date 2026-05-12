/**
 * Test Data Factories
 *
 * Factory functions for creating test data with sensible defaults.
 * Makes tests more readable and maintainable.
 */

import { PrismaClient } from "@prisma/client";

import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

// ============================================================================
// Profile Factories
// ============================================================================

export interface CreateProfileInput {
  name?: string;
  email?: string;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
  summary?: string | null;
  skills?: string[];
  experience?: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate?: string | null;
    description: string;
    achievements: string[];
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string | null;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string | null;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
}

export function createProfileInput(
  overrides: CreateProfileInput = {}
): CreateProfileInput {
  return {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1-234-567-8900",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/johndoe",
    github: "github.com/johndoe",
    website: "johndoe.dev",
    summary:
      "Experienced software engineer with 5+ years building scalable web applications.",
    skills: ["JavaScript", "TypeScript", "React", "Node.js"],
    experience: [
      {
        company: "Tech Corp",
        role: "Senior Software Engineer",
        startDate: "2020-01",
        endDate: "Present",
        description: "Led development of microservices architecture",
        achievements: [
          "Mentored junior developers",
          "Improved performance by 40%",
        ],
      },
    ],
    projects: [
      {
        name: "Open Source Library",
        description: "TypeScript library for data validation",
        technologies: ["TypeScript", "Jest"],
        url: "github.com/johndoe/library",
      },
    ],
    education: [
      {
        institution: "University of California",
        degree: "Bachelor of Science",
        field: "Computer Science",
        startDate: "2014",
        endDate: "2018",
      },
    ],
    certifications: [
      {
        name: "AWS Certified Developer",
        issuer: "Amazon Web Services",
        date: "2021",
      },
    ],
    ...overrides,
  };
}

export async function createProfile(
  prisma: PrismaClient,
  input: CreateProfileInput = {}
): Promise<{
  id: number;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
  summary: string | null;
  skillsJson: string;
  experienceJson: string;
  projectsJson: string;
  educationJson: string;
  certificationsJson: string;
  createdAt: string;
  updatedAt: string;
}> {
  const data = createProfileInput(input);
  const now = new Date().toISOString();

  return prisma.profile.create({
    data: {
      name: data.name!,
      email: data.email!,
      phone: data.phone ?? null,
      location: data.location ?? null,
      linkedin: data.linkedin ?? null,
      github: data.github ?? null,
      website: data.website ?? null,
      summary: data.summary ?? null,
      skillsJson: JSON.stringify(data.skills ?? []),
      experienceJson: JSON.stringify(data.experience ?? []),
      projectsJson: JSON.stringify(data.projects ?? []),
      educationJson: JSON.stringify(data.education ?? []),
      certificationsJson: JSON.stringify(data.certifications ?? []),
      createdAt: now,
      updatedAt: now,
    },
  });
}

// ============================================================================
// Company Factories
// ============================================================================

export interface CreateCompanyInput {
  name?: string;
  industry?: string | null;
  description?: string | null;
  marketPosition?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  officeLocationDetails?: string | null;
}

export function createCompanyInput(
  overrides: CreateCompanyInput = {}
): CreateCompanyInput {
  return {
    name: "Acme Corporation",
    industry: "Technology",
    description: "Leading tech company in SaaS solutions",
    marketPosition: "Series B Startup",
    locationCity: "San Francisco",
    locationCountry: "USA",
    officeLocationDetails: null,
    ...overrides,
  };
}

export async function createCompany(
  prisma: PrismaClient,
  input: CreateCompanyInput = {}
): Promise<{
  id: number;
  name: string;
  industry: string | null;
  description: string | null;
  marketPosition: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  officeLocationDetails: string | null;
}> {
  const data = createCompanyInput(input);

  return prisma.company.create({
    data: {
      name: data.name!,
      industry: data.industry,
      description: data.description,
      marketPosition: data.marketPosition,
      locationCity: data.locationCity,
      locationCountry: data.locationCountry,
      officeLocationDetails: data.officeLocationDetails,
    },
  });
}

// ============================================================================
// Contact Factories
// ============================================================================

export interface CreateContactInput {
  recruiterName?: string | null;
  recruiterRole?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactWhatsappAvailable?: boolean | null;
}

export function createContactInput(
  overrides: CreateContactInput = {}
): CreateContactInput {
  return {
    recruiterName: "Jane Smith",
    recruiterRole: "Technical Recruiter",
    contactEmail: "careers@acme.com",
    contactPhone: null,
    contactWhatsappAvailable: false,
    ...overrides,
  };
}

export async function createContact(
  prisma: PrismaClient,
  input: CreateContactInput = {}
): Promise<{
  id: number;
  recruiterName: string | null;
  recruiterRole: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsappAvailable: boolean | null;
}> {
  const data = createContactInput(input);

  return prisma.contact.create({
    data: {
      recruiterName: data.recruiterName,
      recruiterRole: data.recruiterRole,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      contactWhatsappAvailable: data.contactWhatsappAvailable,
    },
  });
}

// ============================================================================
// Job Factories
// ============================================================================

export interface CreateJobInput {
  companyId?: number;
  contactId?: number | null;
  role?: string;
  description?: string;
  status?: string;
  jobDetailsJson?: string | null;
  url?: string | null;
  createdAt?: string;
}

export function createJobInput(overrides: CreateJobInput = {}): CreateJobInput {
  return {
    companyId: undefined,
    contactId: null,
    role: "Full Stack Developer",
    description: "Full Stack Developer position at Acme Corporation...",
    status: "Draft",
    jobDetailsJson: JSON.stringify(createJobDetails()),
    url: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export async function createJob(
  prisma: PrismaClient,
  input: CreateJobInput = {}
): Promise<{
  id: number;
  companyId: number | null;
  contactId: number | null;
  role: string;
  description: string;
  status: string;
  jobDetailsJson: string | null;
  url: string | null;
  createdAt: string;
}> {
  const data = createJobInput(input);

  return prisma.job.create({
    data: {
      companyId: data.companyId,
      contactId: data.contactId,
      role: data.role!,
      description: data.description!,
      status: data.status!,
      jobDetailsJson: data.jobDetailsJson,
      url: data.url,
      createdAt: data.createdAt!,
    },
  });
}

// ============================================================================
// Resume Factories
// ============================================================================

export interface CreateResumeInput {
  jobId?: number;
  contentJson?: ResumeJSON;
  template?: string;
  pageFormat?: string;
  fontSize?: string;
  fontFamily?: string;
  colors?: string;
  lastEdited?: string;
}

export function createResumeInput(
  overrides: CreateResumeInput = {}
): CreateResumeInput {
  return {
    jobId: 1,
    contentJson: createResumeJSON(),
    template: "modern-minimal",
    pageFormat: "letter",
    fontSize: "medium",
    fontFamily: "Inter",
    colors: "#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff",
    lastEdited: new Date().toISOString(),
    ...overrides,
  };
}

export async function createResume(
  prisma: PrismaClient,
  input: CreateResumeInput = {}
): Promise<{
  id: number;
  jobId: number;
  contentJson: string;
  template: string;
  pageFormat: string;
  fontSize: string;
  fontFamily: string;
  colors: string;
  lastEdited: string;
}> {
  const data = createResumeInput(input);

  return prisma.resume.create({
    data: {
      jobId: data.jobId!,
      contentJson: JSON.stringify(data.contentJson),
      template: data.template!,
      pageFormat: data.pageFormat!,
      fontSize: data.fontSize!,
      fontFamily: data.fontFamily!,
      colors: data.colors!,
      lastEdited: data.lastEdited!,
    },
  });
}

// ============================================================================
// Cover Letter Factories
// ============================================================================

export interface CreateCoverLetterInput {
  jobId?: number;
  contentText?: string;
  template?: string;
  fontSize?: string;
  fontFamily?: string;
  lineHeight?: string;
  colors?: string;
  provider?: string | null;
  model?: string | null;
  customPrompt?: string | null;
  generatedAt?: string | null;
  version?: number;
  pageFormat?: string;
  lastEdited?: string;
}

export function createCoverLetterInput(
  overrides: CreateCoverLetterInput = {}
): CreateCoverLetterInput {
  return {
    jobId: 1,
    contentText:
      "Dear Hiring Manager,\n\nI am writing to express my interest in the Full Stack Developer position at Acme Corporation...",
    template: "professional-block",
    fontSize: "medium",
    fontFamily: "Inter",
    lineHeight: "normal",
    colors: "#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff",
    provider: null,
    model: null,
    customPrompt: null,
    generatedAt: null,
    version: 1,
    pageFormat: "a4",
    lastEdited: new Date().toISOString(),
    ...overrides,
  };
}

export async function createCoverLetter(
  prisma: PrismaClient,
  input: CreateCoverLetterInput = {}
): Promise<{
  id: number;
  jobId: number;
  contentText: string;
  template: string;
  fontSize: string;
  fontFamily: string;
  lineHeight: string;
  colors: string;
  provider: string | null;
  model: string | null;
  customPrompt: string | null;
  generatedAt: string | null;
  version: number;
  pageFormat: string;
  lastEdited: string;
}> {
  const data = createCoverLetterInput(input);

  return prisma.coverLetter.create({
    data: {
      jobId: data.jobId!,
      contentText: data.contentText!,
      template: data.template!,
      fontSize: data.fontSize!,
      fontFamily: data.fontFamily!,
      lineHeight: data.lineHeight!,
      colors: data.colors!,
      provider: data.provider,
      model: data.model,
      customPrompt: data.customPrompt,
      generatedAt: data.generatedAt,
      version: data.version!,
      pageFormat: data.pageFormat!,
      lastEdited: data.lastEdited!,
    },
  });
}

// ============================================================================
// Token Usage Factories
// ============================================================================

export interface CreateTokenUsageInput {
  model?: string;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  purpose?: string;
  requestId?: string | null;
  createdAt?: string;
}

export function createTokenUsageInput(
  overrides: CreateTokenUsageInput = {}
): CreateTokenUsageInput {
  return {
    model: "gpt-4o-mini",
    provider: "openai",
    inputTokens: 100,
    outputTokens: 50,
    purpose: "RESUME_GENERATION",
    requestId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export async function createTokenUsage(
  prisma: PrismaClient,
  input: CreateTokenUsageInput = {}
): Promise<{
  id: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  purpose: string;
  requestId: string | null;
  createdAt: string;
}> {
  const data = createTokenUsageInput(input);

  return prisma.tokenUsage.create({
    data: {
      model: data.model!,
      provider: data.provider!,
      inputTokens: data.inputTokens!,
      outputTokens: data.outputTokens!,
      purpose: data.purpose!,
      requestId: data.requestId,
      createdAt: data.createdAt!,
    },
  });
}

// ============================================================================
// Complex Data Factories
// ============================================================================

export function createJobDetails(
  overrides: Partial<JobDetailsJSON> = {}
): JobDetailsJSON {
  return {
    job: {
      job_title: "Full Stack Developer",
      job_role_category: "Engineering",
      seniority_level: "Senior",
      employment_type: "Full-time",
      workplace_type: "Hybrid",
      reposted_status: null,
      application_volume_indicator: null,
    },
    company: {
      company_name: "Acme Corporation",
      company_industry: "Technology",
      company_description: "Leading tech company in SaaS solutions",
      company_market_position: "Series B Startup",
      company_location_city: "San Francisco",
      company_location_country: "USA",
      office_location_details: null,
    },
    location: {
      city: "San Francisco",
      state_or_region: "California",
      country: "USA",
      onsite_required: true,
    },
    responsibilities: {
      core_responsibilities: [
        "Design and implement new features",
        "Collaborate with cross-functional teams",
      ],
      technical_responsibilities: [
        "Write clean, maintainable code",
        "Review code from peers",
      ],
      collaboration_teams: ["Product", "Design", "DevOps"],
      architecture_responsibilities: ["Design system architecture"],
      performance_and_quality_expectations: ["Maintain 99.9% uptime"],
    },
    requirements: {
      required_experience_years: 5,
      primary_technologies: ["JavaScript", "TypeScript", "React", "Node.js"],
      programming_languages: ["JavaScript", "TypeScript", "Python"],
      frameworks_libraries: ["React", "Express", "Next.js"],
      api_knowledge: ["REST", "GraphQL"],
      version_control_tools: ["Git", "GitHub"],
      ux_ui_knowledge: ["Responsive Design"],
      soft_skills: ["Communication", "Teamwork", "Problem-solving"],
      language_requirements: ["English"],
    },
    nice_to_have: {
      ci_cd_experience: ["GitHub Actions", "Jenkins"],
      testing_experience: ["Jest", "Cypress"],
      cloud_platforms: ["AWS", "GCP"],
      domain_interest: ["FinTech"],
    },
    tech_stack: {
      frontend_stack: ["React", "TypeScript", "TailwindCSS"],
      backend_stack: ["Node.js", "Express", "Prisma"],
      database: ["PostgreSQL", "Redis"],
      cloud_stack: ["AWS", "S3", "Lambda"],
      devops_tools: ["Docker", "Kubernetes", "Terraform"],
    },
    benefits: {
      compensation_type: "Salary + Equity",
      work_environment: "Hybrid office with flexible hours",
      career_growth_opportunities: true,
      flexibility: ["Remote work", "Flexible hours"],
      office_perks: ["Gym membership", "Free meals", "Health insurance"],
      team_culture: ["Collaborative", "Innovation-driven"],
      events_and_travel: ["Annual company retreat", "Conference attendance"],
    },
    contact: {
      recruiter_name: "Jane Smith",
      recruiter_role: "Technical Recruiter",
      contact_email: "careers@acme.com",
      contact_phone: null,
      contact_whatsapp_available: false,
    },
    raw_description: "Full Stack Developer position at Acme Corporation...",
    ...overrides,
  };
}

export function createResumeJSON(
  overrides: Partial<ResumeJSON> = {}
): ResumeJSON {
  return {
    header: {
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1-234-567-8900",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/johndoe",
      github: "github.com/johndoe",
      website: "johndoe.dev",
    },
    summary:
      "Experienced software engineer with 5+ years building scalable web applications.",
    experience: [
      {
        company: "Tech Corp",
        role: "Senior Software Engineer",
        startDate: "2020-01",
        endDate: "Present",
        description:
          "Led development of microservices architecture using Node.js and React",
        achievements: [
          "Mentored junior developers in TypeScript best practices",
          "Improved system performance by 40% through optimization",
        ],
      },
    ],
    projects: [
      {
        name: "Open Source Library",
        description: "TypeScript library for data validation",
        technologies: ["TypeScript", "Jest", "npm"],
        url: "github.com/johndoe/library",
        startDate: null,
        endDate: null,
      },
    ],
    skills: [
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
      "AWS",
    ],
    education: [
      {
        institution: "University of California",
        degree: "Bachelor of Science",
        field: "Computer Science",
        startDate: "2014",
        endDate: "2018",
        gpa: null,
      },
    ],
    certifications: [
      {
        name: "AWS Certified Developer",
        issuer: "Amazon Web Services",
        date: "2021",
        url: null,
      },
    ],
    publications: [],
    languages: [],
    volunteer: [],
    awards: [],
    ...overrides,
  };
}

// ============================================================================
// Complete Scenario Factories
// ============================================================================

/**
 * Create a complete job scenario with company, contact, job, resume, and cover letter
 */
export async function createCompleteJobScenario(
  prisma: PrismaClient,
  overrides: {
    company?: CreateCompanyInput;
    contact?: CreateContactInput;
    job?: CreateJobInput;
    resume?: CreateResumeInput;
    coverLetter?: CreateCoverLetterInput;
  } = {}
) {
  const company = await createCompany(prisma, overrides.company);
  const contact = await createContact(prisma, overrides.contact);

  const job = await createJob(prisma, {
    ...overrides.job,
    companyId: company.id,
    contactId: contact.id,
  });

  const resume = await createResume(prisma, {
    ...overrides.resume,
    jobId: job.id,
  });

  const coverLetter = await createCoverLetter(prisma, {
    ...overrides.coverLetter,
    jobId: job.id,
  });

  return {
    company,
    contact,
    job,
    resume,
    coverLetter,
  };
}
