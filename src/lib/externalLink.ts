import { isTauriContext } from "@/lib/keyStorage";

/** True for hrefs that should be confirmed and opened in the OS browser instead of in-app. */
export function isExternalHref(href: string): boolean {
  if (!href || href.startsWith("#")) return false;
  if (/^(mailto|tel):/i.test(href)) return false;
  if (typeof window === "undefined") return /^https?:\/\//i.test(href);
  try {
    return (
      new URL(href, window.location.href).origin !== window.location.origin
    );
  } catch {
    return false;
  }
}

/** Opens a URL in the OS default browser (Tauri) or a new tab (web). */
export async function openExternalUrl(url: string): Promise<void> {
  if (isTauriContext()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
