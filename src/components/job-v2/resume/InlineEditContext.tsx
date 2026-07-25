"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  Award,
  Certification,
  ContactInfo,
  Education,
  Experience,
  Language,
  Project,
  Publication,
  ResumeJSON,
  Skill,
  Volunteer,
} from "@/types/resume";

/**
 * Resume sections whose entries support add / delete / reorder in the V2
 * inline editor. These map 1:1 to array fields on `ResumeJSON`.
 */
export type ListSectionId =
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "publications"
  | "volunteer"
  | "awards";

/**
 * InlineEditContext — bridges the shared resume templates to the V2 WYSIWYG
 * editor. Templates read this context to decide whether to render plain text
 * (V1 preview / PDF / off-screen measurement) or click-to-edit fields.
 *
 * When no provider is present, `useInlineEdit()` returns `editable: false`
 * with no-op handlers, so the templates remain pure read-only renderers in
 * every non-editing context.
 */
export interface InlineEditContextValue {
  editable: boolean;
  updateHeader: (patch: Partial<ContactInfo>) => void;
  updateSummary: (value: string) => void;
  updateExperience: (index: number, patch: Partial<Experience>) => void;
  updateEducation: (index: number, patch: Partial<Education>) => void;
  updateProject: (index: number, patch: Partial<Project>) => void;
  updateProjectTechnologies: (index: number, technologies: string[]) => void;
  updateCertification: (index: number, patch: Partial<Certification>) => void;
  updatePublication: (index: number, patch: Partial<Publication>) => void;
  updateVolunteer: (index: number, patch: Partial<Volunteer>) => void;
  updateAward: (index: number, patch: Partial<Award>) => void;
  updateSkills: (skills: Skill[]) => void;
  updateExperienceAchievements: (
    expIndex: number,
    achievements: string[]
  ) => void;
  updateLanguage: (index: number, patch: Partial<Language>) => void;
  addLanguage: () => void;
  removeLanguage: (index: number) => void;
  /** Append a new empty entry to a list section. */
  addItem: (section: ListSectionId) => void;
  /** Remove the entry at `index` from a list section. */
  removeItem: (section: ListSectionId, index: number) => void;
  /** Reorder an entry within a list section. */
  moveItem: (section: ListSectionId, from: number, to: number) => void;
}

const noop = () => {};

const NON_EDITABLE: InlineEditContextValue = {
  editable: false,
  updateHeader: noop,
  updateSummary: noop,
  updateExperience: noop,
  updateEducation: noop,
  updateProject: noop,
  updateProjectTechnologies: noop,
  updateCertification: noop,
  updatePublication: noop,
  updateVolunteer: noop,
  updateAward: noop,
  updateSkills: noop,
  updateExperienceAchievements: noop,
  updateLanguage: noop,
  addLanguage: noop,
  removeLanguage: noop,
  addItem: noop,
  removeItem: noop,
  moveItem: noop,
};

/** Factories for a blank entry per list section. */
const EMPTY_ITEM: {
  experience: () => Experience;
  education: () => Education;
  projects: () => Project;
  certifications: () => Certification;
  publications: () => Publication;
  volunteer: () => Volunteer;
  awards: () => Award;
} = {
  experience: () => ({
    company: "",
    role: "",
    startDate: "",
    endDate: null,
    description: "",
    achievements: [],
  }),
  education: () => ({
    institution: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: null,
    gpa: null,
  }),
  projects: () => ({
    name: "",
    description: "",
    technologies: [],
    url: null,
    startDate: null,
    endDate: null,
  }),
  certifications: () => ({ name: "", issuer: "", date: "", url: null }),
  publications: () => ({
    title: "",
    authors: [],
    venue: "",
    date: "",
    url: null,
    doi: null,
  }),
  volunteer: () => ({
    organization: "",
    role: "",
    startDate: "",
    endDate: null,
    description: "",
  }),
  awards: () => ({ title: "", issuer: "", date: "", description: null }),
};

const SECTION_NOUN: Record<ListSectionId, string> = {
  experience: "experience entry",
  education: "education entry",
  projects: "project",
  certifications: "certification",
  publications: "publication",
  volunteer: "volunteer entry",
  awards: "award",
};

const InlineEditContext = createContext<InlineEditContextValue | null>(null);

type UpdateResume = (updates: Partial<ResumeJSON>, note?: string) => void;

interface InlineEditProviderProps {
  resume: ResumeJSON;
  updateResume: UpdateResume;
  children: ReactNode;
}

export function InlineEditProvider({
  resume,
  updateResume,
  children,
}: InlineEditProviderProps) {
  const value = useMemo<InlineEditContextValue>(() => {
    const replaceAt = <T,>(list: T[], index: number, next: T): T[] =>
      list.map((item, i) => (i === index ? next : item));

    return {
      editable: true,
      updateHeader: (patch) =>
        updateResume(
          { header: { ...resume.header, ...patch } },
          "Edited header"
        ),
      updateSummary: (value) =>
        updateResume({ summary: value }, "Edited summary"),
      updateExperience: (index, patch) =>
        updateResume(
          {
            experience: replaceAt(resume.experience, index, {
              ...resume.experience[index],
              ...patch,
            }),
          },
          "Edited experience"
        ),
      updateEducation: (index, patch) =>
        updateResume(
          {
            education: replaceAt(resume.education, index, {
              ...resume.education[index],
              ...patch,
            }),
          },
          "Edited education"
        ),
      updateProject: (index, patch) =>
        updateResume(
          {
            projects: replaceAt(resume.projects, index, {
              ...resume.projects[index],
              ...patch,
            }),
          },
          "Edited project"
        ),
      updateProjectTechnologies: (index, technologies) =>
        updateResume(
          {
            projects: replaceAt(resume.projects, index, {
              ...resume.projects[index],
              technologies,
            }),
          },
          "Edited technologies"
        ),
      updateCertification: (index, patch) =>
        updateResume(
          {
            certifications: replaceAt(resume.certifications, index, {
              ...resume.certifications[index],
              ...patch,
            }),
          },
          "Edited certification"
        ),
      updatePublication: (index, patch) =>
        updateResume(
          {
            publications: replaceAt(resume.publications ?? [], index, {
              ...(resume.publications ?? [])[index],
              ...patch,
            }),
          },
          "Edited publication"
        ),
      updateVolunteer: (index, patch) =>
        updateResume(
          {
            volunteer: replaceAt(resume.volunteer ?? [], index, {
              ...(resume.volunteer ?? [])[index],
              ...patch,
            }),
          },
          "Edited volunteer entry"
        ),
      updateAward: (index, patch) =>
        updateResume(
          {
            awards: replaceAt(resume.awards ?? [], index, {
              ...(resume.awards ?? [])[index],
              ...patch,
            }),
          },
          "Edited award"
        ),
      updateSkills: (skills) => updateResume({ skills }, "Edited skills"),
      updateExperienceAchievements: (expIndex, achievements) => {
        const exp = resume.experience[expIndex];
        if (!exp) return;
        updateResume(
          {
            experience: replaceAt(resume.experience, expIndex, {
              ...exp,
              achievements,
            }),
          },
          "Edited achievements"
        );
      },
      updateLanguage: (index, patch) =>
        updateResume(
          {
            languages: replaceAt(resume.languages ?? [], index, {
              ...(resume.languages ?? [])[index],
              ...patch,
            }),
          },
          "Edited language"
        ),
      addLanguage: () =>
        updateResume(
          {
            languages: [
              ...(resume.languages ?? []),
              { name: "", proficiency: "" },
            ],
          },
          "Added language"
        ),
      removeLanguage: (index) =>
        updateResume(
          { languages: (resume.languages ?? []).filter((_, i) => i !== index) },
          "Removed language"
        ),
      addItem: (section) =>
        updateResume(
          { [section]: [...(resume[section] ?? []), EMPTY_ITEM[section]()] },
          `Added ${SECTION_NOUN[section]}`
        ),
      removeItem: (section, index) =>
        updateResume(
          {
            [section]: (resume[section] ?? []).filter((_, i) => i !== index),
          },
          `Removed ${SECTION_NOUN[section]}`
        ),
      moveItem: (section, from, to) => {
        const list = resume[section] ?? [];
        if (
          from === to ||
          from < 0 ||
          to < 0 ||
          from >= list.length ||
          to >= list.length
        )
          return;
        const next = [...list];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        updateResume({ [section]: next }, `Reordered ${SECTION_NOUN[section]}`);
      },
    };
  }, [resume, updateResume]);

  return (
    <InlineEditContext.Provider value={value}>
      {children}
    </InlineEditContext.Provider>
  );
}

export function useInlineEdit(): InlineEditContextValue {
  return useContext(InlineEditContext) ?? NON_EDITABLE;
}
