let DOMPurify: (typeof import("dompurify"))["default"] | null = null;

if (typeof window !== "undefined") {
  import("dompurify").then((module) => {
    DOMPurify = module.default;
  });
}

export function isHtml(value: string) {
  return /<[^>]+>/.test(value);
}

export function sanitizeHtml(html: string) {
  if (typeof window === "undefined" || !DOMPurify) {
    // Server-side: do a simple tag-strip fallback
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "");
  }

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
