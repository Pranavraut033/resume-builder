import { describe, expect, it } from "vitest";

import { buildLocationOptions, locationGroups } from "./locationGroups";

describe("locationGroups", () => {
  it.each([
    ["Berlin", ["Berlin"]],
    ["Berlin, Germany", ["Berlin"]],
    ["Mumbai Metropolitan Region", ["Mumbai"]],
    ["Greater Mumbai Area", ["Mumbai"]],
    ["Munich (Hybrid)", ["Munich"]],
    ["Mumbai (Remote)", ["Mumbai", "Remote"]],
    ["Remote", ["Remote"]],
    ["(Remote)", ["Remote"]],
    ["Germany (Home Office)", ["Germany", "Remote"]],
    ["Baden-Württemberg, Germany", ["Baden-Württemberg"]],
    ["New York, NY", ["New York"]],
  ])("%s → %j", (input, expected) => {
    expect(locationGroups(input)).toEqual(expected);
  });

  it("returns nothing for a missing location", () => {
    expect(locationGroups(null)).toEqual([]);
    expect(locationGroups("   ")).toEqual([]);
  });
});

describe("buildLocationOptions", () => {
  const locations = [
    "Berlin",
    "Berlin, Germany",
    "berlin",
    "Mumbai (Remote)",
    "Mumbai Metropolitan Region",
    null,
  ];

  it("groups spellings of one place, counts them, and orders by count", () => {
    expect(buildLocationOptions(locations)).toEqual([
      { key: "berlin", label: "Berlin", count: 3 },
      { key: "mumbai", label: "Mumbai", count: 2 },
      { key: "remote", label: "Remote", count: 1 },
    ]);
  });

  it("keeps a selected group listed even when other filters leave it empty", () => {
    const options = buildLocationOptions(["Berlin"], ["mumbai"]);
    expect(options.find((o) => o.key === "mumbai")?.count).toBe(0);
  });
});
