import { describe, expect, it } from "vitest";
import type { Battle } from "../types/domain";
import { getYearlyEventCounts } from "./timelineAnalytics";

const battles = [
  { id: "a", name: "A", warId: "w", year: 1940, latitude: 0, longitude: 0, participants: [] },
  { id: "b", name: "B", warId: "w", year: 1940, latitude: 0, longitude: 0, participants: [] },
  { id: "c", name: "C", warId: "w", year: 1942, latitude: 0, longitude: 0, participants: [] },
] satisfies Battle[];

describe("timeline analytics", () => {
  it("counts events by year and preserves empty years", () => {
    expect(getYearlyEventCounts(battles, [1940, 1942])).toEqual([
      { year: 1940, count: 2 },
      { year: 1941, count: 0 },
      { year: 1942, count: 1 },
    ]);
  });

  it("ignores events outside the selected range", () => {
    expect(getYearlyEventCounts(battles, [1941, 1942])).toEqual([
      { year: 1941, count: 0 },
      { year: 1942, count: 1 },
    ]);
  });
});