import type { AnalysisMode, Battle, YearRange } from "../types/domain";

export type YearlyEventCount = {
  year: number;
  count: number;
};

export type YearlyEventSummary = {
  year: number;
  totalCount: number;
  filteredCount: number;
  topParticipants: Array<[string, number]>;
  sampleEvents: Battle[];
};

export type TimelinePeriodComparison = {
  previousRange: YearRange | null;
  previousCount: number;
  nextRange: YearRange | null;
  nextCount: number;
};

export type TimelineChartBar = {
  key: string;
  label: string;
  count: number;
  current?: boolean;
};

export type TimelineStackSegment = {
  key: string;
  label: string;
  count: number;
};

export type TimelineStackBar = {
  key: string;
  label: string;
  count: number;
  segments: TimelineStackSegment[];
  current?: boolean;
};

export type TimelineChartSummary = {
  mode: "year-type" | "month" | "type";
  title: string;
  bars: TimelineStackBar[];
  legend: string[];
};

export function getYearlyEventCounts(
  battles: Battle[],
  yearRange: YearRange,
): YearlyEventCount[] {
  const [startYear, endYear] = yearRange;
  const counts = new Map<number, number>();

  for (const battle of battles) {
    if (battle.year >= startYear && battle.year <= endYear) {
      counts.set(battle.year, (counts.get(battle.year) ?? 0) + 1);
    }
  }

  return Array.from(
    { length: endYear - startYear + 1 },
    (_, index) => {
      const year = startYear + index;
      return {
        year,
        count: counts.get(year) ?? 0,
      };
    },
  );
}

function getTopEntries(values: string[], limit = 5) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

export function getYearlyEventSummary(
  baselineBattles: Battle[],
  filteredBattles: Battle[],
  year: number,
): YearlyEventSummary {
  const baselineYearBattles = baselineBattles.filter((battle) => battle.year === year);
  const filteredYearBattles = filteredBattles
    .filter((battle) => battle.year === year)
    .sort((left, right) => left.name.localeCompare(right.name));

  // Participants are counted once per event so duplicate actor labels in one
  // conflict event do not overstate a participant's yearly activity.
  const participantIds = filteredYearBattles.flatMap((battle) => Array.from(new Set(battle.participants)));

  return {
    year,
    totalCount: baselineYearBattles.length,
    filteredCount: filteredYearBattles.length,
    topParticipants: getTopEntries(participantIds),
    sampleEvents: filteredYearBattles.slice(0, 5),
  };
}

export function getTimelinePeriodComparison(
  battles: Battle[],
  currentYear: number,
  yearRange: YearRange,
  windowSize = 5,
): TimelinePeriodComparison {
  const [minYear, maxYear] = yearRange;
  const previousStart = Math.max(minYear, currentYear - windowSize);
  const previousEnd = currentYear - 1;
  const nextStart = currentYear + 1;
  const nextEnd = Math.min(maxYear, currentYear + windowSize);

  // Keep the comparison symmetrical around the selected year when the selected
  // window allows it; near boundaries, the unavailable side is intentionally null.
  const previousRange: YearRange | null = previousStart <= previousEnd ? [previousStart, previousEnd] : null;
  const nextRange: YearRange | null = nextStart <= nextEnd ? [nextStart, nextEnd] : null;

  function countInRange(range: YearRange | null) {
    if (!range) {
      return 0;
    }

    return battles.filter((battle) => battle.year >= range[0] && battle.year <= range[1]).length;
  }

  return {
    previousRange,
    previousCount: countInRange(previousRange),
    nextRange,
    nextCount: countInRange(nextRange),
  };
}

export function getTimelineChartSummary(
  battles: Battle[],
  analysisMode: AnalysisMode,
  currentYear: number,
  selectedYearRange: YearRange,
  _allYearRange: YearRange,
): TimelineChartSummary {
  const scopedBattles = battles.filter((battle) =>
    analysisMode === "range"
      ? battle.year >= selectedYearRange[0] && battle.year <= selectedYearRange[1]
      : battle.year === currentYear,
  );
  const typeCounts = new Map<string, number>();

  for (const battle of scopedBattles) {
    const type = battle.type ?? "Unknown";
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  if (analysisMode === "range") {
    const rankedTypes = Array.from(typeCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([type]) => type);
    const visibleTypes = rankedTypes.slice(0, 5);
    const hasOther = rankedTypes.length > visibleTypes.length;
    const legend = hasOther ? [...visibleTypes, "其他"] : visibleTypes;

    return {
      mode: "year-type",
      title: "年度事件趋势与类型构成",
      legend,
      bars: getYearlyEventCounts(scopedBattles, selectedYearRange).map(({ year, count }) => {
        const yearBattles = scopedBattles.filter((battle) => battle.year === year);
        const segments = legend.map((label) => {
          const segmentCount = label === "其他"
            ? yearBattles.filter((battle) => !visibleTypes.includes(battle.type ?? "Unknown")).length
            : yearBattles.filter((battle) => (battle.type ?? "Unknown") === label).length;

          return { key: `${year}-${label}`, label, count: segmentCount };
        });

        return {
          key: String(year),
          label: String(year),
          count,
          segments,
          current: year === currentYear,
        };
      }),
    };
  }

  const monthFormatter = new Intl.DateTimeFormat("zh-CN", { month: "short" });
  const getMonth = (battle: Battle) => {
    const match = battle.startDate?.match(/^\d{4}-(\d{1,2})(?:-\d{1,2})?$/);
    const month = match ? Number(match[1]) : Number.NaN;
    return month >= 1 && month <= 12 ? month : null;
  };
  const datedBattles = scopedBattles.map((battle) => ({ battle, month: getMonth(battle) }));

  if (scopedBattles.length > 0 && datedBattles.every(({ month }) => month !== null)) {
    return {
      mode: "month",
      title: `${currentYear} 年月份分布`,
      legend: ["事件数"],
      bars: Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const count = datedBattles.filter((item) => item.month === month).length;
        return {
          key: String(month),
          label: monthFormatter.format(new Date(currentYear, index, 1)),
          count,
          segments: [{ key: `${month}-events`, label: "事件数", count }],
        };
      }),
    };
  }

  const rankedTypes = Array.from(typeCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

  return {
    mode: "type",
    title: `${currentYear} 年事件类型分布`,
    legend: rankedTypes.map(([type]) => type),
    bars: rankedTypes.map(([type, count]) => ({
      key: type,
      label: type,
      count,
      segments: [{ key: type, label: type, count }],
    })),
  };
}
