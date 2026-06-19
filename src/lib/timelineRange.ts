import type { YearRange } from "../types/domain";

export type YearRangeBoundary = "start" | "end";

function clampYear(year: number, bounds: YearRange) {
  return Math.min(bounds[1], Math.max(bounds[0], Math.round(year)));
}

export function normalizeYearRange(
  anchorYear: number,
  focusYear: number,
  bounds: YearRange,
): YearRange {
  const anchor = clampYear(anchorYear, bounds);
  const focus = clampYear(focusYear, bounds);
  return anchor <= focus ? [anchor, focus] : [focus, anchor];
}

export function updateYearRangeBoundary(
  range: YearRange,
  boundary: YearRangeBoundary,
  value: number,
  bounds: YearRange,
): YearRange {
  return boundary === "start"
    ? normalizeYearRange(value, range[1], bounds)
    : normalizeYearRange(range[0], value, bounds);
}

export function getClosestYearRangeBoundary(
  range: YearRange,
  pointerYear: number,
): YearRangeBoundary | null {
  if (range[0] === range[1]) {
    return null;
  }

  const startDistance = Math.abs(pointerYear - range[0]);
  const endDistance = Math.abs(pointerYear - range[1]);

  if (startDistance === endDistance) {
    return pointerYear < (range[0] + range[1]) / 2 ? "start" : "end";
  }

  return startDistance < endDistance ? "start" : "end";
}

export function resolveOverlappingRangeBoundary(
  originYear: number,
  pointerYear: number,
): YearRangeBoundary | null {
  if (pointerYear === originYear) {
    return null;
  }

  return pointerYear < originYear ? "start" : "end";
}

export function getDraggedYearRange(
  fixedYear: number,
  pointerYear: number,
  bounds: YearRange,
): YearRange {
  return normalizeYearRange(fixedYear, pointerYear, bounds);
}
