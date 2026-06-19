import { describe, expect, it } from "vitest";
import type { Battle } from "../types/domain";
import {
  filterBattlesByHeatCell,
  getHeatCellTargetZoom,
  getMapHeatCells,
  getMapLayerMode,
  shouldAutoFocusBattleSelection,
  shouldClearHeatCellFocus,
} from "./mapHeat";

const battles = [
  {
    id: "a-1944",
    name: "A",
    warId: "war-a",
    year: 1944,
    latitude: 35,
    longitude: 115,
    participants: ["china"],
  },
  {
    id: "b-1944",
    name: "B",
    warId: "war-a",
    year: 1944,
    latitude: 37,
    longitude: 115,
    participants: ["china"],
  },
  {
    id: "c-1945",
    name: "C",
    warId: "war-a",
    year: 1945,
    latitude: 36,
    longitude: 116,
    participants: ["china"],
  },
  {
    id: "d-1944",
    name: "D",
    warId: "war-b",
    year: 1944,
    latitude: 51,
    longitude: 13,
    participants: ["germany"],
  },
] satisfies Battle[];

describe("map heat helpers", () => {
  it("switches from heat cells to event markers at the zoom threshold", () => {
    expect(getMapLayerMode(4.99)).toBe("heat");
    expect(getMapLayerMode(5)).toBe("events");
    expect(getMapLayerMode(6)).toBe("events");
  });

  it("aggregates only the battles supplied for the current year", () => {
    const currentYearBattles = battles.filter((battle) => battle.year === 1944);
    const cells = getMapHeatCells(currentYearBattles);

    expect(cells.flatMap((cell) => cell.battleIds)).not.toContain("c-1945");
    expect(cells.reduce((total, cell) => total + cell.count, 0)).toBe(3);
  });

  it("calculates cell counts, centroids, bounds, and battle ids", () => {
    const cell = getMapHeatCells(battles.slice(0, 2))[0];

    expect(cell).toMatchObject({
      count: 2,
      latitude: 36,
      longitude: 115,
      battleIds: ["a-1944", "b-1944"],
      bounds: [[30, 108], [38, 116]],
    });
  });

  it("focuses the event list on one cell and restores it when focus clears", () => {
    const currentYearBattles = battles.filter((battle) => battle.year === 1944);
    const focusedCell = getMapHeatCells(currentYearBattles).find((cell) => cell.count === 2) ?? null;

    expect(filterBattlesByHeatCell(currentYearBattles, focusedCell).map((battle) => battle.id)).toEqual([
      "a-1944",
      "b-1944",
    ]);
    expect(filterBattlesByHeatCell(currentYearBattles, null)).toEqual(currentYearBattles);
  });

  it("targets the event marker zoom range when drilling into a heat cell", () => {
    expect(getHeatCellTargetZoom(3)).toBe(5);
    expect(getHeatCellTargetZoom(5.5)).toBe(5.5);
    expect(getHeatCellTargetZoom(9)).toBe(6);
  });

  it("clears heat cell focus after zooming back to aggregate mode", () => {
    expect(shouldClearHeatCellFocus(4.75)).toBe(true);
    expect(shouldClearHeatCellFocus(5)).toBe(false);
  });

  it("auto focuses only when the selected battle changes", () => {
    expect(shouldAutoFocusBattleSelection("a-1944", null)).toBe(true);
    expect(shouldAutoFocusBattleSelection("a-1944", "a-1944")).toBe(false);
    expect(shouldAutoFocusBattleSelection("b-1944", "a-1944")).toBe(true);
    expect(shouldAutoFocusBattleSelection(null, "a-1944")).toBe(false);
  });

  it("allows the same battle to auto focus again after selection is cleared", () => {
    expect(shouldAutoFocusBattleSelection("a-1944", null)).toBe(true);
  });
});
