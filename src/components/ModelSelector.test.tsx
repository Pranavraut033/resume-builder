import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ModelSelector } from "@/components/ModelSelector";
import { useModelStore } from "@/store/modelStore";

function seed(emailModelPair: [string, string] | null = null) {
  useModelStore.setState({
    selectedModelsByProvider: { openai: ["gpt-4o", "gpt-4o-mini"] },
    activeModelPair: ["openai", "gpt-4o"],
    emailModelPair,
  } as never);
}

describe("ModelSelector scope", () => {
  beforeEach(() => seed());

  it('scope="email" picks the email model and leaves the primary alone', () => {
    render(<ModelSelector scope="email" variant="compact" />);
    // Nothing chosen yet: shows the inherited primary model.
    expect(screen.getByText(/Email AI:/).textContent).toContain(
      "openai - gpt-4o (primary)"
    );

    fireEvent.click(screen.getByRole("button", { name: /Email AI:/ }));
    fireEvent.click(screen.getByRole("button", { name: "gpt-4o-mini" }));

    const state = useModelStore.getState();
    expect(state.emailModelPair).toEqual(["openai", "gpt-4o-mini"]);
    expect(state.activeModelPair).toEqual(["openai", "gpt-4o"]);
  });

  it('"Use primary model" clears the dedicated email model', () => {
    seed(["openai", "gpt-4o-mini"]);
    render(<ModelSelector scope="email" variant="compact" />);

    fireEvent.click(screen.getByRole("button", { name: /Email AI:/ }));
    fireEvent.click(screen.getByRole("button", { name: "Use primary model" }));

    expect(useModelStore.getState().emailModelPair).toBeNull();
    expect(useModelStore.getState().activeModelPair).toEqual([
      "openai",
      "gpt-4o",
    ]);
  });

  it("default scope still sets the primary model and never the email one", () => {
    render(<ModelSelector variant="compact" />);

    fireEvent.click(screen.getByRole("button", { name: /openai - gpt-4o/ }));
    // Control for the test below: the primary scope does show these options.
    expect(screen.getByText(/Advanced options/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "gpt-4o-mini" }));

    const state = useModelStore.getState();
    expect(state.activeModelPair).toEqual(["openai", "gpt-4o-mini"]);
    expect(state.emailModelPair).toBeNull();
  });

  it("does not offer reasoning/temperature options for the email model", () => {
    render(<ModelSelector scope="email" variant="compact" />);
    fireEvent.click(screen.getByRole("button", { name: /Email AI:/ }));
    expect(screen.queryByText(/Advanced options/)).toBeNull();
  });
});
