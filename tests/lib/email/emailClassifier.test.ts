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
