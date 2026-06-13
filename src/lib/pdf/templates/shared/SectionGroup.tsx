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
  const items = React.Children.toArray(children);
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
