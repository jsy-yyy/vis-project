import type { Battle, Participant } from "../types/domain";

export type BattleSideGroups = {
  winner: string[];
  loser: string[];
  other: string[];
};

function normalizeName(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueNames(values: Array<string | undefined>) {
  const names = new Map<string, string>();

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) {
      continue;
    }
    const key = normalizeName(trimmed) || trimmed.toLocaleLowerCase();
    if (!names.has(key)) {
      names.set(key, trimmed);
    }
  }

  return Array.from(names.values());
}

export function getBattleSideGroups(
  battle: Battle,
  participants: Participant[],
): BattleSideGroups {
  const participantNames = new Map(participants.map((participant) => [participant.id, participant.name]));
  const actors = battle.actors ?? [];
  const winner = uniqueNames([
    ...actors.filter((actor) => actor.role === "winner").map((actor) => actor.mapTarget || actor.name),
    ...(battle.winnerNames ?? []),
  ]);
  const loser = uniqueNames([
    ...actors.filter((actor) => actor.role === "loser").map((actor) => actor.mapTarget || actor.name),
    ...(battle.loserNames ?? []),
  ]);
  const sideKeys = new Set([...winner, ...loser].map(normalizeName));
  const participantCandidates = battle.participants.map((id) => participantNames.get(id) ?? id);
  const other = uniqueNames([
    ...participantCandidates,
    ...actors.filter((actor) => actor.role === "participant").map((actor) => actor.mapTarget || actor.name),
  ]).filter((name) => !sideKeys.has(normalizeName(name)));

  return { winner, loser, other };
}
