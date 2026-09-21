import { describe, expect, it } from "vitest";

import {
  senderDomain,
  senderName,
  senderPlatform,
} from "@/lib/email/senderDomain";

describe("senderDomain", () => {
  // Senders as they appear in real tracked emails.
  it.each([
    ["LinkedIn <jobs-noreply@linkedin.com>", "linkedin.com"],
    ["Reonic Talent Team <no-reply@ashbyhq.com>", "ashbyhq.com"],
    ["Zentio Recruiting Team <no-reply@msg.join.com>", "join.com"],
    ["XING <mailrobot@mail.xing.com>", "xing.com"],
    ['"acemate.ai Recruiting Team" <no-reply@msg.join.com>', "join.com"],
    ["no-reply@greenhouse.io", "greenhouse.io"],
    ["Recruiting <jobs@careers.bbc.co.uk>", "bbc.co.uk"],
  ])("%s → %s", (sender, expected) => {
    expect(senderDomain(sender)).toBe(expected);
  });

  it("returns null when there is no address", () => {
    expect(senderDomain("just a name")).toBeNull();
  });
});

describe("senderName", () => {
  it("strips quotes and the address", () => {
    expect(
      senderName('"acemate.ai Recruiting Team" <no-reply@msg.join.com>')
    ).toBe("acemate.ai Recruiting Team");
    expect(senderName("no-reply@greenhouse.io")).toBe("no-reply@greenhouse.io");
  });
});

describe("senderPlatform", () => {
  it("names a known board and any other relay by its domain", () => {
    expect(
      senderPlatform("LinkedIn <jobs-noreply@linkedin.com>", "Jobgether")
    ).toEqual({
      url: "https://linkedin.com",
      label: "LinkedIn",
    });
    expect(senderPlatform("Reonic <no-reply@ashbyhq.com>", "Reonic")).toEqual({
      url: "https://ashbyhq.com",
      label: "ashbyhq.com",
    });
  });

  it("skips the badge when the sender is the company itself", () => {
    expect(senderPlatform("Recruiting <jobs@stripe.com>", "Stripe")).toBeNull();
    expect(
      senderPlatform("Amazon <jobs@amazon.com>", "Amazon Web Services (AWS)")
    ).toBeNull();
  });

  it("skips personal mail providers", () => {
    expect(
      senderPlatform("Jane <jane.recruiter@gmail.com>", "Acme")
    ).toBeNull();
  });

  it("does not treat a short name as a match for everything", () => {
    expect(senderPlatform("X <a@linkedin.com>", "In")).not.toBeNull();
  });
});
