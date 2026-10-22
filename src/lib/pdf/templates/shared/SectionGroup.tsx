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
  // PDF section builders return Fragments (often nested, e.g. `<>{entries()}</>`
  // where entries() itself returns a Fragment), and React.Children.toArray()
  // treats a Fragment as ONE child. Without flattening every level, `first`
  // below would be the whole section and the wrap={false} View would become
  // atomic — the root cause of "everything pushed to page 2".
  const flatten = (node: React.ReactNode): React.ReactNode[] =>
    React.Children.toArray(node).flatMap((child) =>
      React.isValidElement(child) && child.type === React.Fragment
        ? flatten((child.props as { children?: React.ReactNode }).children)
        : [child]
    );
  const items = flatten(children);
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
