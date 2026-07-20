import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FieldConfig, ListSection } from "@/components/profile/ListSection";

interface Item {
  name: string;
  tags: string[];
}

const fields: FieldConfig<Item>[] = [
  { type: "text", key: "name", label: "Name" },
  {
    type: "list",
    key: "tags",
    label: "Tags",
    separator: ", ",
    helpText: "Comma-separated list",
  },
];

const blank = (): Item => ({ name: "", tags: [] });

function setup(items: Item[] = []) {
  const onChange = vi.fn();
  render(
    <ListSection
      title="Items"
      items={items}
      onChange={onChange}
      blank={blank}
      addLabel="+ Add Item"
      emptyText="No items added yet."
      itemNoun="Item"
      fields={fields}
    />
  );
  return { onChange };
}

describe("ListSection", () => {
  it("appends a blank item and calls onChange when Add is clicked", () => {
    const { onChange } = setup([]);

    fireEvent.click(screen.getByRole("button", { name: "+ Add Item" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([blank()]);
  });

  it("removes the correct item when Remove is clicked", () => {
    const items: Item[] = [
      { name: "First", tags: [] },
      { name: "Second", tags: [] },
      { name: "Third", tags: [] },
    ];
    const { onChange } = setup(items);

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removeButtons[1]);

    expect(onChange).toHaveBeenCalledWith([
      { name: "First", tags: [] },
      { name: "Third", tags: [] },
    ]);
  });

  it("displays a list field as the joined string and round-trips on edit", () => {
    const items: Item[] = [{ name: "Item 1", tags: ["React", "TypeScript"] }];
    const { onChange } = setup(items);

    const tagsInput = screen.getByDisplayValue(
      "React, TypeScript"
    ) as HTMLInputElement;

    fireEvent.change(tagsInput, {
      target: { value: "React, TypeScript, Vitest" },
    });

    expect(onChange).toHaveBeenCalledWith([
      { name: "Item 1", tags: ["React", "TypeScript", "Vitest"] },
    ]);
  });
});
