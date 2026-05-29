"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useProfileSelection } from "./useProfileSelection";

/**
 * Hook that monitors profile selection changes and redirects from job pages to the profile page.
 * This ensures users stay in the correct profile context when switching profiles.
 *
 * Called in Nav or AppShell to listen globally for profile changes.
 */
export function useNavigationOnProfileChange() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedProfileId } = useProfileSelection();
  const previousProfileIdRef = useRef<number | null>(selectedProfileId);

  useEffect(() => {
    // Detect profile change
    if (previousProfileIdRef.current !== selectedProfileId) {
      previousProfileIdRef.current = selectedProfileId;

      // If on a job page, redirect to profile page when profile changes
      if (pathname?.startsWith("/job/")) {
        router.push("/profile");
      }
    }
  }, [selectedProfileId, pathname, router]);
}
