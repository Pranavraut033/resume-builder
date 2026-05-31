"use client";

import { JobSite } from "@/lib/jobSearchUrls";

interface JobBrowserTabsProps {
  sites: JobSite[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function JobBrowserTabs({
  sites,
  activeKey,
  onSelect,
}: JobBrowserTabsProps) {
  return (
    <div
      className="flex shrink-0 gap-1 border-b px-3 py-1"
      style={{
        background: "var(--color-agent-surface-lowest)",
        borderColor: "var(--color-agent-outline-variant)",
      }}
    >
      {sites.map((site) => {
        const isActive = activeKey === site.key;
        return (
          <button
            key={site.key}
            type="button"
            onClick={() => onSelect(site.key)}
            className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
            style={
              isActive
                ? {
                    background: "var(--color-agent-primary-container)",
                    color: "var(--color-agent-on-primary-container)",
                  }
                : {
                    color: "var(--color-agent-on-surface-variant)",
                  }
            }
          >
            {site.name}
          </button>
        );
      })}
    </div>
  );
}
