import { describe, expect, it } from "vitest";
import { filterBattles, getClosestBattleYear, summarizeBattles } from "./battleAnalytics";

const battles = [
  {
    id: "battle-waterloo",
    name: "Battle of Waterloo",
    warId: "napoleonic-wars",
    year: 1815,
    latitude: 50.68,
    longitude: 4.41,
    participants: ["france", "united-kingdom", "prussia"],
    result: "Coalition victory",
    type: "land battle",
  },
  {
    id: "battle-borodino",
    name: "Battle of Borodino",
    warId: "napoleonic-wars",
    year: 1812,
    latitude: 55.52,
    longitude: 35.82,
    participants: ["france", "russian-empire"],
    result: "French tactical victory",
    type: "land battle",
  },
  {
    id: "battle-britain",
    name: "Battle of Britain",
    warId: "ww2",
    year: 1940,
    latitude: 51.5,
    longitude: -0.12,
    participants: ["united-kingdom", "germany"],
    result: "British victory",
    type: "air battle",
  },
];

describe("battle analytics", () => {
  it("filters battles by war, year range, and selected participant", () => {
    const filtered = filterBattles(battles, {
      selectedWarId: "napoleonic-wars",
      selectedYearRange: [1813, 1815],
      selectedParticipant: "france",
    });

    expect(filtered.map((battle) => battle.id)).toEqual(["battle-waterloo"]);
  });

  it("summarizes filtered battles for the dashboard panels", () => {
    const summary = summarizeBattles(battles);

    expect(summary.totalBattles).toBe(3);
    expect(summary.yearRange).toEqual([1812, 1940]);
    expect(summary.topParticipants.slice(0, 2)).toEqual([
      ["france", 2],
      ["united-kingdom", 2],
    ]);
    expect(summary.battlesByType).toEqual({
      "air battle": 1,
      "land battle": 2,
    });
  });

  it("finds the closest year with a visible battle", () => {
    expect(getClosestBattleYear(battles, 2000)).toBe(1940);
    expect(getClosestBattleYear(battles, 1814)).toBe(1815);
    expect(getClosestBattleYear([], 2003)).toBe(2003);
  });

  it("counts a participant only once per conflict event", () => {
    const summary = summarizeBattles([
      {
        ...battles[0],
        participants: ["france", "france", "prussia"],
      },
    ]);

    expect(summary.topParticipants).toEqual([
      ["france", 1],
      ["prussia", 1],
    ]);
  });
});
