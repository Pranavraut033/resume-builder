"use client";

import ATSAnalysisPanel from "@/components/job/ATSAnalysisPanel";

import { SideDrawer } from "./SideDrawer";

interface ATSDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * ATSDrawer — slides in from the right side of the document canvas.
 * Wraps the existing ATSAnalysisPanel (non-standalone), which gives one
 * panel with a `summary` / `rewrites` / `keywords` / `offline` view
 * state — knockout blockers, the skim verdict, suggested rewrites, keyword
 * coverage, and the deterministic offline check. State management stays in
 * JobPageContext.
 */
export function ATSDrawer({ open, onClose }: ATSDrawerProps) {
  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      icon="search"
      title="Recruiter Skim"
    >
      <div className="flex-1 overflow-y-auto">
        <ATSAnalysisPanel />
      </div>
    </SideDrawer>
  );
}
