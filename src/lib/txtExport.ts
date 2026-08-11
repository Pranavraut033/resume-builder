import { buildSections } from "@/components/job-v2/engine/buildSections";
import { SECTION_REGISTRY } from "@/components/job-v2/engine/sections";
import { ResumeJSON } from "@/types/resume";

// Columns are irrelevant for plain text — a 1-column config just gives
// buildSections() a layout to resolve against; order/hidden/custom apply
// the same regardless.
const TXT_LAYOUT_CONFIG = {
  columns: 1 as const,
  heading: "underline" as const,
};

export function generateResumeTXT(resume: ResumeJSON): string {
  const h = resume.header;
  const contacts = [
    h.email,
    h.phone,
    h.location,
    h.linkedin && `LinkedIn: ${h.linkedin}`,
    h.github && `GitHub: ${h.github}`,
    h.website && `Website: ${h.website}`,
    h.workAuthorization && `Work Authorization: ${h.workAuthorization}`,
  ].filter(Boolean);
  const header = `${h.name}\n${h.headline ? `${h.headline}\n` : ""}${contacts.join("  |  ")}\n\n`;

  const body = buildSections(resume, TXT_LAYOUT_CONFIG)
    .map((instance) => {
      const entry = SECTION_REGISTRY[instance.type];
      if (!entry) return "";
      const text = entry.txt({ resume, instance });
      return text ? `${text}\n` : "";
    })
    .filter(Boolean)
    .join("");

  return header + body;
}
