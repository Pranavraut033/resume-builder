import { FieldConfig } from "@/components/profile/ListSection";
import {
  Award,
  Certification,
  Education,
  Experience,
  Language,
  Project,
  Publication,
  ResumeJSON,
  Volunteer,
} from "@/types/resume";

export interface SectionConfig<T> {
  key: keyof ResumeJSON;
  title: string;
  addLabel: string;
  emptyText: string;
  itemNoun: string;
  blank: () => T;
  fields: FieldConfig<T>[];
}

const experienceConfig: SectionConfig<Experience> = {
  key: "experience",
  title: "Work Experience",
  addLabel: "+ Add Experience",
  emptyText: 'No experience added yet. Click "Add Experience" to get started.',
  itemNoun: "Experience",
  blank: () => ({
    company: "",
    role: "",
    startDate: "",
    endDate: "",
    description: "",
    achievements: [],
  }),
  fields: [
    { type: "text", key: "company", label: "Company", width: "half" },
    { type: "text", key: "role", label: "Role", width: "half" },
    {
      type: "dateRange",
      label: "Dates",
      startKey: "startDate",
      endKey: "endDate",
    },
    {
      type: "textarea",
      key: "description",
      label: "Description",
      rows: 3,
    },
    {
      type: "list",
      key: "achievements",
      label: "Achievements",
      separator: "\n",
      rows: 3,
      helpText: "One achievement per line",
    },
  ],
};

const projectsConfig: SectionConfig<Project> = {
  key: "projects",
  title: "Projects",
  addLabel: "+ Add Project",
  emptyText: 'No projects added yet. Click "Add Project" to get started.',
  itemNoun: "Project",
  blank: () => ({
    name: "",
    description: "",
    technologies: [],
    url: null,
    startDate: null,
    endDate: null,
  }),
  fields: [
    { type: "text", key: "name", label: "Project Name" },
    {
      type: "textarea",
      key: "description",
      label: "Description",
      rows: 3,
    },
    {
      type: "list",
      key: "technologies",
      label: "Technologies",
      separator: ", ",
      helpText: "Comma-separated list",
    },
    {
      type: "text",
      key: "url",
      label: "URL",
      placeholder: "https://github.com/...",
      width: "half",
    },
    {
      type: "dateRange",
      label: "Dates",
      startKey: "startDate",
      endKey: "endDate",
      width: "half",
    },
  ],
};

const educationConfig: SectionConfig<Education> = {
  key: "education",
  title: "Education",
  addLabel: "+ Add Education",
  emptyText: 'No education added yet. Click "Add Education" to get started.',
  itemNoun: "Education",
  blank: () => ({
    institution: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: null,
    gpa: null,
  }),
  fields: [
    { type: "text", key: "institution", label: "Institution" },
    {
      type: "text",
      key: "degree",
      label: "Degree",
      placeholder: "Bachelor of Science",
      width: "half",
    },
    {
      type: "text",
      key: "field",
      label: "Field of Study",
      placeholder: "Computer Science",
      width: "half",
    },
    {
      type: "dateRange",
      label: "Dates",
      startKey: "startDate",
      endKey: "endDate",
      width: "half",
    },
    {
      type: "text",
      key: "gpa",
      label: "GPA",
      placeholder: "3.8/4.0",
      width: "half",
    },
  ],
};

const certificationsConfig: SectionConfig<Certification> = {
  key: "certifications",
  title: "Certifications",
  addLabel: "+ Add Certification",
  emptyText: "No certifications added yet.",
  itemNoun: "Certification",
  blank: () => ({ name: "", issuer: "", date: "", url: null }),
  fields: [
    { type: "text", key: "name", label: "Certification Name" },
    { type: "text", key: "issuer", label: "Issuer", width: "half" },
    {
      type: "text",
      key: "date",
      label: "Date",
      placeholder: "Jan 2023",
      width: "half",
    },
    {
      type: "text",
      key: "url",
      label: "URL",
      placeholder: "https://...",
    },
  ],
};

const publicationsConfig: SectionConfig<Publication> = {
  key: "publications",
  title: "Publications (Optional)",
  addLabel: "+ Add Publication",
  emptyText: "No publications added yet.",
  itemNoun: "Publication",
  blank: () => ({
    title: "",
    authors: [],
    venue: "",
    date: "",
    url: null,
    doi: null,
  }),
  fields: [
    { type: "text", key: "title", label: "Title" },
    {
      type: "list",
      key: "authors",
      label: "Authors",
      separator: ", ",
      helpText: "Comma-separated list",
    },
    {
      type: "text",
      key: "venue",
      label: "Venue",
      placeholder: "Journal/Conference name",
      width: "half",
    },
    {
      type: "text",
      key: "date",
      label: "Date",
      placeholder: "2023",
      width: "half",
    },
    { type: "text", key: "url", label: "URL", width: "half" },
    {
      type: "text",
      key: "doi",
      label: "DOI",
      placeholder: "10.1234/example",
      width: "half",
    },
  ],
};

const languagesConfig: SectionConfig<Language> = {
  key: "languages",
  title: "Languages (Optional)",
  addLabel: "+ Add Language",
  emptyText: "No languages added yet.",
  itemNoun: "Language",
  blank: () => ({ name: "", proficiency: "" }),
  fields: [
    {
      type: "text",
      key: "name",
      label: "Language",
      placeholder: "English",
      width: "half",
    },
    {
      type: "text",
      key: "proficiency",
      label: "Proficiency",
      placeholder: "Native, Fluent, Professional, etc.",
      width: "half",
    },
  ],
};

const volunteerConfig: SectionConfig<Volunteer> = {
  key: "volunteer",
  title: "Volunteer Work (Optional)",
  addLabel: "+ Add Volunteer Work",
  emptyText: "No volunteer work added yet.",
  itemNoun: "Volunteer",
  blank: () => ({
    organization: "",
    role: "",
    startDate: "",
    endDate: null,
    description: "",
  }),
  fields: [
    { type: "text", key: "organization", label: "Organization" },
    { type: "text", key: "role", label: "Role" },
    { type: "text", key: "startDate", label: "Start Date", width: "half" },
    { type: "text", key: "endDate", label: "End Date", width: "half" },
    {
      type: "textarea",
      key: "description",
      label: "Description",
      rows: 3,
    },
  ],
};

const awardsConfig: SectionConfig<Award> = {
  key: "awards",
  title: "Awards & Honors (Optional)",
  addLabel: "+ Add Award",
  emptyText: "No awards added yet.",
  itemNoun: "Award",
  blank: () => ({ title: "", issuer: "", date: "", description: null }),
  fields: [
    { type: "text", key: "title", label: "Award Title" },
    { type: "text", key: "issuer", label: "Issuer", width: "half" },
    { type: "text", key: "date", label: "Date", width: "half" },
    {
      type: "textarea",
      key: "description",
      label: "Description",
      rows: 2,
    },
  ],
};

// Type-erased: each config is internally consistent (T matches its own
// blank()/fields), but the 8 entities don't share a common shape, so the
// array as a whole is typed `SectionConfig<any>[]` — the profile page
// iterates it generically via <ListSection> without needing per-entity types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SECTION_CONFIGS: SectionConfig<any>[] = [
  experienceConfig,
  projectsConfig,
  educationConfig,
  certificationsConfig,
  publicationsConfig,
  languagesConfig,
  volunteerConfig,
  awardsConfig,
];
