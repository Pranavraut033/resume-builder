/**
 * Builds an export filename like `Firstname_Lastname_Company_Resume.pdf`.
 * Whitespace-separated name/company parts are joined with `_`; characters
 * that are invalid in filenames are removed and repeated `_` collapsed.
 */
export function exportFilename(
  name: string | undefined,
  company: string | undefined,
  kind: "resume" | "cover-letter"
): string {
  const suffix = kind === "resume" ? "Resume" : "Cover_Letter";
  const split = (s: string | undefined) =>
    (s ?? "").split(/\s+/).filter(Boolean);
  const parts = [...split(name), ...split(company), suffix];
  const base = parts
    .join("_")
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "")
    .replace(/_+/g, "_");
  return `${base}.pdf`;
}
