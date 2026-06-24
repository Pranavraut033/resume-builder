"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";

import Sidebar from "@/components/Nav";
import { ThemeProvider } from "@/contexts/ThemeContext";

import { CacheInitializer } from "./CacheInitializer";
import { ExternalLinkGuard } from "./ExternalLinkGuard";
import { Header } from "./ui";
import { ToastProvider } from "./ui/ToastProvider";
import { UpdatePrompt } from "./UpdatePrompt";

interface AppShellProps {
  children: React.ReactNode;
}
export const queryClient = new QueryClient();

export default function AppShell({ children }: AppShellProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AppShellContent>{children}</AppShellContent>
          <CacheInitializer />
          <ExternalLinkGuard />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AppShellContent({ children }: AppShellProps) {
  const pathname = usePathname();
  const isFullScreenRoute =
    pathname.startsWith("/job/") || pathname.startsWith("/find-jobs");

  if (isFullScreenRoute) {
    return (
      <div
        className="h-screen overflow-hidden"
        style={{
          background: "var(--color-agent-bg)",
          color: "var(--color-agent-on-bg)",
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          left={
            <label
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm"
              style={{
                background: "var(--color-agent-surface-low)",
                color: "var(--color-agent-on-surface-variant)",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <span className="sr-only">Search</span>
              <input
                type="search"
                placeholder="Search..."
                className="flex-1 border-none bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--color-agent-on-surface)" }}
              />
            </label>
          }
          right={
            <>
              <UpdatePrompt />
              <Link
                href="/docs"
                className="text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--color-agent-on-surface-variant)" }}
              >
                Documentation
              </Link>
              <a
                href="#"
                className="text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--color-agent-on-surface-variant)" }}
              >
                Support
              </a>
              <button
                type="button"
                className="rounded-full p-2 transition-colors"
                style={{ color: "var(--color-agent-on-surface-variant)" }}
                aria-label="Notifications"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
              <button
                type="button"
                className="rounded-full p-2 transition-colors"
                style={{ color: "var(--color-agent-on-surface-variant)" }}
                aria-label="Settings"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                </svg>
              </button>
            </>
          }
        />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
