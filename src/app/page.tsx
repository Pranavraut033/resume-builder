"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { getAllJob } from "@/actions/job";
import ArrowRightIcon from "@/components/icons/ArrowRightIcon";
import BoltIcon from "@/components/icons/BoltIcon";
import CalendarIcon from "@/components/icons/CalendarIcon";
import SendIcon from "@/components/icons/SendIcon";
import TrendingUpIcon from "@/components/icons/TrendingUpIcon";
import { useProfileSelection } from "@/hooks/useProfileSelection";

import JobTableClient from "../components/home/JobTableClient";

export default function Home() {
  const { selectedProfileId } = useProfileSelection();
  const { data: jobList = [] } = useQuery({
    queryKey: ["jobs", selectedProfileId],
    queryFn: () => getAllJob(selectedProfileId),
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
          {/* <button
            type="button"
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--color-agent-outline-variant)",
              color: "var(--color-agent-on-surface-variant)",
              background: "var(--color-agent-surface-lowest)",
            }}
          >
            <UploadIcon width="15" height="15" />
            Export Report
          </button> */}
          <Link
            href="/job/new"
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background:
                "linear-gradient(135deg, var(--color-agent-primary), var(--color-agent-primary-container))",
              color: "var(--color-agent-on-primary)",
            }}
          >
            <BoltIcon width="15" height="15" />
            Quick Draft
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Applied"
          value={totalApplied}
          icon={<SendIcon width="18" height="18" />}
        />
        <StatCard
          label="Interviews"
          value={interviews}
          icon={<CalendarIcon width="18" height="18" />}
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          icon={<TrendingUpIcon width="18" height="18" />}
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
            <ArrowRightIcon width="14" height="14" />
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
    <div className="shadow-agent-card bg-agent-surface-low border-agent-outline-variant rounded-2xl border p-5">
      <div className="flex items-center justify-between">
        <p className="text-agent-on-surface-variant text-sm font-medium">
          {label}
        </p>
        <div className="bg-agent-surface-container text-agent-primary rounded-xl p-2">
          {icon}
        </div>
      </div>
      <p className="text-agent-on-surface mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}
