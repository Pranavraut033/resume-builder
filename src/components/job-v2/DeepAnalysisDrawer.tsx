"use client";

import DeepAnalysisPanel from "@/components/job/DeepAnalysisPanel";

import { SideDrawer } from "./SideDrawer";

interface DeepAnalysisDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * DeepAnalysisDrawer — slides in from the right side of the document canvas.
 * Wraps the existing DeepAnalysisPanel (non-standalone), which gives one
 * panel with a `summary` / `findings` / `offline` view state — the verdict,
 * findings grouped by kind (correctness, impact, keyword, duplication,
 * provenance, title), and the deterministic offline check. State management
 * stays in JobPageContext.
 */
export function DeepAnalysisDrawer({ open, onClose }: DeepAnalysisDrawerProps) {
  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      icon="search"
      title="Deep Analysis"
    >
      <div className="flex-1 overflow-y-auto">
        <DeepAnalysisPanel />
      </div>
    </SideDrawer>
  );
}
