/**
 * Zustand store for the MCP server's on/off preference (Settings toggle).
 *
 * Persists only the user's intent ("should this be running"), not any live
 * process state — the Tauri child process itself is owned by Rust
 * (`src-tauri/src/mcp_server.rs`) and re-derived from this preference on app
 * start (see `McpServerAutostart` in `src/app/settings/page.tsx`'s usage),
 * which is what makes "opt-in, off by default" mean "off until the user
 * turns it on" rather than "forgotten every restart".
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface McpServerPreferenceState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useMcpServerStore = create<McpServerPreferenceState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled: boolean) => set({ enabled }),
    }),
    {
      name: "mcp-server-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
