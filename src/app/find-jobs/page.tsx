"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SelectedModelCard } from "@/components/SelectedModelCard";

export default function FindJobsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const canSubmit = query.trim().length > 0 && location.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const params = new URLSearchParams({
      query: query.trim(),
      location: location.trim(),
    });
    router.push(`/find-jobs/browse?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col overflow-y-auto bg-(--color-agent-bg)">
      <main className="flex flex-1 items-start justify-center gap-8 px-6 py-10 lg:px-12">
        {/* ── Left column: form ── */}
        <div className="w-full max-w-2xl">
          {/* Back to dashboard */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Dashboard
          </Link>

          <h1
            className="mb-1 text-3xl font-bold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Find Jobs
          </h1>
          <p
            className="mb-8 text-sm"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Search across Google Jobs, LinkedIn, Indeed, and Glassdoor — all
            inside the app. Add any listing to your tracker with one click.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Job title / keywords */}
            <div className="space-y-1.5">
              <label
                htmlFor="query"
                className="text-xs font-medium tracking-widest uppercase"
                style={{ color: "var(--color-agent-on-surface-variant)" }}
              >
                Job Title / Keywords
              </label>
              <input
                id="query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                required
                className="w-full rounded-xl border px-4 py-3 text-sm transition outline-none"
                style={{
                  background: "var(--color-agent-surface-lowest)",
                  borderColor: "var(--color-agent-outline-variant)",
                  color: "var(--color-agent-on-surface)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor =
                    "var(--color-agent-primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor =
                    "var(--color-agent-outline-variant)")
                }
                placeholder="e.g. Backend Engineer TypeScript"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label
                htmlFor="location"
                className="text-xs font-medium tracking-widest uppercase"
                style={{ color: "var(--color-agent-on-surface-variant)" }}
              >
                Location
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full rounded-xl border px-4 py-3 text-sm transition outline-none"
                style={{
                  background: "var(--color-agent-surface-lowest)",
                  borderColor: "var(--color-agent-outline-variant)",
                  color: "var(--color-agent-on-surface)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor =
                    "var(--color-agent-primary)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor =
                    "var(--color-agent-outline-variant)")
                }
                placeholder="e.g. Berlin, Germany or Remote"
              />
            </div>

            {/* Info strip */}
            <div
              className="flex items-start gap-3 rounded-xl border px-4 py-3"
              style={{
                background: "var(--color-agent-surface-low)",
                borderColor: "var(--color-agent-primary-fixed)",
              }}
            >
              <span className="mt-0.5 text-base">🔍</span>
              <div>
                <p
                  className="mb-0.5 text-xs font-semibold tracking-wide uppercase"
                  style={{ color: "var(--color-agent-primary)" }}
                >
                  How it works
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--color-agent-on-surface-variant)" }}
                >
                  We open Google Jobs, LinkedIn, Indeed, and Glassdoor in
                  separate tabs with your search pre-filled. Browse listings,
                  then hit &ldquo;Add to Tracker&rdquo; on any job to
                  auto-analyze it with AI and save it to your dashboard.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--color-agent-primary)" }}
            >
              Search Jobs
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </form>
        </div>

        {/* ── Right column: model card ── */}
        <div className="hidden w-72 shrink-0 lg:block">
          <SelectedModelCard />
        </div>
      </main>
    </div>
  );
}
