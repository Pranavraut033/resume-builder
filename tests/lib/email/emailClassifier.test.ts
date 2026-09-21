import { describe, it, expect, vi } from "vitest";
import {
  classifyEmail,
  classifyEmailHeuristically,
  EmailToClassify,
} from "@/lib/llm/emailClassifier";
import { useModelStore } from "@/store/modelStore";

vi.mock("@/store/modelStore", () => ({
  useModelStore: { getState: vi.fn() },
}));

describe("classifyEmailHeuristically — job alerts", () => {
  it.each([
    ["LinkedIn <jobalerts-noreply@linkedin.com>", "10 new jobs for you"],
    ["Indeed <alert@indeed.com>", "React Developer: 5 new jobs in Berlin"],
    ["StepStone <jobs@stepstone.de>", "Neue Jobs für Frontend Entwickler"],
    ["Glassdoor <noreply@glassdoor.com>", "Jobs matching your search"],
  ])("%s / '%s' → ALERT with no stage", (sender, subject) => {
    const result = classifyEmailHeuristically({ sender, subject, snippet: "" });
    expect(result.kind).toBe("ALERT");
    expect(result.stage).toBeNull();
    expect(result.actionRequired).toBe(false);
    // 0.7 → trusted without an LLM call
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("does not stage an alert whose subject says 'interview'", () => {
    const result = classifyEmailHeuristically({
      sender: "LinkedIn <jobalerts-noreply@linkedin.com>",
      subject: "New jobs: Interview Coach at Acme",
      snippet: "",
    });
    expect(result.kind).toBe("ALERT");
    expect(result.stage).toBeNull();
  });

  it("keeps LinkedIn application-sent emails as APPLICATION", () => {
    const result = classifyEmailHeuristically({
      sender: "LinkedIn <jobs-noreply@linkedin.com>",
      subject: "Pranav, your application was sent to Stripe",
      snippet: "Your application was sent to Stripe",
    });
    expect(result.kind).toBe("APPLICATION");
    expect(result.stage).toBe("APPLIED");
  });
});

describe("classifyEmailHeuristically — LinkedIn relays", () => {
  const applied = (company: string): EmailToClassify => ({
    sender: "LinkedIn <jobs-noreply@linkedin.com>",
    subject: `Pranav, your application was sent to ${company}`,
    snippet: `Your application was sent to ${company}`,
  });
  const alert = (subject: string): EmailToClassify => ({
    sender: "LinkedIn Job Alerts <jobalerts-noreply@linkedin.com>",
    subject,
    snippet: "Next steps: View job details and apply if interested",
  });

  it.each([
    ["Jobgether", "Jobgether"],
    ["FemTechConf®", "FemTechConf"],
    ["SWAKIO™", "SWAKIO"],
  ])("application sent to %s → company %s, APPLIED", (raw, company) => {
    const result = classifyEmailHeuristically(applied(raw));

    expect(result.companyName).toBe(company);
    expect(result.stage).toBe("APPLIED");
    expect(result.isRecruitingEmail).toBe(true);
    // 0.7 means classifyEmail trusts it without an LLM call
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it.each([
    [
      "Working Student – Applied AI (all genders) at Boston Consulting Group (BCG)",
      "Boston Consulting Group (BCG)",
    ],
    [
      "2026 Applied Scientist Intern, Amazon University Talent Acquisition at Amazon",
      "Amazon",
    ],
    [
      "Student Service und Event Specialist Berlin (m/w/d) at IU International University of Applied Sciences",
      "IU International University of Applied Sciences",
    ],
  ])("job alert subject '%s' → company %s", (subject, company) => {
    expect(classifyEmailHeuristically(alert(subject)).companyName).toBe(
      company
    );
  });

  it("does not invent a company when the subject names none", () => {
    const result = classifyEmailHeuristically({
      sender: "LinkedIn <messages-noreply@linkedin.com>",
      subject: "View Manisha Jain’s post and your next steps",
      snippet: "Next steps: Explore and apply to job opportunities",
    });

    expect(result.companyName).toBeNull();
  });

  it("does not mistake a word ending in 'at' for the 'at <company>' marker", () => {
    const result = classifyEmailHeuristically({
      sender: "Format Lab <hello@formatlab.com>",
      subject: "Your application",
      snippet: "Thanks for applying",
    });

    expect(result.companyName).toBeNull();
  });
});

describe("classifyEmailHeuristically", () => {
  it("detects interview invitation emails", () => {
    const email: EmailToClassify = {
      sender: "recruiting@stripe.com",
      subject: "Stripe Interview Invitation: Software Engineer",
      snippet:
        "Hi John, we'd love to schedule a phone screen with you to discuss the role.",
    };

    const result = classifyEmailHeuristically(email);
    expect(result.isRecruitingEmail).toBe(true);
    expect(result.stage).toBe("INTERVIEW");
    expect(result.actionRequired).toBe(true);
  });

  it("detects rejection emails", () => {
    const email: EmailToClassify = {
      sender: "no-reply@greenhouse-mail.io",
      subject: "Your application to Figma",
      snippet:
        "Thank you for applying. Unfortunately, after careful consideration, we will not be moving forward with your application.",
    };

    const result = classifyEmailHeuristically(email);
    expect(result.isRecruitingEmail).toBe(true);
    expect(result.stage).toBe("REJECTED");
    expect(result.actionRequired).toBe(false);
  });

  it("detects online assessment emails", () => {
    const email: EmailToClassify = {
      sender: "jobs@datadoghq.com",
      subject: "Datadog Online Assessment: Next Steps",
      snippet:
        "Please complete this HackerRank coding challenge within the next 5 days.",
    };

    const result = classifyEmailHeuristically(email);
    expect(result.isRecruitingEmail).toBe(true);
    expect(result.stage).toBe("ASSESSMENT");
    expect(result.actionRequired).toBe(true);
  });

  it("detects job offers", () => {
    const email: EmailToClassify = {
      sender: "talent@airbnb.com",
      subject: "Congratulations! Airbnb Offer Letter",
      snippet:
        "We are pleased to offer you the position of Senior Frontend Engineer.",
    };

    const result = classifyEmailHeuristically(email);
    expect(result.isRecruitingEmail).toBe(true);
    expect(result.stage).toBe("OFFER");
    expect(result.actionRequired).toBe(true);
  });

  it("detects application confirmations", () => {
    const email: EmailToClassify = {
      sender: "careers@uber.com",
      subject: "Thank you for applying to Uber",
      snippet:
        "We received your application for Staff Engineer and our team is reviewing it.",
    };

    const result = classifyEmailHeuristically(email);
    expect(result.isRecruitingEmail).toBe(true);
    expect(result.stage).toBe("APPLIED");
  });

  it("ignores non-recruiting emails", () => {
    const email: EmailToClassify = {
      sender: "newsletter@medium.com",
      subject: "Weekly Top Stories in Tech",
      snippet:
        "Here are the top trending articles recommended for you this week.",
    };

    const result = classifyEmailHeuristically(email);
    expect(result.isRecruitingEmail).toBe(false);
    expect(result.stage).toBeNull();
  });
});

describe("classifyEmail", () => {
  it("trusts a confident heuristic result without consulting the model store", async () => {
    const getState = vi.mocked(useModelStore.getState);

    const email: EmailToClassify = {
      sender: "talent@airbnb.com",
      subject: "Congratulations! Airbnb Offer Letter",
      snippet:
        "We are pleased to offer you the position of Senior Frontend Engineer.",
    };

    const result = await classifyEmail(email);
    expect(result.stage).toBe("OFFER");
    // Confident heuristic short-circuits before ever reading the model pair.
    expect(getState).not.toHaveBeenCalled();
  });

  it("falls back to heuristics when the heuristic is low-confidence and no model is configured", async () => {
    vi.mocked(useModelStore.getState).mockReturnValue({
      getEmailModelPair: () => null,
    } as unknown as ReturnType<typeof useModelStore.getState>);

    const email: EmailToClassify = {
      sender: "newsletter@medium.com",
      subject: "Weekly Top Stories in Tech",
      snippet:
        "Here are the top trending articles recommended for you this week.",
    };

    const result = await classifyEmail(email);
    expect(result.isRecruitingEmail).toBe(false);
  });
});
