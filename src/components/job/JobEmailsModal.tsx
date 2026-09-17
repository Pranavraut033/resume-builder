"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";

import { getEmailsForJob } from "@/actions/emailSync";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { formatTimestamp } from "@/lib";

interface JobEmailsModalProps {
  jobId: number | null;
  jobRole?: string;
  companyName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function JobEmailsModal({
  jobId,
  jobRole,
  companyName,
  isOpen,
  onClose,
}: JobEmailsModalProps) {
  const [expandedEmailId, setExpandedEmailId] = useState<number | null>(null);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["jobEmails", jobId],
    queryFn: () => (jobId ? getEmailsForJob(jobId) : Promise.resolve([])),
    enabled: isOpen && Boolean(jobId),
  });

  const getStageBadgeColor = (stage: string | null) => {
    switch (stage) {
      case "INTERVIEW":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "OFFER":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "ASSESSMENT":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "REJECTED":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "APPLIED":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Emails: ${jobRole || "Job"} ${companyName ? `at ${companyName}` : ""}`}
      size="lg"
      cancelLabel="Close"
    >
      <div className="space-y-4 text-left max-h-[70vh] overflow-y-auto pr-1">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-sm text-neutral-400 gap-2">
            <Icon name="spinner" className="h-4 w-4 animate-spin text-agent-primary" />
            Loading email activity…
          </div>
        )}

        {!isLoading && emails.length === 0 && (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-agent-outline-variant bg-agent-surface-lowest">
            <Icon name="mail" className="h-8 w-8 mx-auto text-neutral-400 mb-2" />
            <p className="text-sm font-medium text-neutral-200">No emails linked yet</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              Incoming recruiting emails matching {companyName || "this company"} will appear here automatically when email sync runs.
            </p>
          </div>
        )}

        {!isLoading && emails.length > 0 && (
          <div className="space-y-3">
            {emails.map((email) => {
              const isExpanded = expandedEmailId === email.id;
              return (
                <div
                  key={email.id}
                  className="rounded-xl border border-agent-outline-variant bg-agent-surface-lowest p-4 transition-all hover:border-agent-outline"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-neutral-200 truncate">
                          {email.sender}
                        </span>
                        {email.stage && (
                          <span
                            className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${getStageBadgeColor(
                              email.stage
                            )}`}
                          >
                            {email.stage}
                          </span>
                        )}
                        {email.actionRequired && (
                          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/40">
                            Action Needed
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-neutral-100">
                        {email.subject}
                      </h4>
                    </div>
                    <span className="text-[11px] text-neutral-400 whitespace-nowrap">
                      {formatTimestamp(email.receivedAt)}
                    </span>
                  </div>

                  {email.nextSteps && (
                    <div className="mt-2.5 rounded-lg bg-agent-surface-container/60 border border-agent-outline-variant p-2.5 text-xs text-neutral-300">
                      <strong className="text-neutral-100 font-semibold">Next Steps: </strong>
                      {email.nextSteps}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-neutral-400 line-clamp-2">
                    {email.snippet}
                  </div>

                  {email.bodyText && (
                    <div className="mt-3 pt-2 border-t border-agent-outline-variant">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedEmailId(isExpanded ? null : email.id)
                        }
                        className="text-xs text-agent-primary hover:underline flex items-center gap-1"
                      >
                        {isExpanded ? "Hide Full Message" : "View Full Message"}
                        <Icon
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          className="h-3 w-3"
                        />
                      </button>

                      {isExpanded && (
                        <pre className="mt-2 text-xs text-neutral-300 whitespace-pre-wrap font-sans bg-black/30 p-3 rounded-lg max-h-60 overflow-y-auto border border-agent-outline-variant">
                          {email.bodyText}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
