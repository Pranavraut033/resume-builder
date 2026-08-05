import { View } from "@react-pdf/renderer";
import React from "react";

/**
 * Wraps a section heading together with its first content item in a single
 * non-splittable View, so react-pdf never breaks the page right after a
 * heading (leaving it "orphaned" at the bottom of a page). Remaining items
 * are rendered normally and can each still be placed on a later page.
 */
export const SectionGroup: React.FC<{
  heading: React.ReactNode;
  children: React.ReactNode;
}> = ({ heading, children }) => {
  const raw = React.Children.toArray(children);
  // Every PDF section builder returns a single <>…</> Fragment as its
  // `children`, and React.Children.toArray() treats a Fragment as ONE child
  // (verified against React 19.2.1: toArray(<>a b</>).length === 1 vs
  // toArray([a, b]).length === 2). Without unwrapping it here, `first` below
  // would be the whole section and the wrap={false} View would become
  // atomic — the root cause of "everything pushed to page 2".
  const items =
    raw.length === 1 &&
    React.isValidElement(raw[0]) &&
    raw[0].type === React.Fragment
      ? React.Children.toArray(
          (raw[0].props as { children?: React.ReactNode }).children
        )
      : raw;
  if (items.length === 0) return <>{heading}</>;

  const [first, ...rest] = items;
  return (
    <>
      <View wrap={false}>
        {heading}
        {first}
      </View>
      {rest}
    </>
  );
};
