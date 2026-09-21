import { detectSource } from "@/lib/email/listingUrl";

// Address-only providers: a mail from one says nothing about which platform sent it.
const MAIL_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

// Second-level labels that make a registrable domain three parts (bbc.co.uk).
const SECOND_LEVEL = new Set(["co", "com", "org", "net", "ac", "gov"]);

const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
  stepstone: "StepStone",
  xing: "Xing",
  jobware: "Jobware",
};

/** `"Name" <a@b.com>` or bare `a@b.com` → the address. */
function senderAddress(sender: string): string | null {
  return (
    sender.match(/<([^<>\s]+@[^<>\s]+)>/)?.[1] ??
    sender.match(/[^\s<>"]+@[^\s<>"]+/)?.[0] ??
    null
  );
}

/** Display name, without quotes — falls back to the address. */
export function senderName(sender: string): string {
  const name = sender
    .replace(/<[^>]*>/, "")
    .replace(/["']/g, "")
    .trim();
  return name || senderAddress(sender) || sender;
}

/** `no-reply@msg.join.com` → `join.com`; null if there's no usable address. */
export function senderDomain(sender: string): string | null {
  const host = senderAddress(sender)?.split("@")[1]?.toLowerCase();
  if (!host) return null;
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const keep =
    labels[labels.length - 1].length === 2 &&
    SECOND_LEVEL.has(labels[labels.length - 2])
      ? 3
      : 2;
  return labels.slice(-keep).join(".");
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The platform an email came through, for the corner badge on its company
 * avatar — LinkedIn relaying an application, an ATS like Ashby, a job board.
 * Null when the sender is just the company itself (its logo would duplicate the
 * avatar) or a personal mail provider.
 */
export function senderPlatform(
  sender: string,
  company: string | null
): { url: string; label: string } | null {
  const domain = senderDomain(sender);
  if (!domain || MAIL_PROVIDERS.has(domain)) return null;

  const root = norm(domain.split(".")[0]);
  const name = company ? norm(company) : "";
  if (
    root.length >= 3 &&
    name.length >= 3 &&
    (name.includes(root) || root.includes(name))
  ) {
    return null;
  }

  const source = detectSource(`https://${domain}`);
  return {
    url: `https://${domain}`,
    label: SOURCE_LABELS[source] ?? domain,
  };
}
