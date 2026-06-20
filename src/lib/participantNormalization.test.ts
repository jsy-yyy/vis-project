import { describe, expect, it } from "vitest";
import type { Battle } from "../types/domain";
import {
  canonicalParticipantId,
  canonicalizeBattleParticipants,
} from "./participantNormalization";

describe("participant normalization", () => {
  it("maps Russia to USSR only during the Soviet period", () => {
    expect(canonicalParticipantId("russia", 1916)).toBe("russia");
    expect(canonicalParticipantId("russia", 1941)).toBe("ussr");
    expect(canonicalParticipantId("russia", 1992)).toBe("russia");
  });

  it("merges Rumania into Romania while preserving its historical map target", () => {
    expect(canonicalParticipantId("rumania", 1944)).toBe("romania");

    const canonicalBattle = canonicalizeBattleParticipants({
      id: "romania-1944",
      name: "Romania",
      warId: "world-war-ii",
      year: 1944,
      latitude: 0,
      longitude: 0,
      participants: ["romania", "rumania"],
      actors: [
        {
          id: "rumania",
          rawName: "Romania",
          name: "Rumania",
          role: "winner",
          type: "country",
          confidence: "high",
          mapTarget: "Rumania",
          networkEligible: true,
          sourceField: "Winner",
          status: "mapped",
        },
      ],
    });

    expect(canonicalBattle.participants).toEqual(["romania"]);
    expect(canonicalBattle.participantNames).toEqual(["Romania"]);
    expect(canonicalBattle.actors?.[0]).toMatchObject({
      id: "romania",
      name: "Romania",
      mapTarget: "Rumania",
    });
  });

  it("deduplicates canonical participants and preserves raw participant data", () => {
    const battle: Battle = {
      id: "test-1944",
      name: "Test",
      warId: "test",
      year: 1944,
      latitude: 0,
      longitude: 0,
      participants: ["russia", "ussr"],
      participantNames: ["Russia", "USSR"],
      rawParticipantNames: ["Russian", "Soviet"],
      actors: [
        {
          id: "russia",
          rawName: "Russian",
          name: "Russia",
          role: "participant",
          type: "country",
          confidence: "high",
          mapTarget: "Russia",
          networkEligible: true,
          sourceField: "Participants",
          status: "mapped",
        },
      ],
    };

    const canonicalBattle = canonicalizeBattleParticipants(battle);

    expect(canonicalBattle.participants).toEqual(["ussr"]);
    expect(canonicalBattle.participantNames).toEqual(["USSR"]);
    expect(canonicalBattle.rawParticipantNames).toEqual(["Russian", "Soviet"]);
    expect(canonicalBattle.actors?.[0]).toMatchObject({
      id: "ussr",
      name: "USSR",
      mapTarget: "USSR",
    });
  });
});
