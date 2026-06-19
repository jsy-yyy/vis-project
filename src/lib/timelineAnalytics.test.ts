import { describe, expect, it } from "vitest";
import type { Battle } from "../types/domain";
import {
  getTimelineChartSummary,
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

  it("summarizes the selected year with deduplicated participants", () => {
    expect(getYearlyEventSummary(battles, battles, 1940)).toMatchObject({
      year: 1940,
      totalCount: 2,
      filteredCount: 2,
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

  it("builds yearly stacked bars whose segments preserve yearly totals", () => {
    expect(getTimelineChartSummary(battles, "range", 1940, [1940, 1942], [1940, 1942])).toEqual({
      mode: "year-type",
      title: "年度事件趋势与类型构成",
      legend: ["Unknown"],
      bars: [
        {
          key: "1940",
          label: "1940",
          count: 2,
          current: true,
          segments: [{ key: "1940-Unknown", label: "Unknown", count: 2 }],
        },
        {
          key: "1941",
          label: "1941",
          count: 0,
          current: false,
          segments: [{ key: "1941-Unknown", label: "Unknown", count: 0 }],
        },
        {
          key: "1942",
          label: "1942",
          count: 1,
          current: false,
          segments: [{ key: "1942-Unknown", label: "Unknown", count: 1 }],
        },
      ],
    });
  });

  it("falls back to type distribution when a single year lacks valid months", () => {
    const summary = getTimelineChartSummary(battles, "single", 1940, [1940, 1940], [1940, 1942]);
    expect(summary).toMatchObject({
      mode: "type",
      title: "1940 年事件类型分布",
      legend: ["Unknown"],
    });
    expect(summary.bars[0]).toMatchObject({ label: "Unknown", count: 2 });
  });

  it("uses month distribution when every event has a valid date", () => {
    const datedBattles = battles.slice(0, 2).map((battle, index) => ({
      ...battle,
      startDate: index === 0 ? "1940-01-03" : "1940-02-04",
    }));
    const summary = getTimelineChartSummary(datedBattles, "single", 1940, [1940, 1940], [1940, 1942]);

    expect(summary.mode).toBe("month");
    expect(summary.bars.slice(0, 2).map((bar) => bar.count)).toEqual([1, 1]);
    expect(summary.bars.reduce((sum, bar) => sum + bar.count, 0)).toBe(2);
  });

  it("returns an empty type chart without failing", () => {
    expect(getTimelineChartSummary([], "single", 1941, [1941, 1941], [1940, 1942])).toEqual({
      mode: "type",
      title: "1941 年事件类型分布",
      legend: [],
      bars: [],
    });
  });
});
