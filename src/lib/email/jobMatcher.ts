import { EmailClassification, EmailToClassify } from "@/lib/llm/emailClassifier";
import { prisma } from "@/lib/prisma";

export interface JobMatchResult {
  jobId: number;
  companyId: number;
  confidence: number;
  reason: string;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEmailDomain(emailStr: string): string | null {
  const match = emailStr.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (!match || !match[1]) return null;
  const domain = match[1].toLowerCase();
  // Filter out common ATS / public webmail domains
  const ignoreDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "greenhouse-mail.io",
    "greenhouse.io",
    "boards-mail.lever.co",
    "lever.co",
    "myworkday.com",
    "ashbyhq.com",
    "smartrecruiters.com",
    "icims.com",
    "jobvite.com",
  ];
  if (ignoreDomains.includes(domain)) return null;
  return domain;
}

/**
 * Matches an email to a Job record in the database.
 */
export async function matchEmailToJob(
  email: EmailToClassify,
  classification: EmailClassification
): Promise<JobMatchResult | null> {
  // Fetch candidate jobs with company
  const jobs = await prisma.job.findMany({
    select: {
      id: true,
      role: true,
      url: true,
      companyId: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!jobs || jobs.length === 0) return null;

  const emailSenderDomain = extractEmailDomain(email.sender);
  const normalizedSubject = normalize(email.subject);
  const normalizedBody = normalize(email.snippet + " " + (email.bodyText || ""));
  const classifiedCompany = classification.companyName
    ? normalize(classification.companyName)
    : null;
  const classifiedRole = classification.role
    ? normalize(classification.role)
    : null;

  let bestMatch: JobMatchResult | null = null;
  let highestScore = 0;

  for (const job of jobs) {
    let score = 0;
    const reasons: string[] = [];

    const normCompanyName = normalize(job.company.name);
    const normJobRole = normalize(job.role);

    // 1. Check direct company name match from classification
    if (classifiedCompany && classifiedCompany.length > 2) {
      if (
        classifiedCompany === normCompanyName ||
        normCompanyName.includes(classifiedCompany) ||
        classifiedCompany.includes(normCompanyName)
      ) {
        score += 0.55;
        reasons.push(`Classified company matched '${job.company.name}'`);
      }
    }

    // 2. Check if company name appears in email subject or body
    if (normCompanyName.length > 2) {
      if (normalizedSubject.includes(normCompanyName)) {
        score += 0.35;
        reasons.push(`Subject mentions company '${job.company.name}'`);
      } else if (normalizedBody.includes(normCompanyName)) {
        score += 0.2;
        reasons.push(`Email body mentions company '${job.company.name}'`);
      }
    }

    // 3. Check sender domain matching company name or job URL
    if (emailSenderDomain) {
      const cleanCompanySlug = normCompanyName.replace(/\s+/g, "");
      if (emailSenderDomain.includes(cleanCompanySlug)) {
        score += 0.4;
        reasons.push(`Sender domain '${emailSenderDomain}' matches company`);
      }
      if (job.url && job.url.toLowerCase().includes(emailSenderDomain)) {
        score += 0.4;
        reasons.push(`Sender domain matches job posting URL domain`);
      }
    }

    // 4. Check role title match
    if (classifiedRole && classifiedRole.length > 3) {
      if (
        normJobRole.includes(classifiedRole) ||
        classifiedRole.includes(normJobRole)
      ) {
        score += 0.25;
        reasons.push(`Classified role matched '${job.role}'`);
      }
    } else if (
      normJobRole.length > 4 &&
      (normalizedSubject.includes(normJobRole) || normalizedBody.includes(normJobRole))
    ) {
      score += 0.2;
      reasons.push(`Role '${job.role}' found in email content`);
    }

    if (score > highestScore && score >= 0.5) {
      highestScore = score;
      bestMatch = {
        jobId: job.id,
        companyId: job.companyId,
        confidence: Math.min(1.0, score),
        reason: reasons.join("; "),
      };
    }
  }

  return bestMatch;
}
