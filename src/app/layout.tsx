import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { CacheInitializer } from "@/components/CacheInitializer";
import Nav from "@/components/Nav";
import { ToastProvider } from "@/components/ui/ToastProvider";

import type { Metadata } from "next";

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
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          <CacheInitializer />
          <Nav />
          <main className="container mx-auto p-4">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
