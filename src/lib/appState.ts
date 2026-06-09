import type { Battle } from "../types/domain";

type NamedRow = {
  id: string;
  name: string;
};

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

export function getTimelineSelectionState(
  filteredEvents: Battle[],
  selectedEventId: string,
  currentYear: number,
) {
  const selectedEvent = filteredEvents.find((event) => event.id === selectedEventId);

  return {
    selectedEventId,
    currentYear: selectedEvent?.year ?? currentYear,
  };
}

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
