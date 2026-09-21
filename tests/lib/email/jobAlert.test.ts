import { describe, expect, it } from "vitest";

import { isJobAlert, JOB_ALERT_QUERY } from "@/lib/email/jobAlert";
import { classifyEmailHeuristically } from "@/lib/llm/emailClassifier";

describe("isJobAlert", () => {
  it.each([
    [
      "LinkedIn Job Alerts <jobalerts-noreply@linkedin.com>",
      "Senior Software Engineer job at Kaliper",
    ],
    [
      "ProDevs <hello@prodevs.io>",
      "New Job Request (₦400,000 - ₦500,000) - Mid-Level Frontend Engineer",
    ],
    ["Someone <x@example.com>", "A role that matches your profile"],
    ["Indeed <alert@indeed.com>", "React Developer: 5 new jobs in Berlin"],
  ])("%s / %s → alert", (sender, subject) => {
    expect(isJobAlert({ sender, subject })).toBe(true);
  });

  // Real rows from the tracker that must stay APPLICATION.
  it.each([
    [
      "XING <mailrobot@mail.xing.com>",
      "Your application files are now together in your profile",
    ],
    [
      "LinkedIn <jobs-noreply@linkedin.com>",
      "Pranav, your application was sent to Jobgether",
    ],
    [
      "Jobgether Talent Team <shortlist@jobgether.com>",
      "Next Steps for Your Job Application: Full Stack Software Engineer",
    ],
    ["StepStone <noreply@stepstone.de>", "Ihre Bewerbung bei Acme"],
  ])("%s / %s → not an alert", (sender, subject) => {
    expect(isJobAlert({ sender, subject })).toBe(false);
  });

  it("classifies the ProDevs and Kaliper examples as ALERT without staging them", () => {
    for (const email of [
      {
        sender: "ProDevs <hello@prodevs.io>",
        subject: "New Job Request (₦400,000) - Mid-Level Frontend Engineer",
        snippet: "Next Steps: 1. Review the full job details 2. Submit",
      },
      {
        sender: "LinkedIn Job Alerts <jobalerts-noreply@linkedin.com>",
        subject: "Senior Software Engineer job at Kaliper",
        snippet: "Your job alert for senior web developer",
      },
    ]) {
      const result = classifyEmailHeuristically(email);
      expect(result.kind).toBe("ALERT");
      expect(result.stage).toBeNull();
      expect(result.actionRequired).toBe(false);
    }
  });
});

describe("JOB_ALERT_QUERY", () => {
  it("covers the platform senders and the recommendation subjects", () => {
    expect(JOB_ALERT_QUERY).toContain("linkedin.com");
    expect(JOB_ALERT_QUERY).toContain("prodevs.io");
    expect(JOB_ALERT_QUERY).toContain('"new job request"');
  });
});
