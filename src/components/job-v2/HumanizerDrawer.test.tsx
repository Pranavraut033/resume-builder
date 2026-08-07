import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HumanizerDrawer } from "@/components/job-v2/HumanizerDrawer";

const mockUseHumanizeContent = vi.fn();

vi.mock("@/hooks/useHumanizeContent", () => ({
  default: (...args: unknown[]) => mockUseHumanizeContent(...args),
}));

vi.mock("@/components/ModelSelector", () => ({
  ModelSelector: () => <div>model selector</div>,
}));

vi.mock("@/store/modelStore", () => ({
  useModelStore: () => ["openai", "gpt-4o"],
}));

describe("HumanizerDrawer", () => {
  it("shows the error message instead of a blank body when humanizing fails", () => {
    mockUseHumanizeContent.mockReturnValue({
      mutate: vi.fn(),
      data: undefined,
      status: "error",
      error: new Error("Provider openai not available"),
      reset: vi.fn(),
    });

    render(
      <HumanizerDrawer
        open
        onClose={vi.fn()}
        text="Some resume text"
        onAccept={vi.fn()}
      />
    );

    expect(screen.getByText("Provider openai not available")).toBeDefined();
    expect(screen.getByText("Try again")).toBeDefined();
  });
});
