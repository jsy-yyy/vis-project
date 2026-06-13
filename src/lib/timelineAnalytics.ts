import type { Battle, YearRange } from "../types/domain";

export type YearlyEventCount = {
  year: number;
  count: number;
};

export type YearlyEventSummary = {
  year: number;
  totalCount: number;
  filteredCount: number;
  topConflictGroups: Array<[string, number]>;
  topParticipants: Array<[string, number]>;
  sampleEvents: Battle[];
};

export type TimelinePeriodComparison = {
  previousRange: YearRange | null;
  previousCount: number;
  nextRange: YearRange | null;
  nextCount: number;
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
    topConflictGroups: getTopEntries(filteredYearBattles.map((battle) => battle.warId)),
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
