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

describe("network analytics", () => {
  it("counts participant events and co-occurrence edges without duplicating participants within an event", () => {
    const network = buildParticipantNetwork([
      createBattle("a", ["british", "german"]),
      createBattle("b", ["british", "german", "french"]),
      createBattle("c", ["british", "french", "french"]),
    ]);

    expect(network.nodes).toEqual([
      { id: "british", eventCount: 3 },
      { id: "french", eventCount: 2 },
      { id: "german", eventCount: 2 },
    ]);
    expect(network.edges).toEqual([
      { source: "british", target: "french", weight: 2 },
      { source: "british", target: "german", weight: 2 },
      { source: "french", target: "german", weight: 1 },
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
      { id: "british", eventCount: 2 },
      { id: "german", eventCount: 2 },
    ]);
    expect(network.edges).toEqual([{ source: "british", target: "german", weight: 2 }]);
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
      { id: "british", eventCount: 3 },
      { id: "french", eventCount: 2 },
    ]);
    expect(network.edges).toEqual([{ source: "british", target: "french", weight: 2 }]);
  });
});
