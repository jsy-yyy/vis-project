import { describe, expect, it } from "vitest";
import { filterNamedRows, getLimitedEntries, getVisibleSelectedEvent } from "./appState";
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
});
