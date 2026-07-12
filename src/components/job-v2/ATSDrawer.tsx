"use client";

import ATSAnalysisPanel from "@/components/job/ATSAnalysisPanel";

import { SideDrawer } from "./SideDrawer";

interface ATSDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * ATSDrawer — slides in from the right side of the document canvas.
 * Wraps the existing ATSAnalysisPanel (non-standalone), which gives both the
 * deterministic "Quick Check" tab and the LLM "AI Analysis" tab, same as the
 * legacy JobPageLayout. State management stays in JobPageContext.
 */
export function ATSDrawer({ open, onClose }: ATSDrawerProps) {
  return (
    <SideDrawer open={open} onClose={onClose} icon="barChart" title="ATS Analysis">
      <div className="flex-1 overflow-y-auto">
        <ATSAnalysisPanel />
      </div>
    </SideDrawer>
  );
}
