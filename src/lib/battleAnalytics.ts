import type { Battle, BattleFilters, BattleSummary, YearRange } from "../types/domain";

export function getBattleYearRange(battles: Battle[]): YearRange {
  if (battles.length === 0) {
    return [1886, 2003];
  }

  const years = battles.map((battle) => battle.year);
  return [Math.min(...years), Math.max(...years)];
}

export function getClosestBattleYear(battles: Battle[], preferredYear: number): number {
  if (battles.length === 0) {
    return preferredYear;
  }

  return battles.reduce((closestYear, battle) => {
    const closestDistance = Math.abs(closestYear - preferredYear);
    const battleDistance = Math.abs(battle.year - preferredYear);

    return battleDistance < closestDistance ? battle.year : closestYear;
  }, battles[0].year);
}

export function filterBattles(battles: Battle[], filters: BattleFilters): Battle[] {
  const { selectedYearRange, selectedParticipant } = filters;
  const [startYear, endYear] = selectedYearRange;

  return battles.filter((battle) => {
    const matchesYear = battle.year >= startYear && battle.year <= endYear;
    const matchesParticipant =
      !selectedParticipant ||
      selectedParticipant === "all" ||
      battle.participants.includes(selectedParticipant);

    return matchesYear && matchesParticipant;
  });
}

export function summarizeBattles(battles: Battle[]): BattleSummary {
  const participantCounts = new Map<string, number>();
  const battlesByType: Record<string, number> = {};

  for (const battle of battles) {
    battlesByType[battle.type ?? "unknown"] = (battlesByType[battle.type ?? "unknown"] ?? 0) + 1;

    for (const participant of new Set(battle.participants)) {
      participantCounts.set(participant, (participantCounts.get(participant) ?? 0) + 1);
    }
  }

  return {
    totalBattles: battles.length,
    yearRange: battles.length > 0 ? getBattleYearRange(battles) : null,
    topParticipants: Array.from(participantCounts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0]);
    }),
    battlesByType: Object.fromEntries(Object.entries(battlesByType).sort(([a], [b]) => a.localeCompare(b))),
  };
}

export type CompactTypeEntry = {
  type: string;
  count: number;
  percentage: number;
};

export function getCompactTypeBreakdown(
  battlesByType: Record<string, number>,
  visibleLimit = 4,
): CompactTypeEntry[] {
  const ranked = Object.entries(battlesByType)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const total = ranked.reduce((sum, [, count]) => sum + count, 0);
  const visible = ranked.slice(0, visibleLimit);
  const otherCount = ranked.slice(visibleLimit).reduce((sum, [, count]) => sum + count, 0);
  const entries = otherCount > 0 ? [...visible, ["其他", otherCount] as [string, number]] : visible;

  return entries.map(([type, count]) => ({
    type,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

export function getSelectedBattle(battles: Battle[], selectedBattleId: string | null): Battle | null {
  if (!selectedBattleId) {
    return null;
  }

  return battles.find((battle) => battle.id === selectedBattleId) ?? null;
}

export const getConflictEventYearRange = getBattleYearRange;
export const getClosestConflictEventYear = getClosestBattleYear;
export const filterConflictEvents = filterBattles;
export const summarizeConflictEvents = summarizeBattles;
export const getSelectedConflictEvent = getSelectedBattle;
