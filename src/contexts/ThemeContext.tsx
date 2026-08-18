"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "resume-builder-theme";

function resolveTheme(t: Theme): "light" | "dark" {
  if (t === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return t;
}

// Always stamps a resolved light/dark value — the CSS only has a
// `[data-theme="dark"]` selector (see global.css), so "system" must be
// resolved here rather than left for a media query to pick up.
function applyThemeToDom(t: Theme) {
  document.documentElement.setAttribute("data-theme", resolveTheme(t));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
  });

  // resolvedTheme is derived — no extra state needed
  const resolvedTheme = resolveTheme(theme);

  // Keep a ref so the media-query listener can read the latest theme without
  // adding it as a dependency (avoids re-registering the listener on every change)
  const themeRef = useRef(theme);

  // Sync DOM on every theme change; also keep ref current
  useEffect(() => {
    themeRef.current = theme;
    applyThemeToDom(theme);
  }, [theme]);

  // Track system preference changes (only relevant when theme === "system")
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (themeRef.current === "system") {
        // setThemeState("system") is a no-op re-render (same value, React
        // bails out) — re-apply the DOM attribute directly so a live OS
        // appearance change actually takes effect while in "system" mode.
        applyThemeToDom("system");
      }
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyThemeToDom(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
