import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";

import AppShell from "@/components/AppShell";

import type { Metadata } from "next";

import "@/styles/global.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Udaan",
  description: "AI-powered resume builder",
};

// Keep in sync with the STORAGE_KEY / resolution logic in
// src/contexts/ThemeContext.tsx — this only exists to stamp [data-theme]
// before first paint so there's no flash of the OS theme while React
// hydrates; ThemeContext takes over from there.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("resume-builder-theme");var d=t==="light"||t==="dark"?t:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",d);}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading headers() opts this layout (and everything under it) out of
  // static rendering/full-route-caching, which is required for the
  // per-request CSP nonce (src/proxy.ts) to actually reach the framework's
  // hydration script tags — a statically cached page bakes those tags once,
  // with no nonce, and every later request's fresh nonce then fails to
  // match, silently blocking all JS under the 'strict-dynamic' CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // suppressHydrationWarning on <html>: the script below stamps
    // data-theme before React hydrates, so the attribute React sees on
    // mount never matches the attribute-less SSR output — expected, same
    // pattern next-themes uses.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* suppressHydrationWarning: browsers strip the nonce attribute
            from the DOM after using it, for security — React then sees
            nonce="" on mount and flags a mismatch against the real value
            it rendered server-side. Harmless; the script still executes
            with the correct nonce. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "var(--color-agent-bg)" }}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
