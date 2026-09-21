import { useMemo } from "react";

import { Autocomplete } from "@/components/ui/Autocomplete";

import type { JobRecord } from "@/actions/job";

/** Pick a job to attach an unlinked email to. Selection fires `onLink` immediately. */
export function LinkJobPicker({
  jobs,
  onLink,
  disabled,
}: {
  jobs: JobRecord[];
  onLink: (jobId: number) => void;
  disabled?: boolean;
}) {
  const options = useMemo(
    () =>
      jobs.map((job) => ({
        value: String(job.id),
        label: job.role,
        description: job.company?.name,
      })),
    [jobs]
  );

  return (
    <Autocomplete
      options={options}
      value=""
      onChange={(value) => onLink(Number(value))}
      placeholder="Link to a job…"
      emptyText="No matching jobs"
      disabled={disabled}
      maxHeight={220}
      className="w-full sm:w-64"
    />
  );
}
