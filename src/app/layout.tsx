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
  await headers();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "var(--color-agent-bg)" }}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
