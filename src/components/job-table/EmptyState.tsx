"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

export default function EmptyState() {
  return (
    <div
      className="rounded-2xl border-2 border-dashed p-10 text-center"
      style={{
        borderColor: "var(--color-agent-outline-variant)",
        background: "var(--color-agent-surface-low)",
      }}
    >
      <Icon
        name="fileText"
        size={32}
        className="mx-auto"
        color="var(--color-agent-outline)"
      />
      <p
        className="mt-4 text-lg font-semibold"
        style={{ color: "var(--color-agent-on-surface)" }}
      >
        Your journey starts here
      </p>
      <p
        className="mt-1 text-sm"
        style={{ color: "var(--color-agent-on-surface-variant)" }}
      >
        Add a job to start generating tailored resumes and cover letters.
      </p>
      <Link
        href="/job/new"
        className="bg-blocky-500 font-blocky text-blocky-900 shadow-block hover:bg-blocky-500/90 focus-visible:ring-blocky-500 mt-4 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-2 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Create your first job
      </Link>
    </div>
  );
}
