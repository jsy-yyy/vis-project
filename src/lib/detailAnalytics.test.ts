import { describe, expect, it } from "vitest";
import type { Battle, Participant } from "../types/domain";
import { getBattleSideGroups } from "./detailAnalytics";

const participants = [
  { id: "germany", name: "Germany" },
  { id: "france", name: "France" },
  { id: "belgium", name: "Belgium" },
] satisfies Participant[];

const battle = {
  id: "ardenes",
  name: "Ardennes",
  warId: "wwii",
  year: 1940,
  latitude: 0,
  longitude: 0,
  participants: ["germany", "belgium", "france"],
  participantNames: ["Germany", "Belgium", "France", "France"],
  winnerNames: ["Germany"],
  loserNames: ["France"],
  actors: [
    {
      id: "germany",
      rawName: "German",
      name: "Germany",
      role: "participant",
      type: "country",
      confidence: "high",
      mapTarget: "Germany",
      networkEligible: true,
      sourceField: "Participants",
      status: "mapped",
    },
    {
      id: "germany",
      rawName: "Germany",
      name: "Germany",
      role: "winner",
      type: "country",
      confidence: "medium",
      mapTarget: "Germany",
      networkEligible: true,
      sourceField: "Winner",
      status: "mapped",
    },
    {
      id: "france",
      rawName: "France",
      name: "France",
      role: "loser",
      type: "country",
      confidence: "medium",
      mapTarget: "France",
      networkEligible: true,
      sourceField: "Loser",
      status: "mapped",
    },
  ],
} satisfies Battle;

describe("detail analytics", () => {
  it("deduplicates actors and separates winner, loser, and other participants", () => {
    expect(getBattleSideGroups(battle, participants)).toEqual({
      winner: ["Germany"],
      loser: ["France"],
      other: ["Belgium"],
    });
  });
});
