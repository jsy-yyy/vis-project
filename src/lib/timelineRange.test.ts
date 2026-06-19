import { describe, expect, it } from "vitest";
import { normalizeYearRange, updateYearRangeBoundary } from "./timelineRange";

describe("timeline range helpers", () => {
  it("normalizes forward and reverse brushing", () => {
    expect(normalizeYearRange(1939, 1945, [1886, 2003])).toEqual([1939, 1945]);
    expect(normalizeYearRange(1945, 1939, [1886, 2003])).toEqual([1939, 1945]);
  });

  it("clamps brushing to the available data range", () => {
    expect(normalizeYearRange(1800, 2100, [1886, 2003])).toEqual([1886, 2003]);
  });

  it("keeps accessible boundary inputs ordered", () => {
    expect(updateYearRangeBoundary([1939, 1945], "start", 1950, [1886, 2003])).toEqual([1945, 1950]);
    expect(updateYearRangeBoundary([1939, 1945], "end", 1930, [1886, 2003])).toEqual([1930, 1939]);
  });
});
