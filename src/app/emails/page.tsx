"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  getAllTrackedEmails,
  linkEmailToJob,
  setJobEmailHidden,
  unlinkEmail,
  type TrackedEmail,
} from "@/actions/emailSync";
import { getAllJob, updateJobStatus } from "@/actions/job";
import { EmailCard } from "@/components/emails/EmailCard";
import {
  DEFAULT_EMAIL_FILTERS,
  EmailFilterBar,
  hasActiveEmailFilters,
  matchesEmailFilters,
  type EmailFilters,
} from "@/components/emails/EmailFilterBar";
import { EmailSyncButton } from "@/components/emails/EmailSyncButton";
import { StatusSelector } from "@/components/home/StatusControls";
import { ModelSelector } from "@/components/ModelSelector";
import { Button } from "@/components/ui/Button";
import { FallbackState } from "@/components/ui/FallbackState";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useEmailSync } from "@/hooks/useEmailSync";
import { useProfileSelection } from "@/hooks/useProfileSelection";
import { formatTimestamp } from "@/lib";
import { hasDefaultGoogleClient } from "@/lib/email/gmailClient";

import type { JobStatus } from "@/types/job";

const EMAILS_KEY = ["trackedEmails"] as const;

interface EmailGroup {
  key: string;
  job: TrackedEmail["job"];
  emails: TrackedEmail[];
}

/** Buckets by linked job in most-recent-email order, with "Unlinked" last. */
function groupByJob(emails: TrackedEmail[]): EmailGroup[] {
  const groups = new Map<string, EmailGroup>();
  for (const email of emails) {
    const key = email.jobId === null ? "unlinked" : String(email.jobId);
    const group = groups.get(key);
    if (group) group.emails.push(email);
    else groups.set(key, { key, job: email.job, emails: [email] });
  }
  const unlinked = groups.get("unlinked");
  groups.delete("unlinked");
  return [...groups.values(), ...(unlinked ? [unlinked] : [])];
}

function EmailListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="border-agent-outline-variant bg-agent-surface-lowest h-32 animate-pulse rounded-xl border"
        />
      ))}
    </div>
  );
}

export default function EmailsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { selectedProfileId } = useProfileSelection();
  const { status, isConnected, isStatusLoading, isConnecting, connect } =
    useEmailSync();

  const [filters, setFilters] = useState<EmailFilters>(DEFAULT_EMAIL_FILTERS);
  const [grouped, setGrouped] = useState(false);

  // Keyed on the sync status so a finished sync (which bumps lastSyncedAt /
  // totalEmails) refetches the list; keepPreviousData avoids a skeleton flash.
  const { data: emails = [], isLoading: isEmailsLoading } = useQuery({
    queryKey: [...EMAILS_KEY, status?.totalEmails, status?.lastSyncedAt],
    queryFn: () => getAllTrackedEmails(),
    enabled: !isStatusLoading,
    placeholderData: keepPreviousData,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", selectedProfileId],
    queryFn: () => getAllJob(selectedProfileId),
  });

  const patchEmails = (fn: (email: TrackedEmail) => TrackedEmail) =>
    queryClient.setQueriesData<TrackedEmail[]>(
      { queryKey: EMAILS_KEY },
      (old) => old?.map(fn)
    );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: EMAILS_KEY });
    queryClient.invalidateQueries({ queryKey: ["emailSyncStatus"] });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    queryClient.invalidateQueries({ queryKey: ["jobEmails"] });
  };

  const onError = (title: string) => (error: unknown) => {
    refresh();
    pushToast({
      title,
      description: error instanceof Error ? error.message : undefined,
      variant: "error",
    });
  };

  const hideMutation = useMutation({
    mutationFn: (email: TrackedEmail) =>
      setJobEmailHidden(email.id, !email.hiddenAt),
    onMutate: (email) =>
      patchEmails((e) =>
        e.id === email.id
          ? { ...e, hiddenAt: e.hiddenAt ? null : new Date() }
          : e
      ),
    onSuccess: (_data, email) => {
      pushToast({
        title: email.hiddenAt ? "Email unhidden" : "Email hidden",
        variant: "info",
      });
      refresh();
    },
    onError: onError("Unable to update email"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ jobId, status }: { jobId: number; status: JobStatus }) =>
      updateJobStatus(jobId, status),
    onMutate: ({ jobId, status }) =>
      patchEmails((e) =>
        e.job?.id === jobId ? { ...e, job: { ...e.job, status } } : e
      ),
    onSuccess: () => {
      pushToast({ title: "Status updated", variant: "success" });
      refresh();
    },
    onError: onError("Unable to update status"),
  });

  const linkMutation = useMutation({
    mutationFn: ({ emailId, jobId }: { emailId: number; jobId: number }) =>
      linkEmailToJob(emailId, jobId),
    onSuccess: () => {
      pushToast({ title: "Email linked", variant: "success" });
      refresh();
    },
    onError: onError("Unable to link email"),
  });

  const unlinkMutation = useMutation({
    mutationFn: (emailId: number) => unlinkEmail(emailId),
    onSuccess: () => {
      pushToast({ title: "Email unlinked", variant: "info" });
      refresh();
    },
    onError: onError("Unable to unlink email"),
  });

  const visible = useMemo(
    () => emails.filter((email) => matchesEmailFilters(email, filters)),
    [emails, filters]
  );
  const groups = useMemo(
    () => (grouped ? groupByJob(visible) : []),
    [grouped, visible]
  );
  const actionCount = emails.filter(
    (e) => e.actionRequired && !e.hiddenAt
  ).length;

  const isLoading = isStatusLoading || isEmailsLoading;
  const busy =
    hideMutation.isPending ||
    statusMutation.isPending ||
    linkMutation.isPending ||
    unlinkMutation.isPending;

  const renderCard = (email: TrackedEmail, showLinkedJob = true) => (
    <EmailCard
      key={email.id}
      email={email}
      jobs={jobs}
      showLinkedJob={showLinkedJob}
      busy={busy}
      onToggleHidden={(e) => hideMutation.mutate(e)}
      onStatusChange={(jobId, status) =>
        statusMutation.mutate({ jobId, status })
      }
      onLink={(emailId, jobId) => linkMutation.mutate({ emailId, jobId })}
      onUnlink={(emailId) => unlinkMutation.mutate(emailId)}
    />
  );

  const connectAction = hasDefaultGoogleClient() ? (
    <Button
      variant="primary"
      onClick={connect}
      disabled={isConnecting}
      icon={
        <Icon
          name={isConnecting ? "spinner" : "mail"}
          className={isConnecting ? "h-4 w-4 animate-spin" : "h-4 w-4"}
        />
      }
    >
      {isConnecting ? "Waiting for sign-in…" : "Connect Gmail"}
    </Button>
  ) : (
    <Link href="/settings">
      <Button variant="primary">Set up Google sign-in</Button>
    </Link>
  );

  let body: React.ReactNode;
  if (isLoading) {
    body = <EmailListSkeleton />;
  } else if (emails.length === 0 && !isConnected) {
    body = (
      <FallbackState
        iconName="mail"
        title="Gmail isn't connected"
        description="Connect your Gmail (read-only) and Udaan will pick out recruiting emails and link them to your jobs."
        action={connectAction}
      />
    );
  } else if (emails.length === 0) {
    body = (
      <FallbackState
        iconName="mail"
        title="No recruiting emails yet"
        description={
          status?.lastSyncedAt
            ? `Last synced ${formatTimestamp(status.lastSyncedAt)} — nothing recruiting-related found. New mail is checked twice a day.`
            : "Nothing synced yet. Run a sync to pull in recruiting emails."
        }
        action={<EmailSyncButton variant="primary" size="md" />}
      />
    );
  } else if (visible.length === 0) {
    body = (
      <FallbackState
        iconName="checkCircle"
        title="All clear"
        description={
          hasActiveEmailFilters(filters)
            ? "No emails match these filters."
            : "Nothing to show."
        }
        action={
          <Button
            variant="secondary"
            onClick={() => setFilters(DEFAULT_EMAIL_FILTERS)}
          >
            Clear filters
          </Button>
        }
      />
    );
  } else if (grouped) {
    body = (
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key} className="space-y-3">
            <header className="flex flex-wrap items-center gap-2">
              {group.job ? (
                <>
                  <Icon name="link" size={14} className="text-agent-primary" />
                  <Link
                    href={`/job/${group.job.id}`}
                    className="text-agent-on-surface hover:text-agent-primary text-sm font-semibold hover:underline"
                  >
                    {group.job.role}
                    {group.job.company?.name
                      ? ` @ ${group.job.company.name}`
                      : ""}
                  </Link>
                  <StatusSelector
                    value={group.job.status as JobStatus}
                    onChange={(status) =>
                      statusMutation.mutate({
                        jobId: group.job!.id,
                        status: status as JobStatus,
                      })
                    }
                    disabled={busy}
                  />
                </>
              ) : (
                <span className="text-agent-on-surface-variant text-sm font-semibold">
                  Unlinked
                </span>
              )}
              <span className="text-agent-outline text-xs">
                {group.emails.length}
              </span>
            </header>
            {group.emails.map((email) => renderCard(email, false))}
          </section>
        ))}
      </div>
    );
  } else {
    body = <div className="space-y-3">{visible.map((e) => renderCard(e))}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-agent-on-surface text-2xl font-bold">Emails</h1>
          <p className="text-agent-on-surface-variant mt-1 text-sm">
            {status?.totalEmails ?? 0} tracked · {status?.matchedEmails ?? 0}{" "}
            linked · {actionCount} need action
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModelSelector
            scope="email"
            variant="compact"
            label="Email AI model"
          />
          <EmailSyncButton />
        </div>
      </div>

      {!isLoading && emails.length > 0 && !isConnected && (
        <div className="border-agent-outline-variant bg-agent-surface-lowest flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <p className="text-agent-on-surface-variant text-xs">
            Gmail is disconnected — new recruiting emails won&apos;t sync until
            you reconnect.
          </p>
          {connectAction}
        </div>
      )}

      {emails.length > 0 && (
        <EmailFilterBar
          filters={filters}
          onChange={setFilters}
          groupByJob={grouped}
          onGroupByJobChange={setGrouped}
        />
      )}

      {body}
    </div>
  );
}
