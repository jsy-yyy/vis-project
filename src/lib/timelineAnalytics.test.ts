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

  it("builds one pie per year for a three-year range and preserves empty years", () => {
    expect(getTimelineChartSummary(battles, "range", 1940, [1940, 1942], [1940, 1942])).toEqual({
      mode: "year-type-pie",
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

  it("uses one type-composition pie for a single year", () => {
    const summary = getTimelineChartSummary(battles, "single", 1940, [1940, 1940], [1940, 1942]);
    expect(summary).toMatchObject({
      mode: "year-type-pie",
      title: "年度事件趋势与类型构成",
      legend: ["Unknown"],
    });
    expect(summary.bars).toHaveLength(1);
    expect(summary.bars[0]).toMatchObject({
      label: "1940",
      count: 2,
      segments: [{ label: "Unknown", count: 2 }],
    });
  });

  it("uses one pie per year for a two-year range", () => {
    const summary = getTimelineChartSummary(battles, "range", 1940, [1940, 1941], [1940, 1942]);
    expect(summary.mode).toBe("year-type-pie");
    expect(summary.bars.map((bar) => [bar.label, bar.count])).toEqual([
      ["1940", 2],
      ["1941", 0],
    ]);
  });

  it("keeps stacked bars for ranges of four years or more", () => {
    const summary = getTimelineChartSummary(battles, "range", 1940, [1940, 1943], [1940, 1943]);
    expect(summary.mode).toBe("year-type");
    expect(summary.bars).toHaveLength(4);
  });

  it("keeps every pie segment total equal to its yearly total", () => {
    const typedBattles = [
      { ...battles[0], type: "Land" },
      { ...battles[1], type: "Air" },
      { ...battles[2], type: "Land" },
    ];
    const summary = getTimelineChartSummary(typedBattles, "range", 1940, [1940, 1942], [1940, 1942]);

    for (const bar of summary.bars) {
      expect(bar.segments.reduce((sum, segment) => sum + segment.count, 0)).toBe(bar.count);
    }
  });

  it("returns an empty single-year pie without failing", () => {
    expect(getTimelineChartSummary([], "single", 1941, [1941, 1941], [1940, 1942])).toEqual({
      mode: "year-type-pie",
      title: "年度事件趋势与类型构成",
      legend: [],
      bars: [
        {
          key: "1941",
          label: "1941",
          count: 0,
          current: true,
          segments: [],
        },
      ],
    });
  });
});
