"use client";

import { useEffect, useRef } from "react";

import { getApiKey, isTauriContext, setApiKey } from "@/lib/keyStorage";

// ponytail: dev-web-only bridge from a gitignored .env into localStorage,
// so testing LLM features never requires typing a real API key into a tool
// call. Inert in production builds and inside the Tauri app.
const DEV_KEYS: Record<string, string | undefined> = {
  openai: process.env.NEXT_PUBLIC_DEV_OPENAI_API_KEY,
  gemini: process.env.NEXT_PUBLIC_DEV_GEMINI_API_KEY,
  grok: process.env.NEXT_PUBLIC_DEV_GROK_API_KEY,
  groq: process.env.NEXT_PUBLIC_DEV_GROQ_API_KEY,
  perplexity: process.env.NEXT_PUBLIC_DEV_PERPLEXITY_API_KEY,
  anthropic: process.env.NEXT_PUBLIC_DEV_ANTHROPIC_API_KEY,
};

export function DevKeySeeder() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (process.env.NODE_ENV !== "development" || isTauriContext()) return;

    for (const [provider, key] of Object.entries(DEV_KEYS)) {
      if (!key) continue;
      void getApiKey(provider).then((existing) => {
        if (!existing) void setApiKey(provider, key);
      });
    }
  }, []);

  return null;
}
