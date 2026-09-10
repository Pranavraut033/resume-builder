"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { isExternalHref } from "@/lib/externalLink";

/**
 * Mount while a page has unsaved edits to confirm before the user reloads,
 * closes the window, or clicks away to another in-app route.
 */
export function UnsavedChangesGuard({ isDirty }: { isDirty: boolean }) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || isExternalHref(href)) return;
      e.preventDefault();
      setPendingHref(href);
    };
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [isDirty]);

  return (
    <ConfirmDialog
      isOpen={pendingHref !== null}
      title="Leave without saving?"
      message="Your changes to this profile haven't been saved."
      confirmLabel="Leave"
      cancelLabel="Stay"
      onConfirm={() => {
        if (pendingHref) router.push(pendingHref);
        setPendingHref(null);
      }}
      onCancel={() => setPendingHref(null)}
    />
  );
}
