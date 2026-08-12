import { ResumeJSON, Skill } from "@/types/resume";

/** A run of skills sharing the same (optional) category, in first-seen order. */
interface SkillGroup {
  category?: string;
  skills: Skill[];
}

/**
 * Groups skills by `category` in first-seen order; skills with no category
 * form a single trailing implicit group with no heading.
 */
function groupSkills(skills: Skill[]): SkillGroup[] {
  const groups: SkillGroup[] = [];
  const byCategory = new Map<string, SkillGroup>();
  let uncategorized: SkillGroup | null = null;
  for (const skill of skills) {
    if (skill.category) {
      let group = byCategory.get(skill.category);
      if (!group) {
        group = { category: skill.category, skills: [] };
        byCategory.set(skill.category, group);
        groups.push(group);
      }
      group.skills.push(skill);
    } else {
      if (!uncategorized) uncategorized = { skills: [] };
      uncategorized.skills.push(skill);
    }
  }
  if (uncategorized) groups.push(uncategorized);
  return groups;
}

export function resumeToText(resume: ResumeJSON): string {
  const lines: string[] = [];

  const section = (title: string) => {
    lines.push(`\n${"=".repeat(60)}`);
    lines.push(title.toUpperCase());
    lines.push("=".repeat(60));
  };

  const divider = () => lines.push("-".repeat(40));

  // ── Header ──────────────────────────────────────────────────
  const h = resume.header;
  lines.push(h.name);

  const contacts = [
    h.email,
    h.phone,
    h.location,
    h.linkedin && `LinkedIn: ${h.linkedin}`,
    h.github && `GitHub: ${h.github}`,
    h.website && `Website: ${h.website}`,
    h.workAuthorization && `Work Authorization: ${h.workAuthorization}`,
    h.nationality && `Nationality: ${h.nationality}`,
    h.dateOfBirth && `Date of Birth: ${h.dateOfBirth}`,
  ].filter(Boolean);
  lines.push(contacts.join("  |  "));

  // ── Summary ─────────────────────────────────────────────────
  if (resume.summary) {
    section("Summary");
    lines.push(resume.summary);
  }

  // ── Experience ───────────────────────────────────────────────
  if (resume.experience.length > 0) {
    section("Experience");
    resume.experience.forEach((exp, i) => {
      if (i > 0) divider();
      const period = `${exp.startDate} – ${exp.endDate ?? "Present"}`;
      lines.push(`${exp.role} @ ${exp.company}  (${period})`);
      if (exp.description) lines.push(exp.description);
      exp.achievements.forEach((a) => lines.push(`  • ${a}`));
    });
  }

  // ── Projects ─────────────────────────────────────────────────
  if (resume.projects.length > 0) {
    section("Projects");
    resume.projects.forEach((p, i) => {
      if (i > 0) divider();
      const period = p.startDate
        ? ` (${p.startDate} – ${p.endDate ?? "Present"})`
        : "";
      lines.push(`${p.name}${period}`);
      if (p.description) lines.push(p.description);
      if (p.technologies.length > 0)
        lines.push(`Technologies: ${p.technologies.join(", ")}`);
      if (p.url) lines.push(`URL: ${p.url}`);
    });
  }

  // ── Skills ───────────────────────────────────────────────────
  if (resume.skills.length > 0) {
    section("Skills");
    groupSkills(resume.skills).forEach((group) => {
      const list = group.skills.map((s) => s.name).join(", ");
      lines.push(group.category ? `${group.category}: ${list}` : list);
    });
  }

  // ── Education ────────────────────────────────────────────────
  if (resume.education.length > 0) {
    section("Education");
    resume.education.forEach((ed, i) => {
      if (i > 0) divider();
      const period = `${ed.startDate} – ${ed.endDate ?? "Present"}`;
      lines.push(`${ed.degree} in ${ed.field}`);
      lines.push(`${ed.institution}  (${period})`);
      if (ed.gpa) lines.push(`GPA: ${ed.gpa}`);
    });
  }

  // ── Certifications ───────────────────────────────────────────
  if (resume.certifications.length > 0) {
    section("Certifications");
    resume.certifications.forEach((c) => {
      lines.push(`${c.name} — ${c.issuer} (${c.date})`);
      if (c.url) lines.push(`  ${c.url}`);
    });
  }

  // ── Publications ─────────────────────────────────────────────
  if (resume.publications?.length) {
    section("Publications");
    resume.publications.forEach((pub, i) => {
      if (i > 0) divider();
      lines.push(pub.title);
      lines.push(`Authors: ${pub.authors.join(", ")}`);
      lines.push(`${pub.venue}  (${pub.date})`);
      if (pub.doi) lines.push(`DOI: ${pub.doi}`);
      if (pub.url) lines.push(`URL: ${pub.url}`);
    });
  }

  // ── Languages ────────────────────────────────────────────────
  if (resume.languages?.length) {
    section("Languages");
    resume.languages.forEach((l) => lines.push(`${l.name}: ${l.proficiency}`));
  }

  // ── Volunteer ────────────────────────────────────────────────
  if (resume.volunteer?.length) {
    section("Volunteer");
    resume.volunteer.forEach((v, i) => {
      if (i > 0) divider();
      const period = `${v.startDate} – ${v.endDate ?? "Present"}`;
      lines.push(`${v.role} @ ${v.organization}  (${period})`);
      if (v.description) lines.push(v.description);
    });
  }

  // ── Awards ───────────────────────────────────────────────────
  if (resume.awards?.length) {
    section("Awards");
    resume.awards.forEach((a) => {
      lines.push(`${a.title} — ${a.issuer} (${a.date})`);
      if (a.description) lines.push(`  ${a.description}`);
    });
  }

  return lines.join("\n").trim();
}

/**
 * Just the natural-language prose a human would actually read as sentences —
 * summary, experience/project/volunteer/award descriptions, achievements, and
 * custom-section bullets. No headers, dividers, dates, company names, URLs,
 * or GPA — those aren't prose and only confuse the humanizer into "fixing"
 * formatting. Mirrors exactly the fields `applyChangesToResume` rewrites, so
 * every change the LLM returns still matches a literal substring somewhere.
 */
export function resumeToProseText(resume: ResumeJSON): string {
  const blocks: string[] = [];

  if (resume.summary) blocks.push(resume.summary);

  resume.experience.forEach((exp) => {
    if (exp.description) blocks.push(exp.description);
    exp.achievements.forEach((a) => blocks.push(a));
  });

  resume.projects.forEach((p) => {
    if (p.description) blocks.push(p.description);
  });

  resume.volunteer?.forEach((v) => {
    if (v.description) blocks.push(v.description);
  });

  resume.awards?.forEach((a) => {
    if (a.description) blocks.push(a.description);
  });

  resume.sectionLayout?.custom?.forEach((section) => {
    section.items.forEach((item) => blocks.push(item));
  });

  return blocks.join("\n\n");
}

export function coverLetterToText(
  coverLetter: string,
  resume: ResumeJSON
): string {
  const header = `${resume.header.name}\n${[resume.header.email, resume.header.phone, resume.header.website].filter(Boolean).join(" | ")}`;

  const date = new Date().toLocaleDateString();

  return `${header}\n\n${date}\n\n${htmlToText(coverLetter)}`;
}

export function htmlToText(html: string): string {
  // ponytail: render-time SSR guard — some client components pass this
  // straight into JSX props (not an event handler), so it still runs
  // during Next's server render of "use client" components, where
  // `document` doesn't exist. Real parsing only matters once mounted.
  if (typeof document === "undefined") {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .trim();
  }

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  // Replace <br> with newlines
  tempDiv.querySelectorAll("br").forEach((br) => {
    br.replaceWith("\n");
  });

  // Handle paragraphs
  tempDiv.querySelectorAll("p").forEach((p) => {
    p.replaceWith(`${p.textContent}\n\n`);
  });

  return tempDiv.textContent?.trim() || "";
}
