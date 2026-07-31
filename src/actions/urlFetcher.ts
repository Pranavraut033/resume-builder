"use server";

import dns from "node:dns";

/**
 * Server action to fetch and extract job description content from a URL
 * Uses server-side fetch to avoid CORS issues and perform basic HTML parsing
 */

interface FetchUrlResult {
  success: boolean;
  content?: string;
  error?: string;
}

const MAX_REDIRECTS = 5;
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * Resolves a hostname's IP address(es) and checks whether any of them fall
 * into a loopback, private (RFC1918), link-local/cloud-metadata, or IPv6
 * unique-local/link-local range. Used to block SSRF to internal/metadata
 * services before (and after each redirect of) an outbound fetch.
 */
async function isPrivateOrDisallowedHost(hostname: string): Promise<boolean> {
  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, {
      all: true,
      verbatim: true,
    });
  } catch {
    // If DNS resolution fails, treat as disallowed - we can't verify safety.
    return true;
  }

  if (addresses.length === 0) {
    return true;
  }

  return addresses.some(({ address, family }) =>
    family === 6 ? isDisallowedIpv6(address) : isDisallowedIpv4(address)
  );
}

function isDisallowedIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    // Not a well-formed IPv4 literal - be conservative and disallow.
    return true;
  }
  const [a, b] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (RFC1918)
  if (a === 10) return true;
  // 172.16.0.0/12 (RFC1918)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (RFC1918)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (link-local, includes cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  return false;
}

function isDisallowedIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  // ::1 (loopback)
  if (normalized === "::1") return true;
  // IPv4-mapped IPv6 addresses - check the embedded IPv4 range too.
  const ipv4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Mapped) {
    return isDisallowedIpv4(ipv4Mapped[1]);
  }
  // fc00::/7 (unique local addresses)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  // fe80::/10 (link-local)
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;

  return false;
}

/**
 * Validates that a URL is safe to fetch: allowed protocol and a hostname
 * that does not resolve to a private/loopback/link-local/metadata address.
 */
async function validateUrlIsSafe(
  candidate: URL
): Promise<{ safe: true } | { safe: false; error: string }> {
  if (!ALLOWED_PROTOCOLS.includes(candidate.protocol)) {
    return {
      safe: false,
      error: "Only HTTP and HTTPS URLs are supported.",
    };
  }

  const disallowed = await isPrivateOrDisallowedHost(candidate.hostname);
  if (disallowed) {
    return {
      safe: false,
      error: "This URL points to a disallowed or internal network address.",
    };
  }

  return { safe: true };
}

/**
 * Fetches content from a URL and extracts text content
 * This is a basic implementation that strips HTML tags
 * For production, consider using cheerio or similar for better extraction
 */
export async function fetchJobDescriptionFromUrl(
  url: string
): Promise<FetchUrlResult> {
  try {
    // Validate URL format
    let validatedUrl: URL;
    try {
      validatedUrl = new URL(url);
    } catch {
      return {
        success: false,
        error: "Invalid URL format. Please enter a valid URL.",
      };
    }

    const initialCheck = await validateUrlIsSafe(validatedUrl);
    if (!initialCheck.safe) {
      return { success: false, error: initialCheck.error };
    }

    // Manually follow redirects, re-validating each hop's target so an
    // attacker can't bypass the SSRF check by redirecting to an internal
    // address after the initial URL passes validation.
    let response: Response | undefined;
    let currentUrl = validatedUrl;

    for (
      let redirectCount = 0;
      redirectCount <= MAX_REDIRECTS;
      redirectCount++
    ) {
      response = await fetch(currentUrl.toString(), {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const isRedirect = response.status >= 300 && response.status < 400;
      if (!isRedirect) {
        break;
      }

      const location = response.headers.get("location");
      if (!location) {
        return {
          success: false,
          error: "Received a redirect without a Location header.",
        };
      }

      let nextUrl: URL;
      try {
        nextUrl = new URL(location, currentUrl);
      } catch {
        return {
          success: false,
          error: "Redirect target is not a valid URL.",
        };
      }

      const redirectCheck = await validateUrlIsSafe(nextUrl);
      if (!redirectCheck.safe) {
        return { success: false, error: redirectCheck.error };
      }

      currentUrl = nextUrl;

      if (redirectCount === MAX_REDIRECTS) {
        return {
          success: false,
          error: "Too many redirects.",
        };
      }
    }

    if (!response) {
      return {
        success: false,
        error: "Failed to fetch URL.",
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
      };
    }

    // Get the content type
    const contentType = response.headers.get("content-type") || "";

    // Check if it's HTML
    if (!contentType.includes("text/html")) {
      return {
        success: false,
        error: "URL does not point to an HTML page.",
      };
    }

    const html = await response.text();

    // Prefer the semantic <main> region when the page has one - drops global
    // nav, cookie banners, and sign-in prompts that sit outside it (as on
    // LinkedIn's public job pages). Falls back to the full page otherwise.
    // ponytail: takes the first <main>...last </main> span, not proper DOM
    // parsing - fine for the common single-<main> case, would need a real
    // parser (e.g. jsdom) for pages that nest more than one.
    const mainStart = html.search(/<main\b/i);
    const mainEnd = html.toLowerCase().lastIndexOf("</main>");
    const mainContent =
      mainStart !== -1 && mainEnd > mainStart
        ? html.slice(mainStart, mainEnd)
        : html;

    // Basic text extraction - remove script/style tags and strip HTML
    const textContent = mainContent
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove style tags and their content
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Drop nav/header/footer/aside/form chrome (site nav, cookie banners,
      // related-jobs rails, sign-in prompts) - not part of the job
      // description itself.
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "")
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "")
      // Remove all HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode common HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Remove multiple spaces
      .replace(/\s+/g, " ")
      // Trim
      .trim();

    if (!textContent || textContent.length < 50) {
      return {
        success: false,
        error: "Could not extract meaningful content from the URL.",
      };
    }

    return {
      success: true,
      content: textContent,
    };
  } catch (error) {
    console.error("Error fetching URL:", error);

    if (error instanceof Error) {
      if (error.name === "TimeoutError") {
        return {
          success: false,
          error: "Request timed out. Please try again.",
        };
      }
      return {
        success: false,
        error: `Failed to fetch URL: ${error.message}`,
      };
    }

    return {
      success: false,
      error: "An unknown error occurred while fetching the URL.",
    };
  }
}
