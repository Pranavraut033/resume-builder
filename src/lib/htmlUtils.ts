export function isHtml(value: string) {
  return /<[^>]+>/.test(value);
}

export function sanitizeHtml(html: string) {
  if (typeof window === "undefined") {
    // Server-side: do a simple tag-strip fallback
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "");
  }

  // Import DOMPurify lazily on client
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const DOMPurify = require("dompurify");
  return DOMPurify.sanitize(html);
}

export function htmlToPlainText(html: string) {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html.replace(/<[^>]+>/g, "");
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent || "";
}
