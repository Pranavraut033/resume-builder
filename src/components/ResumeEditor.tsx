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
import { useState, useEffect } from "react";

import { useResumeEditContext } from "@/contexts/ResumeEditContext";
import { backupToGoogleDrive } from "@/lib/backup";
import {
  extractSummaryContext,
  extractExperienceContext,
  extractAchievementsContext,
} from "@/lib/contextExtractor";
import { useToast } from "@/components/ui/ToastProvider";
import { generateResumePDF } from "@/lib/pdfExport";
import { generateResumeTXT } from "@/lib/txtExport";
import {
  ResumeJSON,
  ContactInfo,
  Experience,
  Education,
  Project,
  Certification,
} from "@/types/resume";

import { FieldAIHelper } from "./FieldAIHelper";
import {
  TextField,
  TextAreaField,
  DateRangeField,
  BulletListEditor,
  TagsEditor,
} from "./form";
import { Button, Modal, Section, SortableSection, Card, Icon } from "./ui";

const defaultResume: ResumeJSON = {
  header: {
    name: "Your Name",
    email: "your.email@example.com",
    phone: "(555) 123-4567",
    location: "City, State",
    linkedin: "linkedin.com/in/yourprofile",
    github: "github.com/yourusername",
    website: "yourwebsite.com",
  },
  summary:
    "A passionate software developer with 5+ years of experience building web applications. Skilled in React, Node.js, and cloud technologies.",
  experience: [
    {
      company: "Tech Company Inc.",
      role: "Senior Software Engineer",
      startDate: "2022-01",
      endDate: "Present",
      description:
        "Led development of scalable web applications serving 100k+ users.",
      achievements: [
        "Improved application performance by 40% through code optimization",
        "Mentored junior developers and established coding standards",
        "Implemented CI/CD pipeline reducing deployment time by 60%",
      ],
    },
  ],
  projects: [
    {
      name: "E-commerce Platform",
      description: "Full-stack e-commerce solution with React and Node.js",
      technologies: ["React", "Node.js", "MongoDB", "Stripe"],
      url: "https://github.com/yourusername/ecommerce",
      startDate: "2023-06",
      endDate: "2023-12",
    },
  ],
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "Python",
    "AWS",
    "Docker",
  ],
  education: [
    {
      institution: "University of Technology",
      degree: "Bachelor of Science",
      field: "Computer Science",
      startDate: "2018-09",
      endDate: "2022-05",
      gpa: "3.8",
    },
  ],
  certifications: [
    {
      name: "AWS Certified Solutions Architect",
      issuer: "Amazon Web Services",
      date: "2023-03",
      url: "https://aws.amazon.com/certification/",
    },
  ],
  publications: null,
  languages: null,
  volunteer: null,
  awards: null,
};

interface ResumeEditorProps {
  jobId: string;
  initialResume?: ResumeJSON;
}

export default function ResumeEditor({
  jobId,
  initialResume,
}: ResumeEditorProps) {
  const [resume, setResume] = useState<ResumeJSON>(
    initialResume || defaultResume
  );
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    "header",
    "summary",
    "experience",
    "projects",
    "skills",
    "education",
    "certifications",
  ]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<unknown>(null);

  // Access resume context for job details and generation
  const { job } = useResumeEditContext();
  const { pushToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update resume when initialResume prop changes
  useEffect(() => {
    if (initialResume) {
      setResume(initialResume);
    }
  }, [initialResume]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function handleExportPDF() {
    if (!resume) return;
    generateResumePDF(resume);
  }

  function handleExportTXT() {
    if (!resume) return;
    generateResumeTXT(resume);
  }

  function handleBackup() {
    if (!resume) return;
    backupToGoogleDrive(JSON.stringify(resume));
    pushToast({
      title: "Backup not available",
      description: "Google Drive backup is optional and not implemented yet.",
      variant: "info",
    });
  }

  function updateResume(updates: Partial<ResumeJSON>) {
    if (!resume) return;
    const newResume = { ...resume, ...updates };
    setResume(newResume);

    // Save to database
    const saveResume = async () => {
      try {
        const { updateResume: saveResumeAction } =
          await import("@/actions/job");
        await saveResumeAction(parseInt(jobId), newResume);
      } catch (error) {
        console.error("Error saving resume:", error);
      }
    };
    saveResume();
  }

  function updateHeader(updates: Partial<ContactInfo>) {
    if (!resume) return;
    const newResume = {
      ...resume,
      header: { ...resume.header, ...updates },
    };
    setResume(newResume);

    // Save to database
    const saveResume = async () => {
      try {
        const { updateResume: saveResumeAction } =
          await import("@/actions/job");
        await saveResumeAction(parseInt(jobId), newResume);
      } catch (error) {
        console.error("Error saving resume:", error);
      }
    };
    saveResume();
  }

  function startEditing(section: string, data?: unknown) {
    setEditingSection(section);
    setEditingData(data || null);
  }

  function cancelEditing() {
    setEditingSection(null);
    setEditingData(null);
  }

  function saveEditing() {
    if (!resume || !editingSection) return;

    switch (editingSection) {
      case "header":
        updateHeader(editingData as Partial<ContactInfo>);
        break;
      case "summary":
        updateResume({ summary: editingData as string });
        break;
      case "experience.add": {
        const newExp = editingData as Experience;
        updateResume({
          experience: [...resume.experience, newExp],
        });
        break;
      }
      case "experience.edit": {
        const expIndex = (editingData as unknown as { index: number }).index;
        const updated = [...resume.experience];
        updated[expIndex] = {
          ...updated[expIndex],
          ...(editingData as Partial<Experience>),
        };
        updateResume({ experience: updated });
        break;
      }
      case "education.add": {
        const newEdu = editingData as Education;
        updateResume({
          education: [...resume.education, newEdu],
        });
        break;
      }
      case "education.edit": {
        const eduIndex = (editingData as unknown as { index: number }).index;
        const updated = [...resume.education];
        updated[eduIndex] = {
          ...updated[eduIndex],
          ...(editingData as Partial<Education>),
        };
        updateResume({ education: updated });
        break;
      }
      case "projects.add": {
        const newProj = editingData as Project;
        updateResume({
          projects: [...resume.projects, newProj],
        });
        break;
      }
      case "projects.edit": {
        const projIndex = (editingData as unknown as { index: number }).index;
        const updated = [...resume.projects];
        updated[projIndex] = {
          ...updated[projIndex],
          ...(editingData as Partial<Project>),
        };
        updateResume({ projects: updated });
        break;
      }
      case "certifications.add": {
        const newCert = editingData as Certification;
        updateResume({
          certifications: [...resume.certifications, newCert],
        });
        break;
      }
      case "certifications.edit": {
        const certIndex = (editingData as unknown as { index: number }).index;
        const updated = [...resume.certifications];
        updated[certIndex] = {
          ...updated[certIndex],
          ...(editingData as Partial<Certification>),
        };
        updateResume({ certifications: updated });
        break;
      }
      case "skills":
        updateResume({ skills: editingData as string[] });
        break;
    }

    setEditingSection(null);
    setEditingData(null);
  }

  if (!resume)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading resume...</p>
        </div>
      </div>
    );

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "header":
        return (
          <Section
            title="Contact Information"
            onEdit={() => startEditing("header", resume.header)}
          >
            <Card>
              <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white">
                {resume.header.name}
              </h1>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                {resume.header.email && <p>📧 {resume.header.email}</p>}
                {resume.header.phone && <p>📱 {resume.header.phone}</p>}
                {resume.header.location && <p>📍 {resume.header.location}</p>}
                {resume.header.linkedin && <p>💼 {resume.header.linkedin}</p>}
                {resume.header.github && <p>💻 {resume.header.github}</p>}
                {resume.header.website && <p>🌐 {resume.header.website}</p>}
              </div>
            </Card>
          </Section>
        );

      case "summary":
        return (
          <Section
            title="Professional Summary"
            onEdit={() => startEditing("summary", resume.summary)}
          >
            <Card>
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                {resume.summary}
              </p>
            </Card>
          </Section>
        );

      case "experience":
        return (
          <Section title="Work Experience">
            <div className="space-y-4">
              {resume.experience.map((exp, index) => (
                <Card key={index}>
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {exp.role}
                      </h3>
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        {exp.company}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {exp.startDate} - {exp.endDate || "Present"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        startEditing(`experience.edit`, { ...exp, index })
                      }
                    >
                      <Icon name="pencil" className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mb-2 text-gray-700 dark:text-gray-300">
                    {exp.description}
                  </p>
                  {exp.achievements.length > 0 && (
                    <ul className="list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      {exp.achievements.map((achievement, i) => (
                        <li key={i}>{achievement}</li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
              <Button
                variant="ghost"
                onClick={() =>
                  startEditing("experience.add", {
                    company: "",
                    role: "",
                    startDate: "",
                    endDate: "",
                    description: "",
                    achievements: [],
                  })
                }
              >
                <Icon name="plus" className="h-4 w-4" />
                Add Experience
              </Button>
            </div>
          </Section>
        );

      case "projects":
        return (
          <Section title="Projects">
            <div className="space-y-4">
              {resume.projects.map((project, index) => (
                <Card key={index}>
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {project.startDate} - {project.endDate}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        startEditing(`projects.edit`, { ...project, index })
                      }
                    >
                      <Icon name="pencil" className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mb-2 text-gray-700 dark:text-gray-300">
                    {project.description}
                  </p>
                  {project.technologies.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {project.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View Project →
                    </a>
                  )}
                </Card>
              ))}
              <Button
                variant="ghost"
                onClick={() =>
                  startEditing("projects.add", {
                    name: "",
                    description: "",
                    technologies: [],
                    url: "",
                    startDate: "",
                    endDate: "",
                  })
                }
              >
                <Icon name="plus" className="h-4 w-4" />
                Add Project
              </Button>
            </div>
          </Section>
        );

      case "skills":
        return (
          <Section
            title="Skills"
            onEdit={() => startEditing("skills", [...resume.skills])}
          >
            <Card>
              <div className="flex flex-wrap gap-2">
                {resume.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Card>
          </Section>
        );

      case "education":
        return (
          <Section title="Education">
            <div className="space-y-4">
              {resume.education.map((edu, index) => (
                <Card key={index}>
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {edu.degree} in {edu.field}
                      </h3>
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        {edu.institution}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {edu.startDate} - {edu.endDate}
                        {edu.gpa && ` • GPA: ${edu.gpa}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        startEditing(`education.edit`, { ...edu, index })
                      }
                    >
                      <Icon name="pencil" className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              <Button
                variant="ghost"
                onClick={() =>
                  startEditing("education.add", {
                    institution: "",
                    degree: "",
                    field: "",
                    startDate: "",
                    endDate: "",
                    gpa: "",
                  })
                }
              >
                <Icon name="plus" className="h-4 w-4" />
                Add Education
              </Button>
            </div>
          </Section>
        );

      case "certifications":
        return (
          <Section title="Certifications">
            <div className="space-y-4">
              {resume.certifications.map((cert, index) => (
                <Card key={index}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {cert.name}
                      </h3>
                      <p className="text-blue-600 dark:text-blue-400">
                        {cert.issuer}
                      </p>
                      {cert.date && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {cert.date}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {cert.url && (
                        <a
                          href={cert.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm whitespace-nowrap text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          startEditing(`certifications.edit`, {
                            ...cert,
                            index,
                          })
                        }
                      >
                        <Icon name="pencil" className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              <Button
                variant="ghost"
                onClick={() =>
                  startEditing("certifications.add", {
                    name: "",
                    issuer: "",
                    date: "",
                    url: "",
                  })
                }
              >
                <Icon name="plus" className="h-4 w-4" />
                Add Certification
              </Button>
            </div>
          </Section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Resume Editor
          </h1>
          <div className="flex gap-2">
            <Button
              onClick={handleExportPDF}
              variant="secondary"
              icon={<Icon name="download" />}
            >
              Export PDF
            </Button>
            <Button
              onClick={handleExportTXT}
              variant="secondary"
              icon={<Icon name="fileText" />}
            >
              Export TXT
            </Button>
            <Button
              onClick={handleBackup}
              variant="secondary"
              icon={<Icon name="cloud" />}
            >
              Backup
            </Button>
          </div>
        </div>
      </div>

      {/* Resume Preview */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="min-h-[29.7cm] rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sectionOrder}
              strategy={verticalListSortingStrategy}
            >
              {sectionOrder.map((sectionId) => (
                <SortableSection key={sectionId} id={sectionId}>
                  {renderSection(sectionId)}
                </SortableSection>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editingSection !== null}
        onClose={cancelEditing}
        onSave={saveEditing}
        title={`Edit ${editingSection?.charAt(0).toUpperCase()}${editingSection?.slice(1)}`}
      >
        {editingSection === "header" && editingData !== null && (
          <div className="space-y-4">
            <TextField
              label="Full Name"
              value={(editingData as ContactInfo).name || ""}
              onChange={(value) =>
                setEditingData({ ...(editingData as ContactInfo), name: value })
              }
              required
            />
            <TextField
              label="Email"
              value={(editingData as ContactInfo).email || ""}
              onChange={(value) =>
                setEditingData({
                  ...(editingData as ContactInfo),
                  email: value,
                })
              }
              required
            />
            <TextField
              label="Phone"
              value={(editingData as ContactInfo).phone || ""}
              onChange={(value) =>
                setEditingData({
                  ...(editingData as ContactInfo),
                  phone: value,
                })
              }
            />
            <TextField
              label="Location"
              value={(editingData as ContactInfo).location || ""}
              onChange={(value) =>
                setEditingData({
                  ...(editingData as ContactInfo),
                  location: value,
                })
              }
            />
            <TextField
              label="LinkedIn"
              value={(editingData as ContactInfo).linkedin || ""}
              onChange={(value) =>
                setEditingData({
                  ...(editingData as ContactInfo),
                  linkedin: value,
                })
              }
            />
            <TextField
              label="GitHub"
              value={(editingData as ContactInfo).github || ""}
              onChange={(value) =>
                setEditingData({
                  ...(editingData as ContactInfo),
                  github: value,
                })
              }
            />
            <TextField
              label="Website"
              value={(editingData as ContactInfo).website || ""}
              onChange={(value) =>
                setEditingData({
                  ...(editingData as ContactInfo),
                  website: value,
                })
              }
            />
          </div>
        )}

        {editingSection === "summary" && (
          <div className="space-y-3">
            <TextAreaField
              label="Professional Summary"
              value={(editingData as string) || ""}
              onChange={setEditingData}
              placeholder="Write a compelling summary of your professional background..."
              rows={6}
            />
            {resume && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  AI Generate:
                </span>
                <FieldAIHelper
                  field="summary"
                  context={extractSummaryContext(
                    resume,
                    job?.details || undefined
                  )}
                  onGenerate={(content) => setEditingData(content)}
                  onError={(error) =>
                    console.error("AI generation error:", error)
                  }
                />
              </div>
            )}
          </div>
        )}

        {editingSection === "skills" && Array.isArray(editingData) && (
          <TagsEditor
            label="Skills"
            tags={(editingData as string[]) || []}
            onTagsChange={setEditingData}
            placeholder="Add a skill and press Enter"
            helpText="Add technologies, languages, and competencies"
          />
        )}

        {(editingSection === "experience.add" ||
          editingSection === "experience.edit") &&
          editingData !== null && (
            <div className="space-y-4">
              <TextField
                label="Company"
                value={(editingData as Experience).company || ""}
                onChange={(value) =>
                  setEditingData({
                    ...(editingData as Experience),
                    company: value,
                  })
                }
                required
              />
              <TextField
                label="Job Title"
                value={(editingData as Experience).role || ""}
                onChange={(value) =>
                  setEditingData({
                    ...(editingData as Experience),
                    role: value,
                  })
                }
                required
              />
              <DateRangeField
                label="Employment Period"
                startDate={(editingData as Experience).startDate || ""}
                endDate={(editingData as Experience).endDate || ""}
                onStartDateChange={(date) =>
                  setEditingData({
                    ...(editingData as Experience),
                    startDate: date,
                  })
                }
                onEndDateChange={(date) =>
                  setEditingData({
                    ...(editingData as Experience),
                    endDate: date,
                  })
                }
                showPresentOption
              />
              <TextAreaField
                label="Description"
                value={(editingData as Experience).description || ""}
                onChange={(value) =>
                  setEditingData({
                    ...(editingData as Experience),
                    description: value,
                  })
                }
                placeholder="Describe your main responsibilities and achievements..."
                rows={4}
              />
              {resume &&
                (editingData as unknown as { index?: number })?.index !==
                  undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      AI Generate:
                    </span>
                    <FieldAIHelper
                      field="experience_description"
                      context={extractExperienceContext(
                        resume.experience,
                        (editingData as unknown as { index: number }).index,
                        job?.details || undefined,
                        resume
                      )}
                      onGenerate={(content) =>
                        setEditingData({
                          ...(editingData as Experience),
                          description: content,
                        })
                      }
                      onError={(_error) =>
                        console.error("AI generation error:", _error)
                      }
                    />
                  </div>
                )}
              <BulletListEditor
                label="Key Achievements"
                items={(editingData as Experience).achievements || []}
                onItemsChange={(items) =>
                  setEditingData({
                    ...(editingData as Experience),
                    achievements: items,
                  })
                }
                placeholder="Add an achievement"
                helpText="Use bullet points to highlight measurable accomplishments"
              />
              {resume &&
                (editingData as unknown as { index?: number })?.index !==
                  undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      AI Generate:
                    </span>
                    <FieldAIHelper
                      field="achievements"
                      context={extractAchievementsContext(
                        resume.experience,
                        (editingData as unknown as { index: number }).index,
                        job?.details || undefined
                      )}
                      onGenerate={(content) => {
                        // Generate achievements returns concatenated string, convert back to array
                        const achievements = content
                          .split("\n")
                          .filter((line) => line.trim());
                        setEditingData({
                          ...(editingData as Experience),
                          achievements,
                        });
                      }}
                      onError={(error) =>
                        console.error("AI generation error:", error)
                      }
                    />
                  </div>
                )}
            </div>
          )}

        {(editingSection === "education.add" ||
          editingSection === "education.edit") &&
          editingData !== null && (
            <div className="space-y-4">
              <TextField
                label="Institution"
                value={(editingData as Education).institution || ""}
                onChange={(value) =>
                  setEditingData({
                    ...(editingData as Education),
                    institution: value,
                  })
                }
                required
              />
              <TextField
                label="Degree"
                value={(editingData as Education).degree || ""}
                onChange={(value) =>
                  setEditingData({
                    ...(editingData as Education),
                    degree: value,
                  })
                }
                placeholder="Bachelor of Science, Master of Arts, etc."
                required
              />
              <TextField
                label="Field of Study"
                value={(editingData as Education).field || ""}
                onChange={(value) =>
                  setEditingData({
                    ...(editingData as Education),
                    field: value,
                  })
                }
                required
              />
              <DateRangeField
                label="Study Period"
                startDate={(editingData as Education).startDate || ""}
                endDate={(editingData as Education).endDate || ""}
                onStartDateChange={(date) =>
                  setEditingData({
                    ...(editingData as Education),
                    startDate: date,
                  })
                }
                onEndDateChange={(date) =>
                  setEditingData({
                    ...(editingData as Education),
                    endDate: date,
                  })
                }
                showPresentOption={false}
              />
              <TextField
                label="GPA (Optional)"
                value={(editingData as Education).gpa || ""}
                onChange={(value) =>
                  setEditingData({ ...(editingData as Education), gpa: value })
                }
                placeholder="3.8"
              />
            </div>
          )}

        {(editingSection === "projects.add" ||
          editingSection === "projects.edit") &&
          editingData !== null && (
            <div className="space-y-4">
              <TextField
                label="Project Name"
                value={(editingData as Project).name || ""}
                onChange={(value) =>
                  setEditingData({ ...(editingData as Project), name: value })
                }
                required
              />
              <TextAreaField
                label="Description"
                value={(editingData as Project).description || ""}
                onChange={(value) =>
                  setEditingData({
                    ...(editingData as Project),
                    description: value,
                  })
                }
                placeholder="Describe the project, your role, and impact..."
                rows={4}
              />
              <DateRangeField
                label="Project Duration"
                startDate={(editingData as Project).startDate || ""}
                endDate={(editingData as Project).endDate || ""}
                onStartDateChange={(date) =>
                  setEditingData({
                    ...(editingData as Project),
                    startDate: date,
                  })
                }
                onEndDateChange={(date) =>
                  setEditingData({ ...(editingData as Project), endDate: date })
                }
                showPresentOption={false}
              />
              <TagsEditor
                label="Technologies Used"
                tags={(editingData as Project).technologies || []}
                onTagsChange={(items) =>
                  setEditingData({
                    ...(editingData as Project),
                    technologies: items,
                  })
                }
                placeholder="Add a technology"
                helpText="List programming languages, frameworks, tools, etc."
              />
              <TextField
                label="Project URL"
                value={(editingData as Project).url || ""}
                onChange={(value) =>
                  setEditingData({ ...(editingData as Project), url: value })
                }
                placeholder="https://github.com/yourname/project"
              />
            </div>
          )}

        {(editingSection === "certifications.add" ||
          editingSection === "certifications.edit") &&
          editingData !== null && (
            <div className="space-y-4">
              <TextField
                label="Certification Name"
                value={(editingData as Certification).name || ""}
                onChange={(value) =>
                  setEditingData({
                    ...(editingData as Certification),
                    name: value,
                  })
                }
                required
              />
              <TextField
                label="Issuing Organization"
                value={(editingData as Certification).issuer || ""}
                onChange={(value) =>
                  setEditingData({
                    ...(editingData as Certification),
                    issuer: value,
                  })
                }
                required
              />
              <TextField
                label="Date Issued"
                value={(editingData as Certification).date || ""}
                onChange={(value) =>
                  setEditingData({
                    ...(editingData as Certification),
                    date: value,
                  })
                }
              />
              <TextField
                label="Credential URL"
                value={(editingData as Certification).url || ""}
                onChange={(value) =>
                  setEditingData({
                    ...(editingData as Certification),
                    url: value,
                  })
                }
                placeholder="https://..."
              />
            </div>
          )}
      </Modal>
    </div>
  );
}
