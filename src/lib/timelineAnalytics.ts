import type { Battle, YearRange } from "../types/domain";

export type YearlyEventCount = {
  year: number;
  count: number;
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