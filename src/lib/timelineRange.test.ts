import { describe, expect, it } from "vitest";
import {
  getClosestYearRangeBoundary,
  getDraggedYearRange,
  normalizeYearRange,
  resolveOverlappingRangeBoundary,
  updateYearRangeBoundary,
} from "./timelineRange";

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

  it("selects the nearest endpoint for an existing range", () => {
    expect(getClosestYearRangeBoundary([1939, 1945], 1940)).toBe("start");
    expect(getClosestYearRangeBoundary([1939, 1945], 1944)).toBe("end");
    expect(getClosestYearRangeBoundary([1939, 1945], 1942)).toBe("end");
  });

  it("waits for movement before choosing a boundary from an overlapping range", () => {
    expect(getClosestYearRangeBoundary([1944, 1944], 1944)).toBeNull();
    expect(resolveOverlappingRangeBoundary(1944, 1944)).toBeNull();
    expect(resolveOverlappingRangeBoundary(1944, 1940)).toBe("start");
    expect(resolveOverlappingRangeBoundary(1944, 1948)).toBe("end");
  });

  it("continues dragging in either direction after endpoints meet", () => {
    expect(getDraggedYearRange(1944, 1939, [1886, 2003])).toEqual([1939, 1944]);
    expect(getDraggedYearRange(1944, 1949, [1886, 2003])).toEqual([1944, 1949]);
    expect(getDraggedYearRange(1886, 1800, [1886, 2003])).toEqual([1886, 1886]);
  });
});
