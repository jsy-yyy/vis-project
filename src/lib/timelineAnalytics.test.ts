import { describe, expect, it } from "vitest";
import type { Battle } from "../types/domain";
import {
  getTimelinePeriodComparison,
  getYearlyEventCounts,
  getYearlyEventSummary,
} from "./timelineAnalytics";

const battles = [
  { id: "a", name: "A", warId: "w", year: 1940, latitude: 0, longitude: 0, participants: ["british", "german"] },
  { id: "b", name: "B", warId: "w", year: 1940, latitude: 0, longitude: 0, participants: ["british", "british"] },
  { id: "c", name: "C", warId: "w2", year: 1942, latitude: 0, longitude: 0, participants: ["french"] },
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

  it("summarizes the selected year with conflict groups and deduplicated participants", () => {
    expect(getYearlyEventSummary(battles, battles, 1940)).toMatchObject({
      year: 1940,
      totalCount: 2,
      filteredCount: 2,
      topConflictGroups: [["w", 2]],
      topParticipants: [
        ["british", 2],
        ["german", 1],
      ],
    });
  });

  it("compares nearby periods around the selected year", () => {
    expect(getTimelinePeriodComparison(battles, 1941, [1940, 1942], 1)).toEqual({
      previousRange: [1940, 1940],
      previousCount: 2,
      nextRange: [1942, 1942],
      nextCount: 1,
    });
  });
});
