/**
 * Cover-letter date line. Shared by the DOM preview (all nine
 * `src/components/job/templates/coverLetter/*.tsx`), the PDF export (all
 * nine `src/lib/pdf/templates/*CoverLetterPDF.tsx`), and TXT export
 * (`src/lib/resumeToText.ts`) — previously each one formatted the date
 * itself and they all disagreed.
 *
 * `format` is the user's `Customization.dateFormat` pick (`src/lib/date.ts`).
 * Under the default `"locale"`, the date follows the same DE/EU-default
 * region signal `resolveRegionGuidance` uses for the LLM prompts — a
 * German/EU application dates "13.08.2026", a US/UK/etc one dates
 * "August 13, 2026".
 */
import { DateFormat } from "@/lib/date";
import { isGermanEuJob } from "@/lib/llm/prompts/regionGuidance";
import { JobDetailsJSON } from "@/types/resume";

export function formatCoverLetterDate(
  jobDetails: JobDetailsJSON | null | undefined,
  format: DateFormat = "locale"
): string {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();

  switch (format) {
    case "MMM yyyy":
      return today.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    case "MM/yyyy":
      return `${mm}/${dd}/${yyyy}`;
    case "yyyy-MM":
      return `${yyyy}-${mm}-${dd}`;
    case "MM.yyyy":
      return `${dd}.${mm}.${yyyy}`;
    case "locale":
    default:
      return isGermanEuJob(jobDetails)
        ? today.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : today.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
  }
}
