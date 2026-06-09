export type ConflictEvent = {
  id: string;
  name: string;
  warId: string;
  year: number;
  startDate?: string;
  endDate?: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  participants: string[];
  participantNames?: string[];
  winnerNames?: string[];
  loserNames?: string[];
  participant1Names?: string[];
  participant2Names?: string[];
  eventCountry?: string;
  result?: string;
  type?: string;
  description?: string;
  source?: string;
};

export type Battle = ConflictEvent;

export type War = {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  description?: string;
};

export type Participant = {
  id: string;
  name: string;
  side?: string;
  type?: "country" | "empire" | "alliance" | "other";
};

export type YearRange = [number, number];

export type ConflictEventFilters = {
  selectedWarId: string | null;
  selectedYearRange: YearRange;
  selectedParticipant: string | null;
};

export type BattleFilters = ConflictEventFilters;

export type ConflictEventSummary = {
  totalBattles: number;
  yearRange: YearRange | null;
  topParticipants: Array<[string, number]>;
  battlesByType: Record<string, number>;
  battlesByWar: Record<string, number>;
};

export type BattleSummary = ConflictEventSummary;
