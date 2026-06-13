"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  Certification,
  ContactInfo,
  Education,
  Experience,
  Project,
  ResumeJSON,
} from "@/types/resume";

/**
 * Resume sections whose entries support add / delete / reorder in the V2
 * inline editor. These map 1:1 to array fields on `ResumeJSON`.
 */
export type ListSectionId =
  | "experience"
  | "education"
  | "projects"
  | "certifications";

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
  updateExperienceAchievement: (
    expIndex: number,
    achievementIndex: number,
    value: string
  ) => void;
  updateEducation: (index: number, patch: Partial<Education>) => void;
  updateProject: (index: number, patch: Partial<Project>) => void;
  updateProjectTechnologies: (index: number, technologies: string[]) => void;
  updateCertification: (index: number, patch: Partial<Certification>) => void;
  updateSkill: (index: number, value: string) => void;
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
  updateExperienceAchievement: noop,
  updateEducation: noop,
  updateProject: noop,
  updateProjectTechnologies: noop,
  updateCertification: noop,
  updateSkill: noop,
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
};

const SECTION_NOUN: Record<ListSectionId, string> = {
  experience: "experience entry",
  education: "education entry",
  projects: "project",
  certifications: "certification",
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
      updateExperienceAchievement: (expIndex, achievementIndex, value) => {
        const exp = resume.experience[expIndex];
        if (!exp) return;
        const achievements = replaceAt(
          exp.achievements,
          achievementIndex,
          value
        );
        updateResume(
          {
            experience: replaceAt(resume.experience, expIndex, {
              ...exp,
              achievements,
            }),
          },
          "Edited achievement"
        );
      },
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
      updateSkill: (index, value) =>
        updateResume(
          { skills: replaceAt(resume.skills, index, value) },
          "Edited skill"
        ),
      addItem: (section) =>
        updateResume(
          { [section]: [...resume[section], EMPTY_ITEM[section]()] },
          `Added ${SECTION_NOUN[section]}`
        ),
      removeItem: (section, index) =>
        updateResume(
          { [section]: resume[section].filter((_, i) => i !== index) },
          `Removed ${SECTION_NOUN[section]}`
        ),
      moveItem: (section, from, to) => {
        const list = resume[section];
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
