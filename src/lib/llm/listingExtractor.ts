"use client";

import { z } from "zod";

import { detectSource, normalizeListingUrl } from "@/lib/email/listingUrl";
import { getProviderInstance } from "@/lib/llm/providers/factory";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";

import type { EmailToClassify } from "./emailClassifier";

const logger = createLogger("ListingExtractor");

export const JobListingsSchema = z.object({
  listings: z.array(
    z.object({
      title: z.string().describe("Job title exactly as shown in the digest"),
      companyName: z.string().nullable(),
      location: z.string().nullable(),
      url: z
        .string()
        .describe("The posting's link, copied verbatim from the email body"),
      postedText: z
        .string()
        .nullable()
        .describe("Recency text as written, e.g. '2 days ago'"),
    })
  ),
});

export interface ListingInput {
  title: string;
  companyName: string | null;
  location: string | null;
  /** Normalized — the dedupe key. */
  url: string;
  source: string;
  postedText: string | null;
}

const JOB_URL_RE =
  /https?:\/\/[^\s<>()"']*(?:\/jobs\/view\/\d+|indeed\.[^\s/]+\/(?:viewjob|rc\/clk)|glassdoor\.[^\s/]+\/job-listing|stepstone\.[^\s/]+\/stellenangebote|xing\.com\/jobs\/)[^\s<>()"']*/gi;

// UI chrome that sits between a posting's text and its link in a digest.
const NOISE_LINE =
  /^(view job|apply|easy apply|actively recruiting|this company is actively hiring|be an early applicant|promoted|see all jobs|manage alerts|unsubscribe|\d+\s+(connections?|(company|school) alum\w*))\b/i;

/**
 * No-LLM fallback: known job-URL shapes in the body. A posting is the few text
 * lines just above its link (title, company, location), stopping at the
 * previous link or a blank gap. Crude; the LLM path replaces it whenever a
 * model is set.
 * ponytail: misses platforms outside JOB_URL_RE — add a pattern when one shows up.
 */
export function extractListingsHeuristically(bodyText: string): ListingInput[] {
  const lines = bodyText.split(/\r?\n/).map((l) => l.trim());
  const out = new Map<string, ListingInput>();

  lines.forEach((line, i) => {
    for (const raw of line.match(JOB_URL_RE) ?? []) {
      const url = normalizeListingUrl(raw);
      if (out.has(url)) continue;

      const block: string[] = [];
      for (let j = i - 1; j >= 0 && block.length < 3; j--) {
        if (JOB_URL_RE.test(lines[j])) {
          JOB_URL_RE.lastIndex = 0;
          break;
        }
        JOB_URL_RE.lastIndex = 0;
        if (!lines[j]) {
          if (block.length >= 2) break;
          continue;
        }
        if (NOISE_LINE.test(lines[j])) continue;
        block.unshift(lines[j]);
      }

      // "Company · Location" on one line, or company and location on their own.
      const [title = "Job listing", second, third] = block;
      let companyName: string | null = null;
      let location: string | null = null;
      if (second?.includes(" · ")) {
        [companyName, location] = second.split(" · ").map((p) => p.trim());
      } else {
        companyName = second ?? null;
        location = third ?? null;
      }

      out.set(url, {
        title: title.slice(0, 120),
        companyName,
        location,
        url,
        source: detectSource(url),
        postedText: null,
      });
    }
  });

  return [...out.values()];
}

/** Digest -> individual postings. LLM when an email model is configured, regex otherwise. */
export async function extractJobListings(
  email: EmailToClassify
): Promise<ListingInput[]> {
  const body = email.bodyText || email.snippet;
  const fallback = () => extractListingsHeuristically(body);

  const modelPair = useModelStore.getState().getEmailModelPair();
  if (!modelPair) return fallback();
  const [providerType, modelName] = modelPair;

  try {
    const provider = await getProviderInstance(providerType);
    if (!provider) return fallback();

    const { result } = await provider.runStructuredLLM(
      {
        estimatedTokens: 0,
        purpose: "document_analysis" as const,
        systemPrompt: `You extract job postings from a job-board alert email (LinkedIn, Indeed, Glassdoor, StepStone, Xing...).
Return every distinct posting listed. Copy each posting's URL verbatim from the body. Skip promotional, "upgrade", course, profile-tip and unsubscribe links. If the email lists no postings, return an empty array.
Return strictly conforming JSON matching the schema.`,
        userPrompt: `Email Sender: ${email.sender}
Subject: ${email.subject}
Body:
${body}`,
      },
      { model: modelName, temperature: 0.1 },
      JobListingsSchema,
      "JobListingsSchema"
    );

    const seen = new Set<string>();
    const listings: ListingInput[] = [];
    for (const l of result.listings) {
      if (!/^https?:\/\//i.test(l.url) || !l.title.trim()) continue;
      const url = normalizeListingUrl(l.url);
      if (seen.has(url)) continue;
      seen.add(url);
      listings.push({
        title: l.title.trim(),
        companyName: l.companyName?.trim() || null,
        location: l.location?.trim() || null,
        url,
        source: detectSource(url),
        postedText: l.postedText?.trim() || null,
      });
    }
    // An empty LLM answer on a real digest is more likely a miss than a truly empty one.
    return listings.length > 0 ? listings : fallback();
  } catch (err) {
    logger.error("LLM listing extraction failed, using regex fallback", {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback();
  }
}
