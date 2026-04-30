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

function applyThemeToDom(t: Theme) {
  const html = document.documentElement;
  if (t === "system") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", t);
  }
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
        // Force a re-render so resolvedTheme recomputes
        setThemeState("system");
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
