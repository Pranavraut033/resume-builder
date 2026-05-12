import { ResumeJSON, JobDetailsJSON } from "@/types/resume";

/**
 * Sample base profile for testing
 */
export const sampleBaseProfile: ResumeJSON = {
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
    {
      company: "Startup Inc",
      role: "Software Engineer",
      startDate: "2018-06",
      endDate: "2019-12",
      description:
        "Built RESTful APIs using Node.js and implemented CI/CD pipelines",
      achievements: [
        "Collaborated with product team on feature development",
        "Reduced deployment time by 60%",
      ],
    },
  ],
  projects: [
    {
      name: "Open Source Library",
      description: "TypeScript library for data validation",
      technologies: ["TypeScript", "Jest", "npm"],
      url: "github.com/johndoe/library",
    },
  ],
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "AWS",
    "Docker",
    "Git",
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
};

/**
 * Sample job details for testing
 */
export const sampleJobDetails: JobDetailsJSON = {
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
};

/**
 * Sample tailored resume for testing
 */
export const sampleTailoredResume: ResumeJSON = {
  ...sampleBaseProfile,
  summary:
    "Experienced Full Stack Developer with 5+ years building scalable web applications using React and Node.js.",
  experience: [
    {
      ...sampleBaseProfile.experience[0],
      description:
        "Led development of microservices architecture using Node.js and React",
      achievements: [
        "Mentored junior developers in TypeScript best practices",
        "Improved system performance by 40% through optimization",
      ],
    },
    ...sampleBaseProfile.experience.slice(1),
  ],
  projects: [
    {
      name: "Open Source Library",
      description: "TypeScript library for data validation",
      technologies: ["TypeScript", "Jest", "npm"],
      url: "github.com/johndoe/library",
      startDate: "2022-01",
      endDate: "2023-06",
    },
  ],
  education: [
    {
      institution: "University of California",
      degree: "Bachelor of Science",
      field: "Computer Science",
      startDate: "2014",
      endDate: "2018",
      gpa: "3.8",
    },
  ],
  certifications: [
    {
      name: "AWS Certified Developer",
      issuer: "Amazon Web Services",
      date: "2021",
      url: "https://aws.amazon.com/certification",
    },
  ],
  publications: null,
  languages: null,
  volunteer: null,
  awards: null,
};
