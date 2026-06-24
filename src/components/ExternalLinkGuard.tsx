"use client";

import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { isExternalHref, openExternalUrl } from "@/lib/externalLink";

/**
 * Single delegated click listener for the whole app: intercepts every <a>
 * click, and for external links shows a confirm dialog before opening the OS
 * browser. Avoids touching every template/component that renders an <a>.
 */
export function ExternalLinkGuard() {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || !isExternalHref(href)) return;
      e.preventDefault();
      setPendingUrl(new URL(href, window.location.href).toString());
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <ConfirmDialog
      isOpen={pendingUrl !== null}
      title="Open external link?"
      message={pendingUrl ?? ""}
      confirmLabel="Open"
      onConfirm={() => {
        if (pendingUrl) openExternalUrl(pendingUrl);
        setPendingUrl(null);
      }}
      onCancel={() => setPendingUrl(null)}
    />
  );
}
