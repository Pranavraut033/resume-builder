import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmailCard } from "./EmailCard";

import type { TrackedEmail } from "@/actions/emailSync";

const email = (over: Partial<TrackedEmail> = {}): TrackedEmail =>
  ({
    id: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    messageId: "m1",
    threadId: "t1",
    sender: "LinkedIn <jobs-noreply@linkedin.com>",
    recipient: null,
    subject: "Pranav, your application was sent to Jobgether",
    snippet: "Your application was sent",
    bodyText: null,
    receivedAt: new Date(),
    stage: "APPLIED",
    companyName: "Jobgether",
    role: null,
    confidence: 0.7,
    nextSteps: null,
    actionRequired: false,
    hiddenAt: null,
    kind: "APPLICATION",
    jobId: null,
    companyId: null,
    job: null,
    ...over,
  }) as TrackedEmail;

const props = {
  jobs: [],
  onToggleHidden: vi.fn(),
  onStatusChange: vi.fn(),
  onLink: vi.fn(),
  onUnlink: vi.fn(),
};

describe("EmailCard avatar", () => {
  it("shows the company as a circle with the relaying platform badged on it", () => {
    const { container } = render(<EmailCard email={email()} {...props} />);

    expect(
      container.querySelector(".rounded-full.border-black\\/10")
    ).not.toBeNull();
    expect(screen.getByRole("img", { name: "From LinkedIn" })).toBeTruthy();
    expect(
      container.querySelector('img[src*="domain=linkedin.com"]')
    ).not.toBeNull();
  });

  it("badges an ATS by its own domain", () => {
    render(
      <EmailCard
        email={email({
          sender: "Reonic Talent Team <no-reply@ashbyhq.com>",
          companyName: "Reonic",
        })}
        {...props}
      />
    );
    expect(screen.getByRole("img", { name: "From ashbyhq.com" })).toBeTruthy();
  });

  it("omits the badge when the company emails directly", () => {
    render(
      <EmailCard
        email={email({
          sender: "Recruiting <jobs@stripe.com>",
          companyName: "Stripe",
        })}
        {...props}
      />
    );
    expect(screen.queryByRole("img", { name: /^From / })).toBeNull();
  });

  it("falls back to the sender's name when no company was extracted", () => {
    render(
      <EmailCard
        email={email({
          sender: '"Sleak Talent" <no-reply@msg.join.com>',
          companyName: null,
          subject: "Hello",
        })}
        {...props}
      />
    );
    // The sender's name stands in for the missing company (never "??").
    expect(screen.getByAltText("Sleak Talent logo")).toBeTruthy();
    expect(screen.getByRole("img", { name: "From join.com" })).toBeTruthy();
  });
});
