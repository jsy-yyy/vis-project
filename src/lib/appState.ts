import type { Battle } from "../types/domain";
import type { YearRange } from "../types/domain";

type NamedRow = {
  id: string;
  name: string;
};

export function filterNamedRows<T extends NamedRow>(rows: T[], searchText: string): T[] {
  const query = searchText.trim().toLowerCase();

  if (!query) {
    return rows;
  }

  return rows.filter((row) => row.name.toLowerCase().includes(query) || row.id.toLowerCase().includes(query));
}

export function getLimitedEntries<T>(entries: Array<[T, number]>, limit: number) {
  const safeLimit = Math.max(0, limit);

  return {
    visibleEntries: entries.slice(0, safeLimit),
    hiddenCount: Math.max(0, entries.length - safeLimit),
  };
}

export function getVisibleSelectedEvent(
  filteredEvents: Battle[],
  mapEvents: Battle[],
  selectedEventId: string | null,
): Battle | null {
  if (!selectedEventId) {
    return null;
  }

  return (
    filteredEvents.find((event) => event.id === selectedEventId) ??
    mapEvents.find((event) => event.id === selectedEventId) ??
    null
  );
}

export type SharedAppState = {
  currentYear: number | null;
  selectedYearRange: YearRange | null;
  selectedParticipant: string | null;
  selectedBattleId: string | null;
  selectedBattleLocked: boolean;
};

function parseOptionalInteger(value: string | null) {
  if (value === null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function parseSharedAppState(search: string): SharedAppState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const start = parseOptionalInteger(params.get("start"));
  const end = parseOptionalInteger(params.get("end"));
  const year = parseOptionalInteger(params.get("year"));
  const selectedBattleId = params.get("event")?.trim() || null;

  return {
    currentYear: year,
    selectedYearRange: start !== null && end !== null ? [start, end] : null,
    selectedParticipant: params.get("participant")?.trim() || null,
    selectedBattleId,
    selectedBattleLocked: params.get("locked") === "1" && Boolean(selectedBattleId),
  };
}

type BuildSharedAppStateInput = {
  allYearRange: YearRange;
  currentYear: number;
  selectedYearRange: YearRange;
  selectedParticipant: string | null;
  selectedBattleId: string | null;
  selectedBattleLocked: boolean;
};

export function buildSharedAppSearch({
  allYearRange,
  currentYear,
  selectedYearRange,
  selectedParticipant,
  selectedBattleId,
  selectedBattleLocked,
}: BuildSharedAppStateInput) {
  const params = new URLSearchParams();

  if (currentYear !== allYearRange[1]) {
    params.set("year", String(currentYear));
  }

  if (selectedYearRange[0] !== allYearRange[0]) {
    params.set("start", String(selectedYearRange[0]));
  }

  if (selectedYearRange[1] !== allYearRange[1]) {
    params.set("end", String(selectedYearRange[1]));
  }

  if (selectedParticipant) {
    params.set("participant", selectedParticipant);
  }

  if (selectedBattleId) {
    params.set("event", selectedBattleId);
  }

  if (selectedBattleId && selectedBattleLocked) {
    params.set("locked", "1");
  }

  const value = params.toString();
  return value ? `?${value}` : "";
}

export function clampYearRange(range: YearRange | null, allYearRange: YearRange): YearRange {
  if (!range) {
    return allYearRange;
  }

  const start = Math.min(Math.max(range[0], allYearRange[0]), allYearRange[1]);
  const end = Math.min(Math.max(range[1], allYearRange[0]), allYearRange[1]);
  return start <= end ? [start, end] : [end, start];
}

export function getSelectedEvent(
  allEvents: Battle[],
  filteredEvents: Battle[],
  mapEvents: Battle[],
  selectedEventId: string | null,
  locked: boolean,
): Battle | null {
  const visibleEvent = getVisibleSelectedEvent(filteredEvents, mapEvents, selectedEventId);

  if (visibleEvent || !locked || !selectedEventId) {
    return visibleEvent;
  }

  return allEvents.find((event) => event.id === selectedEventId) ?? null;
}

export function getSelectionScopeStatus(
  filteredEvents: Battle[],
  mapEvents: Battle[],
  selectedEventId: string | null,
) {
  if (!selectedEventId) {
    return { inFilteredScope: false, inMapYear: false };
  }

  return {
    inFilteredScope: filteredEvents.some((event) => event.id === selectedEventId),
    inMapYear: mapEvents.some((event) => event.id === selectedEventId),
  };
}
