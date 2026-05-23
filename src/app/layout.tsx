import { Geist, Geist_Mono } from "next/font/google";

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
  title: "Resume Builder",
  description: "AI-powered resume builder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
