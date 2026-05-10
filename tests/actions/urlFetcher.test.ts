/**
 * URL Fetcher Action Tests
 *
 * Tests for the fetchJobDescriptionFromUrl server action.
 * Tests both mocked and real HTTP scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { fetchJobDescriptionFromUrl } from "@/actions/urlFetcher";

describe("URL Fetcher Actions", () => {
  // Store original fetch
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("fetchJobDescriptionFromUrl", () => {
    it("should return error for invalid URL format", async () => {
      const result = await fetchJobDescriptionFromUrl("not-a-valid-url");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid URL format");
    });

    it("should return error for non-http protocols", async () => {
      const result = await fetchJobDescriptionFromUrl("ftp://example.com/job");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Only HTTP and HTTPS URLs");
    });

    it("should return error for file protocol", async () => {
      const result = await fetchJobDescriptionFromUrl("file:///etc/passwd");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Only HTTP and HTTPS URLs");
    });

    it("should fetch and extract content from valid HTML page", async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Job Posting</title>
            <style>body { color: red; }</style>
            <script>console.log('test');</script>
          </head>
          <body>
            <h1>Senior Software Engineer</h1>
            <p>We are looking for a talented engineer to join our team.</p>
            <p>Requirements: 5+ years experience with React and Node.js.</p>
            <!-- This is a comment -->
          </body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
        text: async () => mockHtml,
      } as Response);

      const result = await fetchJobDescriptionFromUrl(
        "https://example.com/job-posting"
      );

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content).toContain("Senior Software Engineer");
      expect(result.content).toContain("talented engineer");
      expect(result.content).not.toContain("<script>");
      expect(result.content).not.toContain("<style>");
      expect(result.content).not.toContain("<!--");
    });

    it("should handle HTML entities correctly", async () => {
      const mockHtml = `
        <html>
          <body>
            <p>Salary: $100,000 & benefits</p>
            <p>Location: San&nbsp;Francisco</p>
            <p>Apply if 5 < years experience > 10</p>
          </body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      } as Response);

      const result = await fetchJobDescriptionFromUrl(
        "https://example.com/job"
      );

      expect(result.success).toBe(true);
      expect(result.content).toContain("$100,000 & benefits");
      expect(result.content).toContain("San Francisco");
      expect(result.content).toContain("5 < years experience > 10");
    });

    it("should return error for non-OK HTTP status", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers({}),
        text: async () => "Not found",
      } as Response);

      const result = await fetchJobDescriptionFromUrl(
        "https://example.com/nonexistent"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("404");
      expect(result.error).toContain("Not Found");
    });

    it("should return error for non-HTML content type", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => '{"error": "not html"}',
      } as Response);

      const result = await fetchJobDescriptionFromUrl(
        "https://example.com/api/job"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("does not point to an HTML page");
    });

    it("should return error when content is too short", async () => {
      const mockHtml = "<html><body>Hi</body></html>";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      } as Response);

      const result = await fetchJobDescriptionFromUrl(
        "https://example.com/empty"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Could not extract meaningful content");
    });

    it("should handle network errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await fetchJobDescriptionFromUrl(
        "https://example.com/job"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to fetch URL");
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("The operation was aborted");
      timeoutError.name = "TimeoutError";

      global.fetch = vi.fn().mockRejectedValue(timeoutError);

      const result = await fetchJobDescriptionFromUrl(
        "https://slow.example.com/job"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("timed out");
    });

    it("should pass correct headers in request", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () =>
          "<html><body>Job content here that is long enough</body></html>",
      } as Response);

      global.fetch = mockFetch;

      await fetchJobDescriptionFromUrl("https://example.com/job");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/job",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("Mozilla"),
          }),
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("should handle URLs with query parameters", async () => {
      const mockHtml =
        "<html><body>Job posting with query params that is long enough</body></html>";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      } as Response);

      const result = await fetchJobDescriptionFromUrl(
        "https://example.com/job?id=123&source=linkedin"
      );

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/job?id=123&source=linkedin",
        expect.any(Object)
      );
    });

    it("should handle URLs with fragments", async () => {
      const mockHtml =
        "<html><body>Job posting with fragment that is long enough</body></html>";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      } as Response);

      const result = await fetchJobDescriptionFromUrl(
        "https://example.com/job#section"
      );

      expect(result.success).toBe(true);
    });

    it("should handle empty HTML body", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => "<html></html>",
      } as Response);

      const result = await fetchJobDescriptionFromUrl(
        "https://example.com/empty"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Could not extract meaningful content");
    });

    it("should handle complex nested HTML structures", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="job-posting">
              <h1>Software Engineer</h1>
              <div class="description">
                <p>Join our <strong>amazing</strong> team!</p>
                <ul>
                  <li>Build scalable systems</li>
                  <li>Work with <em>modern</em> tech</li>
                </ul>
              </div>
            </div>
          </body>
        </html>
      `;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => mockHtml,
      } as Response);

      const result = await fetchJobDescriptionFromUrl(
        "https://example.com/job"
      );

      expect(result.success).toBe(true);
      expect(result.content).toContain("Software Engineer");
      expect(result.content).toContain("amazing");
      expect(result.content).toContain("Build scalable systems");
    });

    it("should handle unknown errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue("Unknown error type");

      const result = await fetchJobDescriptionFromUrl(
        "https://example.com/job"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("unknown error");
    });
  });
});
