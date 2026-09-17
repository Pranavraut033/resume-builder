import { z } from "zod";

import { getProviderInstance } from "@/lib/llm/providers/factory";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";
import { LLMGenerationOptions } from "@/types/llm";

const logger = createLogger("EmailClassifier");

export const EmailClassificationSchema = z.object({
  isRecruitingEmail: z
    .boolean()
    .describe(
      "Whether this email is related to a job application, recruiting, interview, rejection, assessment, or job offer"
    ),
  companyName: z
    .string()
    .nullable()
    .describe(
      "The company or organization hiring, e.g. 'Google', 'Stripe'. Cleaned of legal suffixes."
    ),
  role: z
    .string()
    .nullable()
    .describe(
      "The job title or position mentioned, e.g. 'Senior Frontend Engineer'"
    ),
  stage: z
    .enum(["APPLIED", "ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED", "INFO"])
    .nullable()
    .describe("The application stage identified from the email"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score between 0.0 and 1.0"),
  nextSteps: z
    .string()
    .nullable()
    .describe(
      "Any actionable next steps or scheduled events mentioned (e.g. 'Take take-home assessment by Friday', '30-min recruiter screen scheduled for Sept 20')"
    ),
  actionRequired: z
    .boolean()
    .describe(
      "True if the applicant needs to take action (reply, book interview time, complete assessment)"
    ),
});

export type EmailClassification = z.infer<typeof EmailClassificationSchema>;

export interface EmailToClassify {
  sender: string;
  recipient?: string | null;
  subject: string;
  snippet: string;
  bodyText?: string | null;
  date?: string | Date;
}

/**
 * Heuristic fallback classifier when LLM is offline or unconfigured.
 */
export function classifyEmailHeuristically(
  email: EmailToClassify
): EmailClassification {
  const subject = email.subject.toLowerCase();
  const body = (email.bodyText || email.snippet).toLowerCase();
  const sender = email.sender.toLowerCase();

  const isATS =
    sender.includes("greenhouse") ||
    sender.includes("lever.co") ||
    sender.includes("workday") ||
    sender.includes("ashbyhq") ||
    sender.includes("smartrecruiters") ||
    sender.includes("icims") ||
    sender.includes("jobvite") ||
    sender.includes("taleo");

  const rejectionWords = [
    "unfortunately",
    "not moving forward",
    "pursuing other candidates",
    "other applicants",
    "decided not to proceed",
    "will not be moving forward",
    "regret to inform",
  ];

  const interviewWords = [
    "interview",
    "phone screen",
    "speaking with you",
    "chat with",
    "schedule a call",
    "calendly.com",
    "good time to connect",
    "technical screen",
  ];

  const assessmentWords = [
    "assessment",
    "coding challenge",
    "hackerrank",
    "codesignal",
    "take-home",
    "online test",
    "testgorilla",
  ];

  const offerWords = [
    "offer letter",
    "offer of employment",
    "pleased to offer",
    "congratulations on your offer",
  ];

  const appliedWords = [
    "thank you for applying",
    "application received",
    "received your application",
    "application confirmation",
    "thanks for your interest",
  ];

  let isRecruiting = isATS;
  let stage: EmailClassification["stage"] = null;
  let actionRequired = false;

  if (offerWords.some((w) => subject.includes(w) || body.includes(w))) {
    isRecruiting = true;
    stage = "OFFER";
    actionRequired = true;
  } else if (
    rejectionWords.some((w) => subject.includes(w) || body.includes(w))
  ) {
    isRecruiting = true;
    stage = "REJECTED";
  } else if (
    interviewWords.some((w) => subject.includes(w) || body.includes(w))
  ) {
    isRecruiting = true;
    stage = "INTERVIEW";
    actionRequired = true;
  } else if (
    assessmentWords.some((w) => subject.includes(w) || body.includes(w))
  ) {
    isRecruiting = true;
    stage = "ASSESSMENT";
    actionRequired = true;
  } else if (
    appliedWords.some((w) => subject.includes(w) || body.includes(w)) ||
    isATS
  ) {
    isRecruiting = true;
    stage = "APPLIED";
  }

  // Attempt to extract company name from sender display name: "Recruiting at Figma <...>"
  let companyName: string | null = null;
  const matchAt = email.sender.match(/at\s+([A-Za-z0-9\s]+?)(?:<|$|\()/i);
  if (matchAt && matchAt[1]) {
    companyName = matchAt[1].trim();
  }

  return {
    isRecruitingEmail: isRecruiting,
    companyName,
    role: null,
    stage,
    confidence: isRecruiting ? 0.7 : 0.2,
    nextSteps: actionRequired ? "Review email for required response" : null,
    actionRequired,
  };
}

/**
 * Classifies an incoming email using the dedicated email LLM model configured in Settings.
 * Falls back to heuristic parsing if the LLM provider fails or is not configured.
 */
export async function classifyEmail(
  email: EmailToClassify
): Promise<EmailClassification> {
  const modelPair = useModelStore.getState().getEmailModelPair();

  if (!modelPair) {
    logger.info("No LLM model configured, using heuristic classification");
    return classifyEmailHeuristically(email);
  }

  const [providerType, modelName] = modelPair;

  try {
    const provider = await getProviderInstance(providerType);
    if (!provider) {
      logger.warn(
        `Could not instantiate provider ${providerType}, falling back to heuristics`
      );
      return classifyEmailHeuristically(email);
    }

    const systemPrompt = `You are an AI assistant that inspects emails to identify recruiting and job application correspondence.
Analyze the email metadata and content to extract structured details about:
1. Whether this is an email from a company, recruiter, or ATS regarding a job application.
2. The company name and job title/role.
3. The current stage:
   - "APPLIED": Application confirmation / received.
   - "ASSESSMENT": Coding test, take-home challenge, quiz, or automated assessment.
   - "INTERVIEW": Phone screen, hiring manager chat, technical or onsite interview scheduling.
   - "OFFER": Job offer, compensation package, offer letter.
   - "REJECTED": Notification that the company is not moving forward.
   - "INFO": General update, recruiter outreach, or status inquiry.
4. Next steps and whether applicant action is required.

Return strictly conforming JSON matching the schema.`;

    const userPrompt = `Email Sender: ${email.sender}
Recipient: ${email.recipient || "User"}
Date: ${email.date ? String(email.date) : "Unknown"}
Subject: ${email.subject}
Snippet/Body:
${email.bodyText || email.snippet}`;

    const prompt = {
      estimatedTokens: 0,
      purpose: "document_analysis" as const,
      systemPrompt,
      userPrompt,
    };

    const options: LLMGenerationOptions = {
      model: modelName,
      temperature: 0.1,
    };

    const { result } = await provider.runStructuredLLM(
      prompt,
      options,
      EmailClassificationSchema,
      "EmailClassificationSchema"
    );

    return result;
  } catch (err) {
    logger.error("LLM email classification failed, falling back to heuristics", {
      error: err instanceof Error ? err.message : String(err),
    });
    return classifyEmailHeuristically(email);
  }
}
