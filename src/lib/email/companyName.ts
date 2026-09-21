/**
 * Best-effort company for mail where the sender is a platform, not the
 * employer (LinkedIn relays "your application was sent to X"; its job alerts
 * end "<role> at X"), falling back to "Recruiting at Figma <…>" display names.
 */
export function extractCompanyName(email: {
  sender: string;
  subject: string;
}): string | null {
  const clean = (name: string) => name.replace(/[®™©\s]+$/u, "").trim() || null;

  const sentTo = email.subject.match(/application (?:was )?sent to\s+(.+)$/i);
  if (sentTo) return clean(sentTo[1]);

  // A bare " at " is too common in ordinary subjects ("call at 3pm"); only
  // trust it on LinkedIn's alert format.
  if (/linkedin/i.test(email.sender)) {
    const at = email.subject.match(/.*\sat\s+(.+)$/i);
    if (at) return clean(at[1]);
  }

  const fromName = email.sender.match(/\bat\s+([A-Za-z0-9\s]+?)(?:<|$|\()/i);
  return fromName ? clean(fromName[1]) : null;
}
