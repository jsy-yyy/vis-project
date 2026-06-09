import type { Battle, BattleFilters, BattleSummary, YearRange } from "../types/domain";

export function getBattleYearRange(battles: Battle[]): YearRange {
  if (battles.length === 0) {
    return [1886, 2003];
  }

  const years = battles.map((battle) => battle.year);
  return [Math.min(...years), Math.max(...years)];
}

export function filterBattles(battles: Battle[], filters: BattleFilters): Battle[] {
  const { selectedWarId, selectedYearRange, selectedParticipant } = filters;
  const [startYear, endYear] = selectedYearRange;

  return battles.filter((battle) => {
    const matchesWar = !selectedWarId || selectedWarId === "all" || battle.warId === selectedWarId;
    const matchesYear = battle.year >= startYear && battle.year <= endYear;
    const matchesParticipant =
      !selectedParticipant ||
      selectedParticipant === "all" ||
      battle.participants.includes(selectedParticipant);

    return matchesWar && matchesYear && matchesParticipant;
  });
}

export function summarizeBattles(battles: Battle[]): BattleSummary {
  const participantCounts = new Map<string, number>();
  const battlesByType: Record<string, number> = {};
  const battlesByWar: Record<string, number> = {};

  for (const battle of battles) {
    battlesByType[battle.type ?? "unknown"] = (battlesByType[battle.type ?? "unknown"] ?? 0) + 1;
    battlesByWar[battle.warId] = (battlesByWar[battle.warId] ?? 0) + 1;

    for (const participant of battle.participants) {
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
    battlesByWar: Object.fromEntries(Object.entries(battlesByWar).sort(([a], [b]) => a.localeCompare(b))),
  };
}

export function getSelectedBattle(battles: Battle[], selectedBattleId: string | null): Battle | null {
  if (!selectedBattleId) {
    return null;
  }

  return battles.find((battle) => battle.id === selectedBattleId) ?? null;
}

export const getConflictEventYearRange = getBattleYearRange;
export const filterConflictEvents = filterBattles;
export const summarizeConflictEvents = summarizeBattles;
export const getSelectedConflictEvent = getSelectedBattle;
