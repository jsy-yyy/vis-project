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
  actors?: Actor[];
  participantNames?: string[];
  rawParticipantNames?: string[];
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

export type ActorRole = "participant" | "winner" | "loser" | "unknown";

export type ActorType =
  | "country"
  | "empire"
  | "alliance"
  | "faction"
  | "rebel_group"
  | "civilian_group"
  | "unknown";

export type ActorConfidence = "high" | "medium" | "low";

export type Actor = {
  id: string;
  rawName: string;
  name: string;
  role: ActorRole;
  type: ActorType;
  confidence: ActorConfidence;
  mapTarget?: string;
  networkEligible: boolean;
  sourceField: string;
  status: "mapped" | "mapped_internal" | "ambiguous" | "unmapped";
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
  type?: ActorType | "other";
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
