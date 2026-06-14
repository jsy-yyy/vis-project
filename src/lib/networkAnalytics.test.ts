import { describe, expect, it } from "vitest";
import type { Battle } from "../types/domain";
import { buildParticipantNetwork } from "./networkAnalytics";

function createBattle(id: string, participants: string[]): Battle {
  return {
    id,
    name: id,
    warId: "test-war",
    year: 1940,
    latitude: 0,
    longitude: 0,
    participants,
  };
}

function createBattleWithActors(id: string, participants: string[], roles: Record<string, "winner" | "loser">): Battle {
  return {
    ...createBattle(id, participants),
    actors: participants.map((participantId) => ({
      id: participantId,
      rawName: participantId,
      name: participantId,
      role: roles[participantId],
      type: "country",
      confidence: "high",
      networkEligible: true,
      sourceField: roles[participantId] === "winner" ? "Winner" : "Loser",
      status: "mapped",
    })),
  };
}

describe("network analytics", () => {
  it("counts participant events and co-occurrence edges without duplicating participants within an event", () => {
    const network = buildParticipantNetwork([
      createBattle("a", ["british", "german"]),
      createBattle("b", ["british", "german", "french"]),
      createBattle("c", ["british", "french", "french"]),
    ]);

    expect(network.nodes).toEqual([
      { id: "british", eventCount: 3, winnerCount: 0, loserCount: 0, neutralCount: 3, side: "neutral" },
      { id: "french", eventCount: 2, winnerCount: 0, loserCount: 0, neutralCount: 2, side: "neutral" },
      { id: "german", eventCount: 2, winnerCount: 0, loserCount: 0, neutralCount: 2, side: "neutral" },
    ]);
    expect(network.edges).toEqual([
      {
        source: "british",
        target: "french",
        weight: 2,
        allyWeight: 0,
        opponentWeight: 0,
        cooccurrenceWeight: 2,
        relation: "cooccurrence",
      },
      {
        source: "british",
        target: "german",
        weight: 2,
        allyWeight: 0,
        opponentWeight: 0,
        cooccurrenceWeight: 2,
        relation: "cooccurrence",
      },
      {
        source: "french",
        target: "german",
        weight: 1,
        allyWeight: 0,
        opponentWeight: 0,
        cooccurrenceWeight: 1,
        relation: "cooccurrence",
      },
    ]);
  });

  it("keeps edges only between the most active visible nodes", () => {
    const network = buildParticipantNetwork(
      [
        createBattle("a", ["british", "german", "french"]),
        createBattle("b", ["british", "german"]),
      ],
      2,
    );

    expect(network.nodes).toEqual([
      { id: "british", eventCount: 2, winnerCount: 0, loserCount: 0, neutralCount: 2, side: "neutral" },
      { id: "german", eventCount: 2, winnerCount: 0, loserCount: 0, neutralCount: 2, side: "neutral" },
    ]);
    expect(network.edges).toEqual([
      {
        source: "british",
        target: "german",
        weight: 2,
        allyWeight: 0,
        opponentWeight: 0,
        cooccurrenceWeight: 2,
        relation: "cooccurrence",
      },
    ]);
  });

  it("builds a one-hop focus network around the selected participant", () => {
    const network = buildParticipantNetwork(
      [
        createBattle("a", ["british", "german"]),
        createBattle("b", ["british", "french"]),
        createBattle("c", ["british", "french"]),
        createBattle("d", ["italian", "german"]),
      ],
      2,
      { focusedParticipantId: "british" },
    );

    expect(network.nodes).toEqual([
      { id: "british", eventCount: 3, winnerCount: 0, loserCount: 0, neutralCount: 3, side: "neutral" },
      { id: "french", eventCount: 2, winnerCount: 0, loserCount: 0, neutralCount: 2, side: "neutral" },
    ]);
    expect(network.edges).toEqual([
      {
        source: "british",
        target: "french",
        weight: 2,
        allyWeight: 0,
        opponentWeight: 0,
        cooccurrenceWeight: 2,
        relation: "cooccurrence",
      },
    ]);
  });

  it("classifies visible edges by winner and loser roles when actor data is available", () => {
    const network = buildParticipantNetwork([
      createBattleWithActors("a", ["british", "french", "german"], {
        british: "winner",
        french: "winner",
        german: "loser",
      }),
      createBattleWithActors("b", ["british", "german"], {
        british: "winner",
        german: "loser",
      }),
    ]);

    expect(network.edges).toEqual([
      {
        source: "british",
        target: "german",
        weight: 2,
        allyWeight: 0,
        opponentWeight: 2,
        cooccurrenceWeight: 0,
        relation: "opponent",
      },
      {
        source: "british",
        target: "french",
        weight: 1,
        allyWeight: 1,
        opponentWeight: 0,
        cooccurrenceWeight: 0,
        relation: "ally",
      },
      {
        source: "french",
        target: "german",
        weight: 1,
        allyWeight: 0,
        opponentWeight: 1,
        cooccurrenceWeight: 0,
        relation: "opponent",
      },
    ]);
    expect(network.nodes).toEqual([
      { id: "british", eventCount: 2, winnerCount: 2, loserCount: 0, neutralCount: 0, side: "winner" },
      { id: "german", eventCount: 2, winnerCount: 0, loserCount: 2, neutralCount: 0, side: "loser" },
      { id: "french", eventCount: 1, winnerCount: 1, loserCount: 0, neutralCount: 0, side: "winner" },
    ]);
  });
});
