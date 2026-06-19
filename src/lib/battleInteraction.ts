import type { Battle } from "../types/domain";

export type BattleSortKey = "name" | "location" | "type";

function getSearchText(battle: Battle, participantNames: Map<string, string>) {
  return [
    battle.name,
    battle.locationName,
    battle.type,
    ...battle.participants,
    ...battle.participants.map((participantId) => participantNames.get(participantId)),
    ...battle.participantNames ?? [],
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function getSortValue(battle: Battle, sortKey: BattleSortKey) {
  if (sortKey === "location") {
    return battle.locationName ?? "";
  }

  if (sortKey === "type") {
    return battle.type ?? "";
  }

  return battle.name;
}

export function searchAndSortBattles(
  battles: Battle[],
  query: string,
  sortKey: BattleSortKey,
  participantNames = new Map<string, string>(),
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return battles
    .filter((battle) => !normalizedQuery || getSearchText(battle, participantNames).includes(normalizedQuery))
    .sort((left, right) => {
      const primary = getSortValue(left, sortKey).localeCompare(getSortValue(right, sortKey));
      return primary || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
    });
}

export function getVisibleBattlePage(battles: Battle[], expanded: boolean, pageSize = 8) {
  return expanded ? battles : battles.slice(0, pageSize);
}

export function getAdjacentBattleId(
  battles: Battle[],
  selectedBattleId: string | null,
  direction: -1 | 1,
) {
  if (battles.length === 0) {
    return null;
  }

  const currentIndex = battles.findIndex((battle) => battle.id === selectedBattleId);
  if (currentIndex < 0) {
    return battles[direction === 1 ? 0 : battles.length - 1].id;
  }

  const nextIndex = currentIndex + direction;
  return nextIndex >= 0 && nextIndex < battles.length ? battles[nextIndex].id : null;
}

export function getPlayableYears(battles: Battle[]) {
  return Array.from(new Set(battles.map((battle) => battle.year))).sort((left, right) => left - right);
}

export function getAdjacentPlayableYear(years: number[], currentYear: number, direction: -1 | 1) {
  if (direction === 1) {
    return years.find((year) => year > currentYear) ?? null;
  }

  return [...years].reverse().find((year) => year < currentYear) ?? null;
}

export function getFocusedBattleState(
  battles: Battle[],
  battleId: string,
  selectedBattleLocked: boolean,
) {
  const battle = battles.find((row) => row.id === battleId);
  if (!battle) {
    return null;
  }

  return {
    battle,
    currentYear: battle.year,
    selectedBattleId: battle.id,
    selectedBattleLocked,
  };
}
