"use client";

import { useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { setKeychainConsentHandler } from "@/lib/keyStorage";

/**
 * Explains the OS keychain permission prompt before it fires, the first time
 * (per app version) any code path touches a stored API key. Mounted once in
 * the app shell so it covers every entry point (Settings, the job page,
 * etc.), not just one page.
 */
export function KeychainNoticeGate() {
  const [isOpen, setIsOpen] = useState(false);
  const pendingRef = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
  } | null>(null);

  useEffect(() => {
    setKeychainConsentHandler(
      () =>
        new Promise<void>((resolve, reject) => {
          pendingRef.current = { resolve, reject };
          setIsOpen(true);
        })
    );
    return () => setKeychainConsentHandler(null);
  }, []);

  const settle = (accepted: boolean) => {
    setIsOpen(false);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (accepted) pending?.resolve();
    else pending?.reject(new Error("Keychain access notice dismissed"));
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Secure Key Storage"
      message="Udaan encrypts your API keys and stores the encryption key in your operating system's keychain. Your OS will now ask you to allow access — choose “Always Allow” so it stops asking. (macOS will ask again after each app update; that's expected.)"
      confirmLabel="Continue"
      cancelLabel="Not now"
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );
}
