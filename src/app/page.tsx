import Link from "next/link";

import { prisma } from "@/lib/prisma";

import JobTableClient from "./components/JobTableClient";

export default async function Home() {
  const jobList = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  const totalApplied = jobList.filter((j) => j.status !== "DRAFT").length;
  const interviews = jobList.filter((j) => j.status === "INTERVIEW").length;
  const offers = jobList.filter((j) => j.status === "OFFER").length;
  const successRate =
    totalApplied > 0 ? Math.round((offers / totalApplied) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--color-agent-on-bg)" }}
          >
            Job Dashboard
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Manage your active applications and generated assets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--color-agent-outline-variant)",
              color: "var(--color-agent-on-surface-variant)",
              background: "var(--color-agent-surface-lowest)",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Export Report
          </button>
          <Link
            href="/job/new"
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background:
                "linear-gradient(135deg, var(--color-agent-primary), var(--color-agent-primary-container))",
              color: "var(--color-agent-on-primary)",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Quick Draft
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Applied"
          value={totalApplied}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          }
        />
        <StatCard
          label="Interviews"
          value={interviews}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />
      </div>

      {/* Recent applications section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Recent Applications
          </h2>
          <Link
            href="/job/new"
            className="flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--color-agent-primary)" }}
          >
            Show All Applications
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
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
        <JobTableClient jobs={jobList} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--color-agent-surface-lowest)",
        boxShadow: "var(--shadow-agent-card)",
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-sm font-medium"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          {label}
        </p>
        <div
          className="rounded-xl p-2"
          style={{
            background: "var(--color-agent-surface-container)",
            color: "var(--color-agent-primary)",
          }}
        >
          {icon}
        </div>
      </div>
      <p
        className="mt-3 text-3xl font-bold"
        style={{ color: "var(--color-agent-on-surface)" }}
      >
        {value}
      </p>
    </div>
  );
}
