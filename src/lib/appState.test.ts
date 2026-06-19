import { describe, expect, it } from "vitest";
import {
  buildSharedAppSearch,
  filterNamedRows,
  getLimitedEntries,
  getSelectedEvent,
  getVisibleSelectedEvent,
  parseSharedAppState,
} from "./appState";
import type { Battle } from "../types/domain";

const events: Battle[] = [
  {
    id: "event-1914",
    name: "1914 event",
    warId: "world-war-i",
    year: 1914,
    latitude: 0,
    longitude: 0,
    participants: ["germany"],
  },
  {
    id: "event-1918",
    name: "1918 event",
    warId: "world-war-i",
    year: 1918,
    latitude: 1,
    longitude: 1,
    participants: ["france"],
  },
];

describe("app state helpers", () => {
  it("filters named rows with case-insensitive search text", () => {
    expect(
      filterNamedRows(
        [
          { id: "world-war-i", name: "World War I" },
          { id: "korean-war", name: "Korean War" },
        ],
        "world",
      ),
    ).toEqual([{ id: "world-war-i", name: "World War I" }]);
  });

  it("limits ranked summary entries and reports hidden entries", () => {
    expect(
      getLimitedEntries(
        [
          ["a", 5],
          ["b", 4],
          ["c", 3],
        ],
        2,
      ),
    ).toEqual({
      visibleEntries: [
        ["a", 5],
        ["b", 4],
      ],
      hiddenCount: 1,
    });
  });

  it("resolves selected detail from the full filtered event window", () => {
    const mapEvents = events.filter((event) => event.year === 1914);

    expect(getVisibleSelectedEvent(events, mapEvents, "event-1918")?.id).toBe("event-1918");
  });

  it("keeps a locked event available outside the filtered scope", () => {
    expect(getSelectedEvent(events, [], [], "event-1918", true)?.id).toBe("event-1918");
    expect(getSelectedEvent(events, [], [], "event-1918", false)).toBeNull();
  });

  it("parses shared URL state including a locked event", () => {
    expect(
      parseSharedAppState(
        "?year=1944&start=1939&end=1945&group=world-war-ii&participant=germany&event=event-1918&locked=1",
      ),
    ).toEqual({
      currentYear: 1944,
      selectedYearRange: [1939, 1945],
      selectedParticipant: "germany",
      selectedBattleId: "event-1918",
      selectedBattleLocked: true,
    });
  });

  it("does not treat missing numeric URL parameters as zero", () => {
    expect(parseSharedAppState("")).toEqual({
      currentYear: null,
      selectedYearRange: null,
      selectedParticipant: null,
      selectedBattleId: null,
      selectedBattleLocked: false,
    });
  });

  it("serializes only non-default shared state", () => {
    expect(
      buildSharedAppSearch({
        allYearRange: [1886, 2003],
        currentYear: 1944,
        selectedYearRange: [1939, 1945],
        selectedParticipant: "germany",
        selectedBattleId: "event-1918",
        selectedBattleLocked: true,
      }),
    ).toBe(
      "?year=1944&start=1939&end=1945&participant=germany&event=event-1918&locked=1",
    );
  });

  it("ignores the legacy group parameter when restoring shared state", () => {
    expect(parseSharedAppState("?year=1944&group=world-war-ii")).toEqual({
      currentYear: 1944,
      selectedYearRange: null,
      selectedParticipant: null,
      selectedBattleId: null,
      selectedBattleLocked: false,
    });
  });
});
