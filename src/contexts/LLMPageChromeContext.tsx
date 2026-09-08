"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface LLMPageChromeContextValue {
  showModelSelector: boolean;
  setShowModelSelector: (value: boolean) => void;
}

const LLMPageChromeContext = createContext<LLMPageChromeContextValue | null>(
  null
);

export function LLMPageChromeProvider({ children }: { children: ReactNode }) {
  const [showModelSelector, setShowModelSelector] = useState(false);
  return (
    <LLMPageChromeContext.Provider
      value={{ showModelSelector, setShowModelSelector }}
    >
      {children}
    </LLMPageChromeContext.Provider>
  );
}

function useLLMPageChromeContext(): LLMPageChromeContextValue {
  const ctx = useContext(LLMPageChromeContext);
  if (!ctx) {
    throw new Error(
      "useLLMPageChromeContext must be used within an LLMPageChromeProvider"
    );
  }
  return ctx;
}

/**
 * Pages that call the LLM opt in to the header model selector by calling
 * this once. Flag resets to false on unmount so navigating away hides it
 * again for pages that didn't opt in.
 */
export function useLLMPageChrome(enabled: boolean) {
  const { setShowModelSelector } = useLLMPageChromeContext();
  useEffect(() => {
    setShowModelSelector(enabled);
    return () => setShowModelSelector(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

export { useLLMPageChromeContext };
