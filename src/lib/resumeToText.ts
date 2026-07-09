import { ResumeJSON } from "@/types/resume";

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
    lines.push(resume.skills.join(", "));
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

export function coverLetterToText(
  coverLetter: string,
  resume: ResumeJSON
): string {
  const header = `${resume.header.name}\n${[resume.header.email, resume.header.phone, resume.header.website].filter(Boolean).join(" | ")}`;

  const date = new Date().toLocaleDateString();

  return `${header}\n\n${date}\n\n${htmlToText(coverLetter)}`;
}

export function htmlToText(html: string): string {
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
