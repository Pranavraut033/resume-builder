import { EditableItem } from "@/components/job-v2/resume/EditableItem";
import { EditableLink } from "@/components/job-v2/resume/EditableLink";
import { EditableText } from "@/components/job-v2/resume/EditableText";
import { LanguageField } from "@/components/job-v2/resume/LanguageField";
import { ListSectionId } from "@/components/job-v2/resume/InlineEditContext";

import {
  Block,
  DomSectionBuilder,
  SectionRegistryEntry,
  TxtSectionBuilder,
} from "./types";

export const LIST_SECTIONS: readonly ListSectionId[] = [
  "experience",
  "education",
  "projects",
  "certifications",
];
export const isListSection = (key: string): key is ListSectionId =>
  (LIST_SECTIONS as readonly string[]).includes(key);

// Each builder is the per-section block-construction logic lifted verbatim
// from the old per-template duplication (originally ~80% of every ~850-line
// template file) — kept as ONE copy here instead of nine.

const summary: DomSectionBuilder = ({ resume, theme, edit }) => {
  if (!resume.summary && !edit.editable) return [];
  return [
    {
      sectionKey: "summary",
      node: (
        <p className={`${theme.textSize} ${theme.lineHeight}`}>
          <EditableText
            value={resume.summary}
            onCommit={(v) => edit.updateSummary(v)}
            fieldType="textarea"
            placeholder="Write a short professional summary…"
          />
        </p>
      ),
    },
  ];
};

const experience: DomSectionBuilder = ({ resume, theme, edit }) =>
  resume.experience.map((exp, expIndex): Block => ({
    sectionKey: "experience",
    itemIndex: expIndex,
    node: (
      <div>
        <div className="mb-1 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold" style={{ color: theme.accentColor }}>
              <EditableText
                value={exp.role}
                onCommit={(v) => edit.updateExperience(expIndex, { role: v })}
                placeholder="Role"
              />
            </h3>
            <p
              className={`${theme.textSize} ${theme.lineHeight}`}
              style={{ color: theme.secondaryColor }}
            >
              <EditableText
                value={exp.company}
                onCommit={(v) =>
                  edit.updateExperience(expIndex, { company: v })
                }
                placeholder="Company"
              />
            </p>
          </div>
          <span
            className={`${theme.textSize} shrink-0`}
            style={{ color: theme.secondaryColor }}
          >
            <EditableText
              value={exp.startDate}
              onCommit={(v) =>
                edit.updateExperience(expIndex, { startDate: v })
              }
              placeholder="Start"
            />
            {" - "}
            <EditableText
              value={exp.endDate || ""}
              onCommit={(v) => edit.updateExperience(expIndex, { endDate: v })}
              placeholder="Present"
            />
          </span>
        </div>
        {(exp.description || edit.editable) && (
          <p className={`${theme.textSize} ${theme.lineHeight} mb-2`}>
            <EditableText
              value={exp.description}
              onCommit={(v) =>
                edit.updateExperience(expIndex, { description: v })
              }
              fieldType="textarea"
              placeholder="Describe your role…"
            />
          </p>
        )}
        {(exp.achievements.length > 0 || edit.editable) && (
          <EditableText
            value={exp.achievements.join("\n")}
            onCommit={(v) =>
              edit.updateExperienceAchievements(
                expIndex,
                v.split("\n").filter(Boolean)
              )
            }
            fieldType="bullet"
            placeholder="Add bullet points, one per line…"
            renderDisplay={(v) => (
              <ul
                className={`${theme.textSize} ${theme.lineHeight} list-inside list-disc space-y-1`}
              >
                {v
                  .split("\n")
                  .filter(Boolean)
                  .map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
              </ul>
            )}
          />
        )}
      </div>
    ),
  }));

const projects: DomSectionBuilder = ({ resume, theme, edit }) =>
  resume.projects.map((project, projectIndex): Block => ({
    sectionKey: "projects",
    itemIndex: projectIndex,
    node: (
      <div>
        <h3 className="font-semibold" style={{ color: theme.accentColor }}>
          <EditableText
            value={project.name}
            onCommit={(v) => edit.updateProject(projectIndex, { name: v })}
            placeholder="Project name"
          />
          {(project.url || edit.editable) && (
            <EditableLink
              href={project.url ?? ""}
              onCommit={(v) => edit.updateProject(projectIndex, { url: v })}
              placeholder="https://…"
              className={`${theme.textSize} ml-2 hover:underline`}
              style={{ color: theme.secondaryColor }}
            >
              [Link]
            </EditableLink>
          )}
        </h3>
        {(project.startDate || project.endDate || edit.editable) && (
          <div
            className={`${theme.textSize}`}
            style={{ color: theme.secondaryColor }}
          >
            <EditableText
              value={project.startDate || ""}
              onCommit={(v) =>
                edit.updateProject(projectIndex, { startDate: v })
              }
              placeholder="Start"
            />
            {" - "}
            <EditableText
              value={project.endDate || ""}
              onCommit={(v) =>
                edit.updateProject(projectIndex, { endDate: v })
              }
              placeholder="Present"
            />
          </div>
        )}
        <p className={`${theme.textSize} ${theme.lineHeight} mb-1`}>
          <EditableText
            value={project.description}
            onCommit={(v) =>
              edit.updateProject(projectIndex, { description: v })
            }
            fieldType="textarea"
            placeholder="Describe the project…"
          />
        </p>
        {project.technologies.length > 0 && (
          <div
            className={`${theme.textSize}`}
            style={{ color: theme.secondaryColor }}
          >
            <span className="font-medium">Technologies:</span>{" "}
            {project.technologies.map((tech, i) => (
              <span key={i}>
                {i > 0 && ", "}
                <EditableText
                  value={tech}
                  onCommit={(v) => {
                    const next = project.technologies.map((t, ti) =>
                      ti === i ? v : t
                    );
                    edit.updateProjectTechnologies(projectIndex, next);
                  }}
                  placeholder="Tech"
                />
              </span>
            ))}
          </div>
        )}
      </div>
    ),
  }));

const skills: DomSectionBuilder = ({ resume, theme, edit }) => {
  if (resume.skills.length === 0 && !edit.editable) return [];
  return [
    {
      sectionKey: "skills",
      node: (
        <div className={`${theme.textSize} ${theme.lineHeight}`}>
          <EditableText
            value={resume.skills.join(", ")}
            onCommit={(v) =>
              edit.updateSkills(
                v
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            fieldType="textarea"
            placeholder="JavaScript, TypeScript, React…"
            renderDisplay={(v) => <>{v.split(", ").join(" • ")}</>}
          />
        </div>
      ),
    },
  ];
};

const education: DomSectionBuilder = ({ resume, theme, edit }) =>
  resume.education.map((edu, eduIndex): Block => ({
    sectionKey: "education",
    itemIndex: eduIndex,
    node: (
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold" style={{ color: theme.accentColor }}>
              <EditableText
                value={edu.degree}
                onCommit={(v) => edit.updateEducation(eduIndex, { degree: v })}
                placeholder="Degree"
              />
              {(edu.field || edit.editable) && (
                <>
                  {" in "}
                  <EditableText
                    value={edu.field}
                    onCommit={(v) =>
                      edit.updateEducation(eduIndex, { field: v })
                    }
                    placeholder="Field"
                  />
                </>
              )}
            </h3>
            <p
              className={`${theme.textSize} ${theme.lineHeight}`}
              style={{ color: theme.secondaryColor }}
            >
              <EditableText
                value={edu.institution}
                onCommit={(v) =>
                  edit.updateEducation(eduIndex, { institution: v })
                }
                placeholder="Institution"
              />
            </p>
          </div>
          <span
            className={`${theme.textSize} shrink-0`}
            style={{ color: theme.secondaryColor }}
          >
            <EditableText
              value={edu.startDate}
              onCommit={(v) =>
                edit.updateEducation(eduIndex, { startDate: v })
              }
              placeholder="Start"
            />
            {" - "}
            <EditableText
              value={edu.endDate || ""}
              onCommit={(v) => edit.updateEducation(eduIndex, { endDate: v })}
              placeholder="Present"
            />
          </span>
        </div>
        {(edu.gpa || edit.editable) && (
          <p className={`${theme.textSize}`} style={{ color: theme.secondaryColor }}>
            GPA:{" "}
            <EditableText
              value={edu.gpa || ""}
              onCommit={(v) => edit.updateEducation(eduIndex, { gpa: v })}
              placeholder="—"
            />
          </p>
        )}
      </div>
    ),
  }));

const certifications: DomSectionBuilder = ({ resume, theme, edit }) =>
  resume.certifications.map((cert, certIndex): Block => ({
    sectionKey: "certifications",
    itemIndex: certIndex,
    node: (
      <div>
        <h3 className="font-semibold" style={{ color: theme.accentColor }}>
          <EditableText
            value={cert.name}
            onCommit={(v) => edit.updateCertification(certIndex, { name: v })}
            placeholder="Certification"
          />
        </h3>
        <p className={`${theme.textSize}`} style={{ color: theme.secondaryColor }}>
          <EditableText
            value={cert.issuer}
            onCommit={(v) =>
              edit.updateCertification(certIndex, { issuer: v })
            }
            placeholder="Issuer"
          />
          {" • "}
          <EditableText
            value={cert.date}
            onCommit={(v) => edit.updateCertification(certIndex, { date: v })}
            placeholder="Date"
          />
          {(cert.url || edit.editable) && (
            <EditableLink
              href={cert.url ?? ""}
              onCommit={(v) => edit.updateCertification(certIndex, { url: v })}
              placeholder="https://…"
              className="ml-2 hover:underline"
              style={{ color: theme.secondaryColor }}
            >
              [Verify]
            </EditableLink>
          )}
        </p>
      </div>
    ),
  }));

const publications: DomSectionBuilder = ({ resume, theme }) =>
  (resume.publications ?? []).map((pub): Block => ({
    sectionKey: "publications",
    node: (
      <div>
        <h3 className="font-semibold" style={{ color: theme.accentColor }}>
          {pub.title}
        </h3>
        <p className={`${theme.textSize} ${theme.lineHeight}`}>
          {pub.authors.join(", ")}
        </p>
        <p className={`${theme.textSize}`} style={{ color: theme.secondaryColor }}>
          {pub.venue} • {pub.date}
          {pub.doi && ` • DOI: ${pub.doi}`}
          {pub.url && (
            <a
              href={pub.url}
              className="ml-2 hover:underline"
              style={{ color: theme.secondaryColor }}
            >
              [View]
            </a>
          )}
        </p>
      </div>
    ),
  }));

const languages: DomSectionBuilder = ({ resume, theme, edit }) => {
  if ((resume.languages ?? []).length === 0 && !edit.editable) return [];
  return [
    {
      sectionKey: "languages",
      node: (
        <div
          className={`${theme.textSize} ${theme.lineHeight} flex flex-wrap gap-x-4 gap-y-1`}
        >
          {(resume.languages ?? []).map((l, idx) => (
            <LanguageField
              key={idx}
              language={l}
              onUpdate={(patch) => edit.updateLanguage(idx, patch)}
              onRemove={() => edit.removeLanguage(idx)}
            />
          ))}
          {edit.editable && (
            <button
              onClick={edit.addLanguage}
              className="text-agent-primary hover:text-agent-primary/70 text-xs opacity-60 hover:opacity-100"
            >
              + Add
            </button>
          )}
        </div>
      ),
    },
  ];
};

const volunteer: DomSectionBuilder = ({ resume, theme }) =>
  (resume.volunteer ?? []).map((v): Block => ({
    sectionKey: "volunteer",
    node: (
      <div>
        <div className="mb-1 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold" style={{ color: theme.accentColor }}>
              {v.role}
            </h3>
            <p
              className={`${theme.textSize} ${theme.lineHeight}`}
              style={{ color: theme.secondaryColor }}
            >
              {v.organization}
            </p>
          </div>
          <span
            className={`${theme.textSize} shrink-0`}
            style={{ color: theme.secondaryColor }}
          >
            {v.startDate} - {v.endDate || "Present"}
          </span>
        </div>
        {v.description && (
          <p className={`${theme.textSize} ${theme.lineHeight}`}>
            {v.description}
          </p>
        )}
      </div>
    ),
  }));

const awards: DomSectionBuilder = ({ resume, theme }) =>
  (resume.awards ?? []).map((award): Block => ({
    sectionKey: "awards",
    node: (
      <div>
        <h3 className="font-semibold" style={{ color: theme.accentColor }}>
          {award.title}
        </h3>
        <p className={`${theme.textSize}`} style={{ color: theme.secondaryColor }}>
          {award.issuer} • {award.date}
        </p>
        {award.description && (
          <p className={`${theme.textSize} ${theme.lineHeight}`}>
            {award.description}
          </p>
        )}
      </div>
    ),
  }));

// ponytail: custom sections render bullets/text only (matches
// CustomSectionSchema.type in src/types/resume.ts). Add a richer renderer
// when a user actually needs dated/timeline entries.
const custom: DomSectionBuilder = ({ resume, instance }) => {
  const section = (resume.sectionLayout?.custom ?? []).find(
    (c) => c.id === instance.id
  );
  if (!section) return [];
  return [
    {
      sectionKey: instance.id,
      node:
        section.type === "text" ? (
          <p>{section.items.join(" ")}</p>
        ) : (
          <ul className="list-inside list-disc space-y-1">
            {section.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ),
    },
  ];
};

// ── TXT builders ────────────────────────────────────────────────────────────
// Plain-text equivalent of each dom() builder. Shares buildSections() with
// the DOM/PDF engines, so order/hidden/custom apply identically here —
// fixes the old txtExport.ts silently dropping publications/languages/
// volunteer/awards (it had its own hardcoded, incomplete section list).

const txtSummary: TxtSectionBuilder = ({ resume }) =>
  resume.summary ? `Summary:\n${resume.summary}\n` : "";

const txtExperience: TxtSectionBuilder = ({ resume }) => {
  if (resume.experience.length === 0) return "";
  const body = resume.experience
    .map((exp) => {
      const achievements = exp.achievements
        .map((a) => `  - ${a}`)
        .join("\n");
      return `${exp.role} at ${exp.company}\n${exp.startDate} - ${exp.endDate || "Present"}\n${exp.description}${achievements ? `\n${achievements}` : ""}`;
    })
    .join("\n\n");
  return `Experience:\n${body}\n`;
};

const txtProjects: TxtSectionBuilder = ({ resume }) => {
  if (resume.projects.length === 0) return "";
  const body = resume.projects
    .map((p) => `${p.name}\n${p.description}${p.technologies.length ? `\nTechnologies: ${p.technologies.join(", ")}` : ""}`)
    .join("\n\n");
  return `Projects:\n${body}\n`;
};

const txtSkills: TxtSectionBuilder = ({ resume }) =>
  resume.skills.length ? `Skills:\n${resume.skills.join(", ")}\n` : "";

const txtEducation: TxtSectionBuilder = ({ resume }) => {
  if (resume.education.length === 0) return "";
  const body = resume.education
    .map((edu) => `${edu.degree} in ${edu.field}, ${edu.institution}, ${edu.startDate} - ${edu.endDate || "Present"}`)
    .join("\n");
  return `Education:\n${body}\n`;
};

const txtCertifications: TxtSectionBuilder = ({ resume }) => {
  if (resume.certifications.length === 0) return "";
  const body = resume.certifications
    .map((c) => `${c.name}, ${c.issuer}, ${c.date}`)
    .join("\n");
  return `Certifications:\n${body}\n`;
};

const txtPublications: TxtSectionBuilder = ({ resume }) => {
  const pubs = resume.publications ?? [];
  if (pubs.length === 0) return "";
  const body = pubs
    .map((p) => `${p.title} — ${p.authors.join(", ")} (${p.venue}, ${p.date})`)
    .join("\n");
  return `Publications:\n${body}\n`;
};

const txtLanguages: TxtSectionBuilder = ({ resume }) => {
  const langs = resume.languages ?? [];
  if (langs.length === 0) return "";
  return `Languages:\n${langs.map((l) => `${l.name} (${l.proficiency})`).join(", ")}\n`;
};

const txtVolunteer: TxtSectionBuilder = ({ resume }) => {
  const vols = resume.volunteer ?? [];
  if (vols.length === 0) return "";
  const body = vols
    .map((v) => `${v.role} at ${v.organization}, ${v.startDate} - ${v.endDate || "Present"}\n${v.description}`)
    .join("\n\n");
  return `Volunteer:\n${body}\n`;
};

const txtAwards: TxtSectionBuilder = ({ resume }) => {
  const awardList = resume.awards ?? [];
  if (awardList.length === 0) return "";
  const body = awardList
    .map((a) => `${a.title}, ${a.issuer}, ${a.date}${a.description ? `\n${a.description}` : ""}`)
    .join("\n");
  return `Awards:\n${body}\n`;
};

const txtCustom: TxtSectionBuilder = ({ resume, instance }) => {
  const section = (resume.sectionLayout?.custom ?? []).find(
    (c) => c.id === instance.id
  );
  if (!section || section.items.length === 0) return "";
  return `${instance.title}:\n${section.items.join(section.type === "text" ? " " : "\n")}\n`;
};

export const SECTION_REGISTRY: Record<string, SectionRegistryEntry> = {
  summary: { dom: summary, txt: txtSummary, defaultTitle: "Summary" },
  experience: {
    dom: experience,
    txt: txtExperience,
    defaultTitle: "Experience",
  },
  projects: { dom: projects, txt: txtProjects, defaultTitle: "Projects" },
  skills: { dom: skills, txt: txtSkills, defaultTitle: "Skills" },
  education: {
    dom: education,
    txt: txtEducation,
    defaultTitle: "Education",
  },
  certifications: {
    dom: certifications,
    txt: txtCertifications,
    defaultTitle: "Certifications",
  },
  publications: {
    dom: publications,
    txt: txtPublications,
    defaultTitle: "Publications",
  },
  languages: {
    dom: languages,
    txt: txtLanguages,
    defaultTitle: "Languages",
  },
  volunteer: {
    dom: volunteer,
    txt: txtVolunteer,
    defaultTitle: "Volunteer",
  },
  awards: { dom: awards, txt: txtAwards, defaultTitle: "Awards" },
  custom: { dom: custom, txt: txtCustom, defaultTitle: "Custom" },
};
