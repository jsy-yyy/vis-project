import type { Actor, Battle } from "../types/domain";

const sovietStartYear = 1922;
const sovietEndYear = 1991;

export function canonicalParticipantId(participantId: string, year: number): string {
  if (participantId === "russia" && year >= sovietStartYear && year <= sovietEndYear) {
    return "ussr";
  }

  return participantId;
}

export function getCanonicalParticipantName(participantId: string): string {
  if (participantId === "ussr") {
    return "USSR";
  }

  return participantId;
}

function canonicalizeActor(actor: Actor, year: number): Actor {
  const id = canonicalParticipantId(actor.id, year);

  if (id === actor.id) {
    return actor;
  }

  return {
    ...actor,
    id,
    name: getCanonicalParticipantName(id),
    mapTarget: getCanonicalParticipantName(id),
  };
}

export function canonicalizeBattleParticipants(battle: Battle): Battle {
  const participants = Array.from(
    new Set(battle.participants.map((participantId) => canonicalParticipantId(participantId, battle.year))),
  );
  const participantNames = participants.map(getCanonicalParticipantName);

  return {
    ...battle,
    participants,
    participantNames,
    actors: battle.actors?.map((actor) => canonicalizeActor(actor, battle.year)),
  };
}
