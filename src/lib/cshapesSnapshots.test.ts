import { describe, expect, it } from "vitest";
import { resolveCShapesSnapshot } from "./cshapesSnapshots";

describe("CShapes snapshot resolution", () => {
  it.each([
    [1886, 1890],
    [1939, 1939],
    [1944, 1940],
    [1945, 1945],
    [1991, 1991],
    [2003, 2003],
  ])("maps requested year %i to snapshot %i", (requestedYear, snapshotYear) => {
    expect(resolveCShapesSnapshot(requestedYear)).toMatchObject({
      requestedYear,
      year: snapshotYear,
      label: String(snapshotYear),
    });
  });
});
