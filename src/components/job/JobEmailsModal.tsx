"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";

import { getEmailsForJob } from "@/actions/emailSync";
import { stageBadgeClass } from "@/components/emails/stageMeta";
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Emails: ${jobRole || "Job"} ${companyName ? `at ${companyName}` : ""}`}
      size="lg"
      cancelLabel="Close"
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 text-left">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-400">
            <Icon
              name="spinner"
              className="text-agent-primary h-4 w-4 animate-spin"
            />
            Loading email activity…
          </div>
        )}

        {!isLoading && emails.length === 0 && (
          <div className="border-agent-outline-variant bg-agent-surface-lowest rounded-xl border border-dashed px-4 py-12 text-center">
            <Icon
              name="mail"
              className="mx-auto mb-2 h-8 w-8 text-neutral-400"
            />
            <p className="text-sm font-medium text-neutral-200">
              No emails linked yet
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-400">
              Incoming recruiting emails matching{" "}
              {companyName || "this company"} will appear here automatically
              when email sync runs.
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
                  className="border-agent-outline-variant bg-agent-surface-lowest hover:border-agent-outline rounded-xl border p-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-xs font-semibold text-neutral-200">
                          {email.sender}
                        </span>
                        {email.stage && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${stageBadgeClass(
                              email.stage
                            )}`}
                          >
                            {email.stage}
                          </span>
                        )}
                        {email.actionRequired && (
                          <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                            Action Needed
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-neutral-100">
                        {email.subject}
                      </h4>
                    </div>
                    <span className="text-[11px] whitespace-nowrap text-neutral-400">
                      {formatTimestamp(email.receivedAt)}
                    </span>
                  </div>

                  {email.nextSteps && (
                    <div className="bg-agent-surface-container/60 border-agent-outline-variant mt-2.5 rounded-lg border p-2.5 text-xs text-neutral-300">
                      <strong className="font-semibold text-neutral-100">
                        Next Steps:{" "}
                      </strong>
                      {email.nextSteps}
                    </div>
                  )}

                  <div className="mt-2 line-clamp-2 text-xs text-neutral-400">
                    {email.snippet}
                  </div>

                  {email.bodyText && (
                    <div className="border-agent-outline-variant mt-3 border-t pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedEmailId(isExpanded ? null : email.id)
                        }
                        className="text-agent-primary flex items-center gap-1 text-xs hover:underline"
                      >
                        {isExpanded ? "Hide Full Message" : "View Full Message"}
                        <Icon
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          className="h-3 w-3"
                        />
                      </button>

                      {isExpanded && (
                        <pre className="border-agent-outline-variant mt-2 max-h-60 overflow-y-auto rounded-lg border bg-black/30 p-3 font-sans text-xs whitespace-pre-wrap text-neutral-300">
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
