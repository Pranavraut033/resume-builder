"use server";

/**
 * Server action to fetch and extract job description content from a URL
 * Uses server-side fetch to avoid CORS issues and perform basic HTML parsing
 */

interface FetchUrlResult {
  success: boolean;
  content?: string;
  error?: string;
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

    // Only allow http/https protocols
    if (!["http:", "https:"].includes(validatedUrl.protocol)) {
      return {
        success: false,
        error: "Only HTTP and HTTPS URLs are supported.",
      };
    }

    // Fetch the URL content
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

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

    // Basic text extraction - remove script/style tags and strip HTML
    const textContent = html
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove style tags and their content
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
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
