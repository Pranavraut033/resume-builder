/**
 * Base LLM Provider with shared prompt generation utilities.
 * This eliminates prompt duplication across different LLM providers.
 */

import { ResumePromptInput, CoverLetterPromptInput } from "@/types/llm";

export abstract class BaseLLMProvider {
  /**
   * Generate a resume tailoring prompt
   */
  protected generateResumePrompt(input: ResumePromptInput): string {
    return `
You are a professional resume writer. Tailor the following base profile to the job description.

Base Profile:
${JSON.stringify(input.baseProfile, null, 2)}

Job Description:
${input.jobDescription}

Job Role: ${input.jobRole}
Company: ${input.company}

Instructions:
- Tailor the resume to highlight relevant experience, skills, and projects for this job.
- Keep the structure: header, summary, experience, projects, skills, education, certifications.
- Make it ATS-friendly: use keywords from the job description.
- Output only valid JSON matching the ResumeJSON structure.
- Do not include any text outside the JSON.
`;
  }

  /**
   * Generate a cover letter writing prompt
   */
  protected generateCoverLetterPrompt(input: CoverLetterPromptInput): string {
    return `
You are a professional cover letter writer. Write a compelling cover letter based on the following.

Base Profile:
${JSON.stringify(input.baseProfile, null, 2)}

Job Description:
${input.jobDescription}

Job Role: ${input.jobRole}
Company: ${input.company}

Tailored Resume:
${JSON.stringify(input.resume, null, 2)}

Instructions:
- Write a professional cover letter introducing the candidate and highlighting key qualifications.
- Keep it concise, 3-4 paragraphs.
- Tailor to the job and company.
- Output only the cover letter text, no additional formatting.
`;
  }

  /**
   * Generate a job details extraction prompt (for structured parsing)
   */
  protected generateJobParsingSystemPrompt(): string {
    return `You are an information extraction system for job descriptions.

Extract structured data from the following job description.
Follow these rules strictly:
- Do not infer facts that are not explicitly stated.
- If a field is missing, return null.
- Normalize values where possible (e.g., "Full-time", "On-site").
- Return valid JSON only.
- Do not include explanations.

Extract comprehensive job information including:
- Job identification (title, category, seniority, type, workplace type)
- Company details (name, industry, description, market position, location)
- Job location (city, region, country, onsite requirement)
- Responsibilities (core, technical, collaboration, architecture, quality)
- Required skills (years, technologies, languages, frameworks, APIs, tools, soft skills, languages)
- Nice-to-have skills (CI/CD, testing, cloud, domain interests)
- Tech stack (frontend, backend, database, cloud, devops)
- Benefits (compensation, environment, growth, flexibility, perks, culture, events)
- Contact information (recruiter name, role, email, phone, WhatsApp availability)

Ensure all arrays and nested objects follow the schema exactly.`;
  }
}
