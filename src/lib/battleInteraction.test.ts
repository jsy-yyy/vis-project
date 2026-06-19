import { describe, expect, it } from "vitest";
import type { Battle } from "../types/domain";
import {
  getAdjacentBattleId,
  getAdjacentPlayableYear,
  getFocusedBattleState,
  getPlayableYears,
  getVisibleBattlePage,
  searchAndSortBattles,
} from "./battleInteraction";

const battles = [
  {
    id: "b",
    name: "Zulu Raid",
    warId: "war-b",
    year: 1942,
    latitude: 0,
    longitude: 0,
    locationName: "Cairo",
    type: "Air",
    participants: ["uk"],
  },
  {
    id: "a",
    name: "Alpha Landing",
    warId: "war-a",
    year: 1940,
    latitude: 0,
    longitude: 0,
    locationName: "Normandy",
    type: "Land",
    participants: ["france"],
  },
  {
    id: "c",
    name: "Midway",
    warId: "war-a",
    year: 1945,
    latitude: 0,
    longitude: 0,
    locationName: "Pacific",
    type: "Sea",
    participants: ["usa"],
  },
] satisfies Battle[];

describe("battle interaction helpers", () => {
  it("searches name, location, type, and participant labels", () => {
    const participantNames = new Map([["uk", "United Kingdom"]]);
    expect(searchAndSortBattles(battles, "kingdom", "name", participantNames).map((battle) => battle.id)).toEqual(["b"]);
    expect(searchAndSortBattles(battles, "pacific", "name").map((battle) => battle.id)).toEqual(["c"]);
  });

  it("sorts and paginates event lists", () => {
    expect(searchAndSortBattles(battles, "", "location").map((battle) => battle.id)).toEqual(["b", "a", "c"]);
    expect(getVisibleBattlePage(battles, false, 2).map((battle) => battle.id)).toEqual(["b", "a"]);
    expect(getVisibleBattlePage(battles, true, 2)).toHaveLength(3);
  });

  it("respects previous and next event boundaries", () => {
    expect(getAdjacentBattleId(battles, "b", -1)).toBeNull();
    expect(getAdjacentBattleId(battles, "b", 1)).toBe("a");
    expect(getAdjacentBattleId(battles, "c", 1)).toBeNull();
  });

  it("builds playback years that skip empty years and stop at the end", () => {
    const years = getPlayableYears(battles);
    expect(years).toEqual([1940, 1942, 1945]);
    expect(getAdjacentPlayableYear(years, 1940, 1)).toBe(1942);
    expect(getAdjacentPlayableYear(years, 1945, 1)).toBeNull();
    expect(getAdjacentPlayableYear(years, 1942, -1)).toBe(1940);
  });

  it("focuses an event without changing the existing lock choice", () => {
    expect(getFocusedBattleState(battles, "a", true)).toMatchObject({
      currentYear: 1940,
      selectedBattleId: "a",
      selectedBattleLocked: true,
    });
  });
});
