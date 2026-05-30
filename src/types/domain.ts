export type Battle = {
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
  result?: string;
  type?: string;
  description?: string;
};

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

export type BattleFilters = {
  selectedWarId: string | null;
  selectedYearRange: YearRange;
  selectedParticipant: string | null;
};

export type BattleSummary = {
  totalBattles: number;
  yearRange: YearRange | null;
  topParticipants: Array<[string, number]>;
  battlesByType: Record<string, number>;
  battlesByWar: Record<string, number>;
};
