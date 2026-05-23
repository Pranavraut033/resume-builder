"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

import { FieldAIHelper } from "@/components/FieldAIHelper";
import {
  TextField,
  TextAreaField,
  DateRangeField,
  BulletListEditor,
  TagsEditor,
} from "@/components/form";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";
import { toStableJsonString } from "@/lib";
import {
  extractSummaryContext,
  extractAchievementsContext,
} from "@/lib/contextExtractor";
import {
  ContactInfo,
  Experience,
  Education,
  Project,
  Certification,
} from "@/types/resume";

import { SectionId } from "./ResumeSectionNav";

interface SectionEditorProps {
  section: SectionId;
}

// Sortable wrapper for experience/education/project/cert items
function SortableItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="group relative">
        <div
          {...attributes}
          {...listeners}
          className="absolute top-1/2 left-0 -translate-x-5 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          <Icon name="gripVertical" className="h-4 w-4" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function SectionEditor({ section }: SectionEditorProps) {
  const { resume, updateResumeState: updateResume, job } = useJobPageContext();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Personal Info ─────────────────────────────────────────────────
  if (section === "personal") {
    const h = resume.header;
    const update = (key: keyof ContactInfo, value: string) => {
      updateResume({ header: { ...h, [key]: value } });
    };
    if (!h) return null;

    return (
      <SectionShell
        title="Personal Information"
        description="Your contact details and basic information."
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <TextField
              label="Full Name"
              value={h.name || ""}
              onChange={(v) => update("name", v)}
              required
            />
          </div>
          <TextField
            label="Headline"
            value={h.headline || ""}
            onChange={(v) => update("headline", v)}
          />
          <TextField
            label="Email"
            value={h.email || ""}
            onChange={(v) => update("email", v)}
            required
          />
          <TextField
            label="Phone"
            value={h.phone || ""}
            onChange={(v) => update("phone", v)}
          />
          <TextField
            label="Location"
            value={h.location || ""}
            onChange={(v) => update("location", v)}
          />
          <TextField
            label="LinkedIn"
            value={h.linkedin || ""}
            onChange={(v) => update("linkedin", v)}
          />
          <TextField
            label="GitHub"
            value={h.github || ""}
            onChange={(v) => update("github", v)}
          />
          <TextField
            label="Website / Portfolio"
            value={h.website || ""}
            onChange={(v) => update("website", v)}
          />
        </div>
      </SectionShell>
    );
  }

  // ── Summary ───────────────────────────────────────────────────────
  if (section === "summary") {
    return (
      <SectionShell
        title="Professional Summary"
        description="A brief overview of your professional background and goals."
      >
        <div className="space-y-3">
          <TextAreaField
            label="Summary"
            value={resume.summary || ""}
            onChange={(v) => updateResume({ summary: v as string })}
            placeholder="Write a compelling summary of your professional background..."
            rows={6}
          />
          <div className="flex items-center gap-2">
            <span
              className="text-xs"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              AI Generate:
            </span>
            <FieldAIHelper
              field="summary"
              context={extractSummaryContext(resume, job?.details || undefined)}
              onGenerate={(content) => updateResume({ summary: content })}
              onError={(err) => console.error("AI error:", err)}
            />
          </div>
        </div>
      </SectionShell>
    );
  }

  // ── Experience ────────────────────────────────────────────────────
  if (section === "experience") {
    return (
      <ExperienceEditor
        key={toStableJsonString(resume.experience)}
        sensors={sensors}
      />
    );
  }

  // ── Education ─────────────────────────────────────────────────────
  if (section === "education") {
    return (
      <EducationEditor
        key={toStableJsonString(resume.education)}
        sensors={sensors}
      />
    );
  }

  // ── Skills ────────────────────────────────────────────────────────
  if (section === "skills") {
    return (
      <SectionShell
        title="Skills"
        description="Add your technical skills, tools, and competencies."
      >
        <TagsEditor
          label=""
          tags={resume.skills || []}
          onTagsChange={(tags) => updateResume({ skills: tags as string[] })}
          placeholder="Add a skill and press Enter"
          helpText="Add technologies, languages, and competencies"
        />
      </SectionShell>
    );
  }

  // ── Projects ──────────────────────────────────────────────────────
  if (section === "projects") {
    return (
      <ProjectsEditor
        key={toStableJsonString(resume.projects)}
        sensors={sensors}
      />
    );
  }

  // ── Certifications ────────────────────────────────────────────────
  if (section === "certifications") {
    return (
      <CertificationsEditor key={toStableJsonString(resume.certifications)} />
    );
  }

  return null;
}

// ─── Section Shell ───────────────────────────────────────────────────────────

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--color-agent-on-surface)" }}
        >
          {title}
        </h2>
        {description && (
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Experience Editor ───────────────────────────────────────────────────────

type SensorsType = ReturnType<typeof useSensors>;

function ExperienceEditor({ sensors }: { sensors: SensorsType }) {
  const { resume, updateResumeState: updateResume, job } = useJobPageContext();

  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    resume.experience.length > 0 ? 0 : null
  );
  const [items, setItems] = useState(
    resume.experience.map((_, i) => String(i))
  );

  if (!job || !resume) return null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = items.indexOf(active.id as string);
      const newIdx = items.indexOf(over.id as string);
      const newOrder = arrayMove(items, oldIdx, newIdx);
      setItems(newOrder);
      const reordered = newOrder.map((i) => resume.experience[parseInt(i)]);
      updateResume({ experience: reordered });
    }
  }

  function addExperience() {
    const newExp: Experience = {
      company: "",
      role: "",
      startDate: "",
      endDate: "",
      description: "",
      achievements: [],
    };
    const updated = [...resume.experience, newExp];
    updateResume({ experience: updated });
    setExpandedIndex(updated.length - 1);
  }

  function updateExp(index: number, updates: Partial<Experience>) {
    const updated = [...resume.experience];
    updated[index] = { ...updated[index], ...updates };
    updateResume({ experience: updated });
  }

  function removeExp(index: number) {
    const updated = resume.experience.filter((_, i) => i !== index);
    updateResume({ experience: updated });
    if (expandedIndex === index)
      setExpandedIndex(updated.length > 0 ? 0 : null);
  }

  return (
    <SectionShell
      title="Work Experience"
      description="Detail your professional journey with AI-optimized descriptions."
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {resume.experience.map((exp, index) => (
              <SortableItem key={index} id={String(index)}>
                <ExperienceItem
                  exp={exp}
                  index={index}
                  isExpanded={expandedIndex === index}
                  onToggle={() =>
                    setExpandedIndex(expandedIndex === index ? null : index)
                  }
                  onChange={(updates) => updateExp(index, updates)}
                  onRemove={() => removeExp(index)}
                />
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button variant="ghost" onClick={addExperience}>
        <Icon name="plus" className="h-4 w-4" />
        Add Experience
      </Button>
    </SectionShell>
  );
}

function ExperienceItem({
  exp,
  index,
  isExpanded,
  onToggle,
  onChange,
  onRemove,
}: {
  exp: Experience;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updates: Partial<Experience>) => void;
  onRemove: () => void;
}) {
  const { resume, job } = useJobPageContext();

  if (!resume || !job) return null;

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: "var(--color-agent-outline-variant)",
        background: "var(--color-agent-surface-lowest)",
      }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <Icon
          name="ChevronDown"
          className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          color="var(--color-agent-on-surface-variant)"
        />
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            {exp.role || `Experience ${index + 1}`}
          </p>
          <p
            className="truncate text-xs"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            {exp.company || "Company"}
            {exp.startDate &&
              ` • ${exp.startDate} – ${exp.endDate || "Present"}`}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-agent-error-container rounded p-1 opacity-0 transition-all group-hover:opacity-100"
          style={{ color: "var(--color-agent-error, #dc2626)" }}
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
        </button>
      </button>

      {isExpanded && (
        <div
          className="space-y-4 border-t px-4 py-4"
          style={{ borderColor: "var(--color-agent-outline-variant)" }}
        >
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Job Title"
              value={exp.role || ""}
              onChange={(v) => onChange({ role: v })}
              required
            />
            <TextField
              label="Company"
              value={exp.company || ""}
              onChange={(v) => onChange({ company: v })}
              required
            />
          </div>
          <DateRangeField
            label="Employment Period"
            startDate={exp.startDate || ""}
            endDate={exp.endDate || ""}
            onStartDateChange={(d) => onChange({ startDate: d })}
            onEndDateChange={(d) => onChange({ endDate: d })}
          />
          <TextAreaField
            label="Description"
            value={exp.description || ""}
            onChange={(v) => onChange({ description: v as string })}
            placeholder="Describe your role and responsibilities..."
            rows={3}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--color-agent-on-surface)" }}
              >
                Key Achievements
              </label>
              <FieldAIHelper
                field="achievements"
                context={extractAchievementsContext(
                  resume.experience,
                  index,
                  job?.details || undefined
                )}
                onGenerate={(content) => {
                  const lines = (content as string)
                    .split("\n")
                    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
                    .filter(Boolean);
                  onChange({ achievements: lines });
                }}
                onError={(err) => console.error("AI error:", err)}
              />
            </div>
            <BulletListEditor
              label=""
              items={exp.achievements || []}
              onItemsChange={(items) => onChange({ achievements: items })}
              placeholder="Add an achievement..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Education Editor ─────────────────────────────────────────────────────────

function EducationEditor({ sensors }: { sensors: SensorsType }) {
  const { resume, job, updateResumeState: updateResume } = useJobPageContext();

  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    resume.education.length > 0 ? 0 : null
  );
  const [items, setItems] = useState(resume.education.map((_, i) => String(i)));

  if (!resume || !job) return null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = items.indexOf(active.id as string);
      const newIdx = items.indexOf(over.id as string);
      const newOrder = arrayMove(items, oldIdx, newIdx);
      setItems(newOrder);

      updateResume({
        education: newOrder.map((i) => resume.education[parseInt(i)]),
      });
    }
  }

  function addEducation() {
    const newEdu: Education = {
      institution: "",
      degree: "",
      field: "",
      startDate: "",
      endDate: "",
      gpa: "",
    };
    const updated = [...resume.education, newEdu];
    updateResume({ education: updated });
    setExpandedIndex(updated.length - 1);
  }

  return (
    <SectionShell
      title="Education"
      description="Your academic background and qualifications."
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {resume.education.map((edu, index) => (
              <SortableItem key={index} id={String(index)}>
                <div
                  className="overflow-hidden rounded-xl border"
                  style={{
                    borderColor: "var(--color-agent-outline-variant)",
                    background: "var(--color-agent-surface-lowest)",
                  }}
                >
                  <button
                    onClick={() =>
                      setExpandedIndex(expandedIndex === index ? null : index)
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <Icon
                      name="ChevronDown"
                      className={`h-4 w-4 shrink-0 transition-transform ${expandedIndex === index ? "rotate-180" : ""}`}
                      color="var(--color-agent-on-surface-variant)"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: "var(--color-agent-on-surface)" }}
                      >
                        {edu.degree
                          ? `${edu.degree}${edu.field ? ` in ${edu.field}` : ""}`
                          : `Education ${index + 1}`}
                      </p>
                      <p
                        className="truncate text-xs"
                        style={{
                          color: "var(--color-agent-on-surface-variant)",
                        }}
                      >
                        {edu.institution || "Institution"}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateResume({
                          education: resume.education.filter(
                            (_, i) => i !== index
                          ),
                        });
                        if (expandedIndex === index) setExpandedIndex(null);
                      }}
                      className="hover:bg-agent-error-container rounded p-1 transition-colors"
                      style={{ color: "var(--color-agent-error, #dc2626)" }}
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </button>

                  {expandedIndex === index && (
                    <div
                      className="space-y-4 border-t px-4 py-4"
                      style={{
                        borderColor: "var(--color-agent-outline-variant)",
                      }}
                    >
                      <TextField
                        label="Institution"
                        value={edu.institution || ""}
                        onChange={(v) => {
                          const updated = [...resume.education];
                          updated[index] = {
                            ...updated[index],
                            institution: v,
                          };
                          updateResume({ education: updated });
                        }}
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <TextField
                          label="Degree"
                          value={edu.degree || ""}
                          onChange={(v) => {
                            const updated = [...resume.education];
                            updated[index] = { ...updated[index], degree: v };
                            updateResume({ education: updated });
                          }}
                        />
                        <TextField
                          label="Field of Study"
                          value={edu.field || ""}
                          onChange={(v) => {
                            const updated = [...resume.education];
                            updated[index] = { ...updated[index], field: v };
                            updateResume({ education: updated });
                          }}
                        />
                      </div>
                      <DateRangeField
                        label="Period"
                        startDate={edu.startDate || ""}
                        endDate={edu.endDate || ""}
                        onStartDateChange={(d) => {
                          const updated = [...resume.education];
                          updated[index] = { ...updated[index], startDate: d };
                          updateResume({ education: updated });
                        }}
                        onEndDateChange={(d) => {
                          const updated = [...resume.education];
                          updated[index] = { ...updated[index], endDate: d };
                          updateResume({ education: updated });
                        }}
                      />
                      <TextField
                        label="GPA (optional)"
                        value={edu.gpa || ""}
                        onChange={(v) => {
                          const updated = [...resume.education];
                          updated[index] = { ...updated[index], gpa: v };
                          updateResume({ education: updated });
                        }}
                      />
                    </div>
                  )}
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button variant="ghost" onClick={addEducation}>
        <Icon name="plus" className="h-4 w-4" />
        Add Education
      </Button>
    </SectionShell>
  );
}

// ─── Projects Editor ──────────────────────────────────────────────────────────

function ProjectsEditor({ sensors }: { sensors: SensorsType }) {
  const { resume, updateResumeState: updateResume } = useJobPageContext();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    resume.projects.length > 0 ? 0 : null
  );
  const [items, setItems] = useState(resume.projects.map((_, i) => String(i)));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const newOrder = arrayMove(
        items,
        items.indexOf(active.id as string),
        items.indexOf(over.id as string)
      );
      setItems(newOrder);
      updateResume({
        projects: newOrder.map((i) => resume.projects[parseInt(i)]),
      });
    }
  }

  return (
    <SectionShell
      title="Projects"
      description="Showcase your personal and professional projects."
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {resume.projects.map((project, index) => (
              <SortableItem key={index} id={String(index)}>
                <div
                  className="overflow-hidden rounded-xl border"
                  style={{
                    borderColor: "var(--color-agent-outline-variant)",
                    background: "var(--color-agent-surface-lowest)",
                  }}
                >
                  <button
                    onClick={() =>
                      setExpandedIndex(expandedIndex === index ? null : index)
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <Icon
                      name="ChevronDown"
                      className={`h-4 w-4 shrink-0 transition-transform ${expandedIndex === index ? "rotate-180" : ""}`}
                      color="var(--color-agent-on-surface-variant)"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: "var(--color-agent-on-surface)" }}
                      >
                        {project.name || `Project ${index + 1}`}
                      </p>
                      {project.technologies?.length > 0 && (
                        <p
                          className="truncate text-xs"
                          style={{
                            color: "var(--color-agent-on-surface-variant)",
                          }}
                        >
                          {project.technologies.slice(0, 3).join(", ")}
                          {project.technologies.length > 3 ? "..." : ""}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateResume({
                          projects: resume.projects.filter(
                            (_, i) => i !== index
                          ),
                        });
                        if (expandedIndex === index) setExpandedIndex(null);
                      }}
                      className="hover:bg-agent-error-container rounded p-1 transition-colors"
                      style={{ color: "var(--color-agent-error, #dc2626)" }}
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </button>

                  {expandedIndex === index && (
                    <div
                      className="space-y-4 border-t px-4 py-4"
                      style={{
                        borderColor: "var(--color-agent-outline-variant)",
                      }}
                    >
                      <TextField
                        label="Project Name"
                        value={project.name || ""}
                        onChange={(v) => {
                          const updated = [...resume.projects];
                          updated[index] = { ...updated[index], name: v };
                          updateResume({ ...resume, projects: updated });
                        }}
                        required
                      />
                      <TextAreaField
                        label="Description"
                        value={project.description || ""}
                        onChange={(v) => {
                          const updated = [...resume.projects];
                          updated[index] = {
                            ...updated[index],
                            description: v as string,
                          };
                          updateResume({ ...resume, projects: updated });
                        }}
                        rows={3}
                        placeholder="Describe what you built and your role..."
                      />
                      <TagsEditor
                        label="Technologies"
                        tags={project.technologies || []}
                        onTagsChange={(tags) => {
                          const updated = [...resume.projects];
                          updated[index] = {
                            ...updated[index],
                            technologies: tags as string[],
                          };
                          updateResume({ ...resume, projects: updated });
                        }}
                        placeholder="Add technology and press Enter"
                      />
                      <TextField
                        label="Project URL (optional)"
                        value={project.url || ""}
                        onChange={(v) => {
                          const updated = [...resume.projects];
                          updated[index] = { ...updated[index], url: v };
                          updateResume({ ...resume, projects: updated });
                        }}
                      />
                      <DateRangeField
                        label="Period"
                        startDate={project.startDate || ""}
                        endDate={project.endDate || ""}
                        onStartDateChange={(d) => {
                          const updated = [...resume.projects];
                          updated[index] = { ...updated[index], startDate: d };
                          updateResume({ ...resume, projects: updated });
                        }}
                        onEndDateChange={(d) => {
                          const updated = [...resume.projects];
                          updated[index] = { ...updated[index], endDate: d };
                          updateResume({ ...resume, projects: updated });
                        }}
                      />
                    </div>
                  )}
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        variant="ghost"
        onClick={() => {
          const newProj: Project = {
            name: "",
            description: "",
            technologies: [],
            url: "",
            startDate: "",
            endDate: "",
          };
          const updated = [...resume.projects, newProj];
          updateResume({ projects: updated });
          setExpandedIndex(updated.length - 1);
        }}
      >
        <Icon name="plus" className="h-4 w-4" />
        Add Project
      </Button>
    </SectionShell>
  );
}

// ─── Certifications Editor ─────────────────────────────────────────────────────

function CertificationsEditor() {
  const { resume, updateResumeState: updateResume } = useJobPageContext();
  const certs = resume.certifications || [];

  return (
    <SectionShell
      title="Certifications"
      description="Professional certifications and credentials."
    >
      <div className="space-y-3">
        {certs.map((cert, index) => (
          <div
            key={index}
            className="rounded-xl border p-4"
            style={{
              borderColor: "var(--color-agent-outline-variant)",
              background: "var(--color-agent-surface-lowest)",
            }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-agent-on-surface)" }}
              >
                {cert.name || `Certification ${index + 1}`}
              </p>
              <button
                onClick={() =>
                  updateResume({
                    certifications: certs.filter((_, i) => i !== index),
                  })
                }
                className="hover:bg-agent-error-container shrink-0 rounded p-1 transition-colors"
                style={{ color: "var(--color-agent-error, #dc2626)" }}
              >
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Certificate Name"
                value={cert.name || ""}
                onChange={(v) => {
                  const updated = [...certs];
                  updated[index] = { ...updated[index], name: v };
                  updateResume({ certifications: updated });
                }}
                required
              />
              <TextField
                label="Issuer"
                value={cert.issuer || ""}
                onChange={(v) => {
                  const updated = [...certs];
                  updated[index] = { ...updated[index], issuer: v };
                  updateResume({ certifications: updated });
                }}
              />
              <TextField
                label="Date"
                value={cert.date || ""}
                onChange={(v) => {
                  const updated = [...certs];
                  updated[index] = { ...updated[index], date: v };
                  updateResume({ certifications: updated });
                }}
              />
              <TextField
                label="URL (optional)"
                value={cert.url || ""}
                onChange={(v) => {
                  const updated = [...certs];
                  updated[index] = { ...updated[index], url: v };
                  updateResume({ certifications: updated });
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        onClick={() => {
          const newCert: Certification = {
            name: "",
            issuer: "",
            date: "",
            url: "",
          };
          updateResume({ certifications: [...certs, newCert] });
        }}
      >
        <Icon name="plus" className="h-4 w-4" />
        Add Certification
      </Button>
    </SectionShell>
  );
}
