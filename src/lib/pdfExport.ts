import { PDFDocument, rgb } from "pdf-lib";

import { ResumeJSON } from "@/types/resume";

export async function generateResumePDF(
  resume: ResumeJSON
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { height } = page.getSize();

  let y = height - 50;
  const fontSize = 12;
  const lineHeight = fontSize + 5;

  const drawText = (text: string) => {
    page.drawText(text, { x: 50, y, size: fontSize, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };

  // Header
  drawText(`Name: ${resume.header.name}`);
  drawText(`Email: ${resume.header.email}`);
  y -= 10;

  // Summary
  drawText("Summary:");
  drawText(resume.summary);
  y -= 10;

  // Experience
  drawText("Experience:");
  resume.experience.forEach((exp) => {
    drawText(
      `${exp.role} at ${exp.company} (${exp.startDate} - ${exp.endDate || "Present"})`
    );
    drawText(exp.description);
    y -= 5;
  });
  y -= 10;

  // Projects
  drawText("Projects:");
  resume.projects.forEach((proj) => {
    drawText(`${proj.name}: ${proj.description}`);
    y -= 5;
  });
  y -= 10;

  // Skills
  drawText("Skills:");
  drawText(resume.skills.join(", "));
  y -= 10;

  // Education
  drawText("Education:");
  resume.education.forEach((edu) => {
    drawText(
      `${edu.degree} from ${edu.institution} (${edu.startDate} - ${edu.endDate || "Present"})`
    );
    y -= 5;
  });
  y -= 10;

  // Certifications
  drawText("Certifications:");
  resume.certifications.forEach((cert) => {
    drawText(`${cert.name} (${cert.date})`);
    y -= 5;
  });

  return await pdfDoc.save();
}
