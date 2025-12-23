import { ResumeJSON } from '@/types/resume';

export function generateResumeTXT(resume: ResumeJSON): string {
  let txt = '';

  // Header
  txt += `${resume.header.name}\n`;
  txt += `${resume.header.email}\n\n`;

  // Summary
  txt += 'Summary:\n';
  txt += `${resume.summary}\n\n`;

  // Experience
  txt += 'Experience:\n';
  resume.experience.forEach(exp => {
    txt += `${exp.role} at ${exp.company}\n`;
    txt += `${exp.startDate} - ${exp.endDate || 'Present'}\n`;
    txt += `${exp.description}\n\n`;
  });

  // Projects
  txt += 'Projects:\n';
  resume.projects.forEach(proj => {
    txt += `${proj.name}\n`;
    txt += `${proj.description}\n\n`;
  });

  // Skills
  txt += 'Skills:\n';
  txt += `${resume.skills.join(', ')}\n\n`;

  // Education
  txt += 'Education:\n';
  resume.education.forEach(edu => {
    txt += `${edu.degree} from ${edu.institution}, ${edu.startDate}\n`;
  });
  txt += '\n';

  // Certifications
  txt += 'Certifications:\n';
  resume.certifications.forEach(cert => {
    txt += `${cert.name}, ${cert.date}\n`;
  });

  return txt;
}