"use client";

import Link from "next/link";
import { useState } from "react";

import CompanyAvatar from "@/components/CompanyAvatar";
import { StatusSelector } from "@/components/home/StatusControls";
import { SourceLogo } from "@/components/SourceLogo";
import { Icon } from "@/components/ui/Icon";
import { formatTimestamp } from "@/lib";
import cn from "@/lib/cn";
import { extractCompanyName } from "@/lib/email/companyName";
import { senderName, senderPlatform } from "@/lib/email/senderDomain";

import { LinkJobPicker } from "./LinkJobPicker";
import { stageBadgeClass } from "./stageMeta";

import type { TrackedEmail } from "@/actions/emailSync";
import type { JobRecord } from "@/actions/job";
import type { JobStatus } from "@/types/job";

interface EmailCardProps {
  email: TrackedEmail;
  jobs: JobRecord[];
  /** False when a group header already shows the linked job. */
  showLinkedJob?: boolean;
  busy?: boolean;
  onToggleHidden: (email: TrackedEmail) => void;
  onStatusChange: (jobId: number, status: JobStatus) => void;
  onLink: (emailId: number, jobId: number) => void;
  onUnlink: (emailId: number) => void;
}

const actionButton =
  "text-agent-on-surface-variant hover:text-agent-primary flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50";

export function EmailCard({
  email,
  jobs,
  showLinkedJob = true,
  busy,
  onToggleHidden,
  onStatusChange,
  onLink,
  onUnlink,
}: EmailCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isHidden = Boolean(email.hiddenAt);
  // Rows synced before companyName was stored fall back to the same extractor.
  const company = email.companyName ?? extractCompanyName(email);
  // The platform the mail came through (LinkedIn, an ATS…); null when the
  // sender is the company itself, so its logo doesn't repeat the avatar.
  const platform = senderPlatform(email.sender, company);
  const gmailUrl = `https://mail.google.com/mail/u/0/#all/${email.threadId ?? email.messageId}`;

  return (
    <article
      className={cn(
        "border-agent-outline-variant bg-agent-surface-lowest hover:border-agent-outline space-y-3 rounded-xl border p-4 transition-colors",
        isHidden && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <CompanyAvatar
          name={company ?? senderName(email.sender)}
          size={44}
          shape="circle"
          badge={
            platform && <SourceLogo url={platform.url} label={platform.label} />
          }
        />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-agent-on-surface truncate text-xs font-semibold"
                title={email.sender}
              >
                {company ?? email.sender}
              </span>
              {email.stage && (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    stageBadgeClass(email.stage)
                  )}
                >
                  {email.stage}
                </span>
              )}
              {email.actionRequired && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                  Action needed
                </span>
              )}
              {isHidden && (
                <span className="border-agent-outline-variant text-agent-outline rounded-full border px-2 py-0.5 text-[11px] font-medium">
                  Hidden
                </span>
              )}
            </div>
            <h3 className="text-agent-on-surface text-sm font-medium">
              {email.subject}
            </h3>
            {email.role && (
              <p className="text-agent-on-surface-variant text-xs">
                {email.role}
              </p>
            )}
          </div>
          <span className="text-agent-on-surface-variant shrink-0 text-[11px] whitespace-nowrap">
            {formatTimestamp(email.receivedAt)}
          </span>
        </div>
      </div>

      {email.nextSteps && (
        <div className="bg-agent-surface-container/60 border-agent-outline-variant text-agent-on-surface-variant rounded-lg border p-2.5 text-xs">
          <strong className="text-agent-on-surface font-semibold">
            Next steps:{" "}
          </strong>
          {email.nextSteps}
        </div>
      )}

      <p className="text-agent-on-surface-variant line-clamp-2 text-xs">
        {email.snippet}
      </p>

      {/* Linked job (editable status) or the link picker */}
      {email.job ? (
        showLinkedJob && (
          <div className="border-agent-outline-variant flex flex-wrap items-center gap-2 border-t pt-3">
            <Icon name="link" size={14} className="text-agent-primary" />
            <Link
              href={`/job/${email.job.id}`}
              className="text-agent-on-surface hover:text-agent-primary min-w-0 truncate text-xs font-semibold hover:underline"
            >
              {email.job.role}
              {email.job.company?.name ? ` @ ${email.job.company.name}` : ""}
            </Link>
            <StatusSelector
              value={email.job.status as JobStatus}
              onChange={(status) =>
                onStatusChange(email.job!.id, status as JobStatus)
              }
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => onUnlink(email.id)}
              disabled={busy}
              className={cn(actionButton, "ml-auto")}
            >
              Unlink
            </button>
          </div>
        )
      ) : (
        <div className="border-agent-outline-variant flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-agent-on-surface-variant text-xs">
            Not linked
          </span>
          <LinkJobPicker
            jobs={jobs}
            onLink={(jobId) => onLink(email.id, jobId)}
            disabled={busy}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {email.bodyText && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className={actionButton}
          >
            {expanded ? "Hide full message" : "View full message"}
            <Icon name={expanded ? "chevronUp" : "chevronDown"} size={12} />
          </button>
        )}
        <a
          href={gmailUrl}
          target="_blank"
          rel="noreferrer"
          className={actionButton}
        >
          Open in Gmail
        </a>
        <button
          type="button"
          onClick={() => onToggleHidden(email)}
          disabled={busy}
          className={cn(actionButton, "ml-auto")}
        >
          <Icon name={isHidden ? "eye" : "eyeOff"} size={13} />
          {isHidden ? "Unhide" : "Hide"}
        </button>
      </div>

      {expanded && email.bodyText && (
        <pre className="border-agent-outline-variant bg-agent-surface-container text-agent-on-surface-variant max-h-60 overflow-y-auto rounded-lg border p-3 font-sans text-xs whitespace-pre-wrap">
          {email.bodyText}
        </pre>
      )}
    </article>
  );
}
