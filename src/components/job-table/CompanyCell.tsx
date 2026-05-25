"use client";

import React from "react";
import CompanyAvatar from "@/components/CompanyAvatar";
import type { JobRecord } from "./types";

export default function CompanyCell({ job }: { job: JobRecord }) {
  return (
    <div className="flex items-center gap-3">
      <CompanyAvatar name={job.company?.name} size={40} />
      <div>
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-agent-on-surface)" }}
        >
          {job.company?.name ?? "Unknown"}
        </p>
        <p
          className="text-xs"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          {job.company?.locationCity ?? "—"}
        </p>
      </div>
    </div>
  );
}
