import dns from "node:dns";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchJobDescriptionFromUrl } from "./urlFetcher";

vi.mock("node:dns", () => ({
  default: {
    promises: {
      lookup: vi.fn(),
    },
  },
}));

const mockedLookup = dns.promises.lookup as unknown as ReturnType<typeof vi.fn>;

describe("fetchJobDescriptionFromUrl", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("rejects a request to a resolved loopback IP without calling fetch", async () => {
    mockedLookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fetchJobDescriptionFromUrl("http://localhost.example.com/job");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/disallowed|internal/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a request to a resolved RFC1918 private IP without calling fetch", async () => {
    mockedLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fetchJobDescriptionFromUrl("http://internal.example.com/job");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/disallowed|internal/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a request to the cloud metadata link-local address", async () => {
    mockedLookup.mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fetchJobDescriptionFromUrl("http://metadata.example.com/latest/meta-data");

    expect(result.success).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects when a public host redirects to a private IP", async () => {
    // First lookup: the initial public host resolves to a public IP.
    // Second lookup: the redirect target resolves to a private IP.
    mockedLookup
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValueOnce([{ address: "10.0.0.5", family: 4 }]);

    const fetchSpy = vi.fn().mockResolvedValueOnce({
      status: 302,
      ok: false,
      headers: new Headers({ location: "http://internal.example.com/secret" }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fetchJobDescriptionFromUrl("http://public.example.com/job");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/disallowed|internal/i);
    // Only the initial hop should have hit fetch; the redirect target must
    // be blocked before a second fetch is issued.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("allows a normal public host through and returns extracted content", async () => {
    mockedLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);

    const html =
      "<html><head><style>body{color:red}</style></head><body><script>evil()</script>" +
      "<h1>Senior Software Engineer</h1><p>We are looking for a skilled engineer to join our team " +
      "and build great products for our customers around the world.</p></body></html>";

    const fetchSpy = vi.fn().mockResolvedValueOnce({
      status: 200,
      ok: true,
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      text: async () => html,
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fetchJobDescriptionFromUrl("http://public.example.com/job");

    expect(result.success).toBe(true);
    expect(result.content).toContain("Senior Software Engineer");
    expect(result.content).not.toContain("evil()");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  });
});
