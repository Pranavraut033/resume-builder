import React from "react";
import { describe, expect, it, vi } from "vitest";

// react-pdf's <View> isn't a real DOM element and isn't relevant to this
// test — mock it as a plain passthrough component so we can inspect the
// element tree SectionGroup builds without pulling in the full renderer.
vi.mock("@react-pdf/renderer", () => ({
  View: (props: { children?: React.ReactNode; wrap?: boolean }) =>
    React.createElement("mock-view", props, props.children),
}));

const { SectionGroup } =
  await import("@/lib/pdf/templates/shared/SectionGroup");

// React.Children.toArray() clones elements to assign scoped keys, so
// reference/deep-equality on the elements themselves is brittle. Compare on
// text content instead, which is what actually distinguishes the items here.
function textOf(node: React.ReactNode): string {
  const el = node as React.ReactElement<{ children: string }>;
  return el.props.children;
}

describe("SectionGroup", () => {
  it("wraps only the heading + first item in wrap={false}, even when children is a single Fragment (regression for the page-break bug)", () => {
    // Every PDF section builder returns a single `<>...</>` Fragment as
    // `children` (e.g. `pdfExperience`'s default branch). Before the fix,
    // `React.Children.toArray()` treated that Fragment as ONE child, so
    // `first` became the whole section and the wrap={false} View swallowed
    // every entry instead of just the first.
    const heading = <div>HEADING</div>;

    const result = SectionGroup({
      heading,
      children: (
        <>
          <div>A</div>
          <div>B</div>
          <div>C</div>
        </>
      ),
    }) as React.ReactElement<{ children: React.ReactNode }>;

    // React.Children.toArray() flattens nested arrays, so this yields
    // [wrapEl, ...restItems] in one flat list rather than [wrapEl, restArray].
    const [wrapEl, ...restItems] = React.Children.toArray(
      result.props.children
    ) as [
      React.ReactElement<{ children: React.ReactNode }>,
      ...React.ReactNode[],
    ];

    // The wrap={false} View must contain exactly heading + first item, not
    // the entire section.
    const wrapChildren = React.Children.toArray(wrapEl.props.children);
    expect(wrapChildren).toHaveLength(2);
    expect(wrapChildren.map(textOf)).toEqual(["HEADING", "A"]);

    // The remaining items render outside the atomic wrap, free to paginate.
    expect(restItems.map(textOf)).toEqual(["B", "C"]);
  });

  it("still works when children is already a flat array (not a Fragment)", () => {
    const heading = <div>HEADING</div>;

    const result = SectionGroup({
      heading,
      children: [<div key="a">A</div>, <div key="b">B</div>],
    }) as React.ReactElement<{ children: React.ReactNode }>;

    const [wrapEl, ...restItems] = React.Children.toArray(
      result.props.children
    ) as [
      React.ReactElement<{ children: React.ReactNode }>,
      ...React.ReactNode[],
    ];

    const wrapChildren = React.Children.toArray(wrapEl.props.children);
    expect(wrapChildren.map(textOf)).toEqual(["HEADING", "A"]);
    expect(restItems.map(textOf)).toEqual(["B"]);
  });

  it("renders just the heading when there are no content items", () => {
    const heading = <div>HEADING</div>;

    const result = SectionGroup({
      heading,
      children: null,
    }) as React.ReactElement<{ children: React.ReactNode }>;

    const rendered = React.Children.toArray(result.props.children);
    expect(rendered.map(textOf)).toEqual(["HEADING"]);
  });
});
