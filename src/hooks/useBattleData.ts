import { useEffect, useState } from "react";
import type { Battle, Participant, War } from "../types/domain";

type BattleDataState = {
  battles: Battle[];
  wars: War[];
  participants: Participant[];
  loading: boolean;
  error: Error | null;
};

type HcedEventRow = {
  event_id: string;
  event_name: string;
  war_name: string;
  year: string;
  location_name: string;
  latitude: string;
  longitude: string;
  participants: string;
  raw_participants: string;
  winner: string;
  loser: string;
  participant_1: string;
  participant_2: string;
  country: string;
  outcome: string;
  event_type: string;
  narrative: string;
  source: string;
};

const hcedCsvPath = "/data/hced/conflict_events.csv";

function parseCsv(text: string): HcedEventRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;

  return dataRows
    .filter((dataRow) => dataRow.some((value) => value.trim() !== ""))
    .map((dataRow) =>
      Object.fromEntries(headers.map((header, index) => [header.trim(), dataRow[index]?.trim() ?? ""])),
    ) as HcedEventRow[];
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "unknown";
}

function parseList(value = "") {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapRows(rows: HcedEventRow[]) {
  const warYears = new Map<string, { id: string; name: string; startYear: number; endYear: number }>();
  const participantLookup = new Map<string, string>();

  const battles = rows.map((row): Battle => {
    const year = Number(row.year);
    const warName = row.war_name || "Unclassified conflict";
    const warId = slugify(warName);
    const rawParticipantNames = parseList(row.participants);
    const participantIds = rawParticipantNames.map((participantName) => {
      const participantId = slugify(participantName);
      participantLookup.set(participantId, participantName);
      return participantId;
    });
    const war = warYears.get(warId);

    if (war) {
      war.startYear = Math.min(war.startYear, year);
      war.endYear = Math.max(war.endYear, year);
    } else {
      warYears.set(warId, {
        id: warId,
        name: warName,
        startYear: year,
        endYear: year,
      });
    }

    return {
      id: row.event_id,
      name: row.event_name || row.event_id,
      warId,
      year,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      locationName: row.location_name || undefined,
      participants: participantIds,
      participantNames: rawParticipantNames,
      rawParticipantNames: parseList(row.raw_participants),
      winnerNames: parseList(row.winner),
      loserNames: parseList(row.loser),
      participant1Names: parseList(row.participant_1),
      participant2Names: parseList(row.participant_2),
      eventCountry: row.country || undefined,
      result: row.outcome || undefined,
      type: row.event_type || "Conflict event",
      description: row.narrative || undefined,
      source: row.source || undefined,
    };
  });

  const wars: War[] = Array.from(warYears.values()).sort((a, b) => {
    if (a.startYear !== b.startYear) {
      return a.startYear - b.startYear;
    }
    return a.name.localeCompare(b.name);
  });

  const participants: Participant[] = Array.from(participantLookup.entries())
    .map(([id, name]) => ({ id, name, type: "other" as const }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { battles, wars, participants };
}

export function useBattleData(): BattleDataState {
  const [state, setState] = useState<BattleDataState>({
    battles: [],
    wars: [],
    participants: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    fetch(hcedCsvPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load HCED conflict events: ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        if (!active) {
          return;
        }

        setState({
          ...mapRows(parseCsv(text)),
          loading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setState({
          battles: [],
          wars: [],
          participants: [],
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
