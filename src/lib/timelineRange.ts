import type { YearRange } from "../types/domain";

export function normalizeYearRange(
  anchorYear: number,
  focusYear: number,
  bounds: YearRange,
): YearRange {
  const clamp = (year: number) => Math.min(bounds[1], Math.max(bounds[0], Math.round(year)));
  const anchor = clamp(anchorYear);
  const focus = clamp(focusYear);
  return anchor <= focus ? [anchor, focus] : [focus, anchor];
}

export function updateYearRangeBoundary(
  range: YearRange,
  boundary: "start" | "end",
  value: number,
  bounds: YearRange,
): YearRange {
  return boundary === "start"
    ? normalizeYearRange(value, range[1], bounds)
    : normalizeYearRange(range[0], value, bounds);
}
