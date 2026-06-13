import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const sourceUrl = "https://dataverse.harvard.edu/api/access/datafile/13390255";
const defaultSourcePath =
  process.platform === "darwin" ? "/private/tmp/hced-data-v3.csv" : resolve(rootDir, ".cache/hced-data-v3.csv");
const sourcePath = process.env.HCED_SOURCE ?? defaultSourcePath;
const outputPath = resolve(rootDir, "public/data/hced/conflict_events.csv");
const actorAuditPath = resolve(rootDir, "public/data/hced/actor_audit.csv");
const participantNormalizationPath = resolve(rootDir, "scripts/participant-normalization.csv");
const actorNormalizationPath = resolve(rootDir, "scripts/actor-normalization.csv");

const minYear = 1886;
const maxYear = 2003;

const outputHeaders = [
  "event_id",
  "event_name",
  "war_name",
  "year",
  "location_name",
  "latitude",
  "longitude",
  "participants",
  "raw_participants",
  "actors",
  "winner",
  "loser",
  "participant_1",
  "participant_2",
  "country",
  "outcome",
  "event_type",
  "narrative",
  "source",
];

const actorAuditHeaders = ["raw_name", "source_field", "status", "type", "count", "examples", "suggested_action"];

const actorRoles = new Set(["participant", "winner", "loser", "unknown"]);
const actorTypes = new Set([
  "country",
  "empire",
  "alliance",
  "faction",
  "rebel_group",
  "civilian_group",
  "unknown",
]);
const actorConfidences = new Set(["high", "medium", "low"]);

function parseCsv(text) {
  const rows = [];
  let row = [];
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
    );
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function parseList(value) {
  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function normalizeList(value) {
  return parseList(value).join("; ");
}

function normalizeLookupKey(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeWarLookupKey(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const warNameMappings = new Map([
  ["world war one", "World War I"],
  ["first world war", "World War I"],
  ["great war", "World War I"],
  ["world war i eastern front", "World War I"],
  ["world war i war at sea", "World War I"],
  ["world war two", "World War II"],
  ["second world war", "World War II"],
  ["world war ii war at sea", "World War II"],
  ["world war ii world war ii", "World War II"],
  ["world war ii the war", "World War II"],
  ["sino japanese war", "Sino-Japanese War"],
  ["spanish american war", "Spanish-American War"],
  ["iraq iran war", "Iran-Iraq War"],
  ["indo pakistani war", "Indo-Pakistan War"],
  ["1st indo pakistani war", "1st Indo-Pakistan War"],
  ["2nd indo pakistani war", "2nd Indo-Pakistan War"],
  ["3rd indo pakistani war", "3rd Indo-Pakistan War"],
]);

const ignoredWarNameFragments = new Set([
  "war at sea",
  "the war",
  "the battle of the somme",
  "eastern front",
]);

function inferWorldWarFromYear(year) {
  if (year >= 1914 && year <= 1918) {
    return "World War I";
  }

  if (year >= 1939 && year <= 1945) {
    return "World War II";
  }

  return null;
}

function correctWorldWarByYear(name, year) {
  if (name === "World War I" && year >= 1939 && year <= 1945) {
    return "World War II";
  }

  if (name === "World War II" && year >= 1914 && year <= 1918) {
    return "World War I";
  }

  return name;
}

function normalizeWarName(value, year) {
  const names = parseList(value)
    .flatMap((name) => name.split(";"))
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  if (names.length === 0) {
    return "Unclassified conflict";
  }

  const normalizedNames = [];
  const seen = new Set();

  for (const name of names) {
    const lookupKey = normalizeWarLookupKey(name);

    if (ignoredWarNameFragments.has(lookupKey)) {
      continue;
    }

    const canonicalName =
      warNameMappings.get(lookupKey) ??
      (lookupKey === "world war" ? inferWorldWarFromYear(year) : null) ??
      name.replace(/\s+/g, " ").trim();
    const correctedName = correctWorldWarByYear(canonicalName, year);

    const canonicalKey = normalizeWarLookupKey(correctedName);

    if (seen.has(canonicalKey)) {
      continue;
    }

    normalizedNames.push(correctedName);
    seen.add(canonicalKey);
  }

  return normalizedNames.length > 0 ? normalizedNames.join("; ") : "Unclassified conflict";
}

function normalizeActorKey(value) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value) {
  const slug = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "unknown";
}

function compact(values) {
  return values.filter((value) => value && value !== "NA").join("; ");
}

function getOutcome(row) {
  if (row.Winner && row.Loser) {
    return `${row.Winner} over ${row.Loser}`;
  }
  return row.Winner || row.Loser || "";
}

function getEventType(row) {
  if (row.Massacre?.toLowerCase() === "yes") {
    return "Massacre";
  }
  return row.Theatre || "Conflict event";
}

function getNarrative(row) {
  return compact([
    row.Country ? `Country: ${row.Country}` : "",
    row["Lehmann Zhukov Scale"] ? `Lehmann-Zhukov scale: ${row["Lehmann Zhukov Scale"]}` : "",
    row["Infered Scale"] ? `Inferred scale: ${row["Infered Scale"]}` : "",
    row.Minor ? `Minor: ${row.Minor}` : "",
  ]);
}

function getLocationName(row) {
  return compact([row.Battle, row.Country]);
}

function ensureSourceDownloaded() {
  if (existsSync(sourcePath)) {
    return;
  }

  mkdirSync(dirname(sourcePath), { recursive: true });
  execFileSync("curl", ["-L", sourceUrl, "-o", sourcePath], { stdio: "inherit" });
}

function validateRows(rows) {
  const seenIds = new Set();

  for (const row of rows) {
    const year = Number(row.year);
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);

    if (!row.event_id || !Number.isInteger(year) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error(`Invalid required fields for event ${row.event_id || "(missing id)"}`);
    }

    if (year < minYear || year > maxYear) {
      throw new Error(`Event ${row.event_id} has year outside ${minYear}-${maxYear}: ${year}`);
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error(`Event ${row.event_id} has invalid coordinates: ${latitude}, ${longitude}`);
    }

    if (seenIds.has(row.event_id)) {
      throw new Error(`Duplicate event_id: ${row.event_id}`);
    }

    seenIds.add(row.event_id);
  }
}

function readParticipantNormalization() {
  const rows = parseCsv(readFileSync(participantNormalizationPath, "utf8"));
  const mapping = new Map();
  const ignored = new Set();

  for (const row of rows) {
    const rawName = row.raw_name?.trim();
    const action = row.action?.trim().toLowerCase();
    const canonicalName = row.canonical_name?.trim();

    if (!rawName) {
      continue;
    }

    const lookupKey = normalizeLookupKey(rawName);

    if (action === "map") {
      if (!canonicalName) {
        throw new Error(`Participant normalization for "${rawName}" is missing canonical_name`);
      }

      mapping.set(lookupKey, canonicalName);
      mapping.set(normalizeLookupKey(canonicalName), canonicalName);
      ignored.delete(lookupKey);
      ignored.delete(normalizeLookupKey(canonicalName));
      continue;
    }

    if (action === "ignore") {
      ignored.add(lookupKey);
      mapping.delete(lookupKey);
      continue;
    }

    throw new Error(`Invalid participant normalization action for "${rawName}": ${row.action}`);
  }

  return { mapping, ignored };
}

function parseBoolean(value, fallback = false) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  return ["1", "true", "yes", "y"].includes(normalized);
}

function readActorNormalization() {
  const rows = parseCsv(readFileSync(actorNormalizationPath, "utf8"));
  const mapping = new Map();

  for (const row of rows) {
    const rawName = row.raw_name?.trim();
    const action = row.action?.trim().toLowerCase();

    if (!rawName) {
      continue;
    }

    if (!["map_country", "map_faction", "ignore", "ambiguous"].includes(action)) {
      throw new Error(`Invalid actor normalization action for "${rawName}": ${row.action}`);
    }

    const type = row.type?.trim() || (action === "map_country" ? "country" : action === "map_faction" ? "faction" : "unknown");
    const confidence = row.confidence?.trim() || (action === "map_country" ? "high" : "low");

    if (!actorTypes.has(type)) {
      throw new Error(`Invalid actor type for "${rawName}": ${row.type}`);
    }

    if (!actorConfidences.has(confidence)) {
      throw new Error(`Invalid actor confidence for "${rawName}": ${row.confidence}`);
    }

    mapping.set(normalizeActorKey(rawName), {
      action,
      canonicalName: row.canonical_name?.trim() || rawName,
      type,
      confidence,
      mapTarget: row.map_target?.trim() || "",
      networkEligible: parseBoolean(row.network_eligible, action === "map_country"),
      note: row.note?.trim() || "",
    });
  }

  return mapping;
}

function createActor({
  rawName,
  name,
  role,
  type,
  confidence,
  mapTarget = "",
  networkEligible = false,
  sourceField,
  status,
}) {
  if (!actorRoles.has(role)) {
    throw new Error(`Invalid actor role: ${role}`);
  }

  if (!actorTypes.has(type)) {
    throw new Error(`Invalid actor type for "${rawName}": ${type}`);
  }

  if (!actorConfidences.has(confidence)) {
    throw new Error(`Invalid actor confidence for "${rawName}": ${confidence}`);
  }

  return {
    id: slugify(name),
    rawName,
    name,
    role,
    type,
    confidence,
    mapTarget,
    networkEligible,
    sourceField,
    status,
  };
}

function dedupeActors(actors) {
  const deduped = [];
  const seen = new Set();

  for (const actor of actors) {
    const key = [actor.role, actor.sourceField, actor.rawName, actor.name, actor.mapTarget].join("::");

    if (seen.has(key)) {
      continue;
    }

    deduped.push(actor);
    seen.add(key);
  }

  return deduped;
}

function resolveMappedActor(rawName, role, sourceField, contextCountry, participantNormalization, actorNormalization) {
  const actorKey = normalizeActorKey(rawName);
  const explicit = actorNormalization.get(actorKey);

  if (explicit) {
    if (explicit.action === "ignore") {
      return null;
    }

    if (explicit.action === "ambiguous") {
      return createActor({
        rawName,
        name: explicit.canonicalName || rawName,
        role,
        type: explicit.type,
        confidence: explicit.confidence,
        sourceField,
        status: "ambiguous",
      });
    }

    const mapTarget = explicit.mapTarget === "event_country" ? contextCountry : explicit.mapTarget || explicit.canonicalName;

    return createActor({
      rawName,
      name: explicit.canonicalName,
      role,
      type: explicit.type,
      confidence: explicit.confidence,
      mapTarget,
      networkEligible: explicit.networkEligible,
      sourceField,
      status: explicit.action === "map_faction" ? "mapped_internal" : "mapped",
    });
  }

  const participantAlias = participantNormalization.mapping.get(normalizeLookupKey(rawName));

  if (participantAlias && !participantNormalization.ignored.has(normalizeLookupKey(rawName))) {
    return createActor({
      rawName,
      name: participantAlias,
      role,
      type: "country",
      confidence: role === "participant" ? "high" : "medium",
      mapTarget: participantAlias,
      networkEligible: true,
      sourceField,
      status: "mapped",
    });
  }

  return createActor({
    rawName,
    name: rawName,
    role,
    type: "unknown",
    confidence: "low",
    sourceField,
    status: "unmapped",
  });
}

function getParticipantActors(rawParticipants, participantNormalization) {
  const actors = [];

  for (const rawParticipant of rawParticipants.split(/[;,]/).map((item) => item.trim()).filter(Boolean)) {
    const lookupKey = normalizeLookupKey(rawParticipant);
    const canonicalName = participantNormalization.mapping.get(lookupKey);

    if (!canonicalName || participantNormalization.ignored.has(lookupKey)) {
      continue;
    }

    actors.push(createActor({
      rawName: rawParticipant,
      name: canonicalName,
      role: "participant",
      type: "country",
      confidence: "high",
      mapTarget: canonicalName,
      networkEligible: true,
      sourceField: "Participants",
      status: "mapped",
    }));
  }

  return actors;
}

function getFieldActors(value, role, sourceField, contextCountry, participantNormalization, actorNormalization) {
  return parseList(value)
    .map((rawName) =>
      resolveMappedActor(rawName, role, sourceField, contextCountry, participantNormalization, actorNormalization),
    )
    .filter(Boolean);
}

function getActors(row, rawParticipants, participantNormalization, actorNormalization) {
  return dedupeActors([
    ...getParticipantActors(rawParticipants, participantNormalization),
    ...getFieldActors(row.Winner, "winner", "Winner", row.Country || "", participantNormalization, actorNormalization),
    ...getFieldActors(row.Loser, "loser", "Loser", row.Country || "", participantNormalization, actorNormalization),
    ...getFieldActors(row["Participant 1"], "participant", "Participant 1", row.Country || "", participantNormalization, actorNormalization),
    ...getFieldActors(row["Participant 2"], "participant", "Participant 2", row.Country || "", participantNormalization, actorNormalization),
  ]);
}

function getParticipantsFromActors(actors) {
  const participants = [];
  const seen = new Set();

  for (const actor of actors) {
    if (!actor.networkEligible || !["high", "medium"].includes(actor.confidence)) {
      continue;
    }

    if (actor.type !== "country" && actor.type !== "empire" && actor.type !== "alliance") {
      continue;
    }

    const canonicalKey = normalizeLookupKey(actor.name);

    if (seen.has(canonicalKey)) {
      continue;
    }

    participants.push(actor.name);
    seen.add(canonicalKey);
  }

  return participants.join("; ");
}

function addActorAudit(audit, actors, eventId) {
  for (const actor of actors) {
    if (actor.status === "mapped" && actor.confidence !== "low") {
      continue;
    }

    const key = [actor.rawName, actor.sourceField, actor.status, actor.type].join("::");
    const entry = audit.get(key) ?? {
      rawName: actor.rawName,
      sourceField: actor.sourceField,
      status: actor.status,
      type: actor.type,
      count: 0,
      examples: [],
    };

    entry.count += 1;
    if (entry.examples.length < 5) {
      entry.examples.push(eventId);
    }

    audit.set(key, entry);
  }
}

function getSuggestedAction(entry) {
  if (entry.status === "ambiguous") {
    return "review_ambiguous";
  }

  if (entry.type === "faction" || entry.type === "rebel_group") {
    return "check_internal_mapping";
  }

  return "add_actor_normalization";
}

function writeActorAudit(audit) {
  const rows = Array.from(audit.values()).sort((a, b) => b.count - a.count || a.rawName.localeCompare(b.rawName));

  writeFileSync(
    actorAuditPath,
    `${actorAuditHeaders.join(",")}\n${rows
      .map((row) =>
        [
          row.rawName,
          row.sourceField,
          row.status,
          row.type,
          row.count,
          row.examples.join("; "),
          getSuggestedAction(row),
        ]
          .map(csvEscape)
          .join(","),
      )
      .join("\n")}\n`,
  );
}

function getCleanParticipants(rawParticipants, normalization) {
  const participants = [];
  const seen = new Set();

  for (const rawParticipant of rawParticipants.split(/[;,]/).map((item) => item.trim()).filter(Boolean)) {
    const lookupKey = normalizeLookupKey(rawParticipant);
    const canonicalName = normalization.mapping.get(lookupKey);

    if (!canonicalName || normalization.ignored.has(lookupKey)) {
      continue;
    }

    const canonicalKey = normalizeLookupKey(canonicalName);

    if (seen.has(canonicalKey)) {
      continue;
    }

    participants.push(canonicalName);
    seen.add(canonicalKey);
  }

  return participants.join("; ");
}

ensureSourceDownloaded();

const participantNormalization = readParticipantNormalization();
const actorNormalization = readActorNormalization();
const actorAudit = new Map();
const rawRows = parseCsv(readFileSync(sourcePath, "utf8"));
const rows = rawRows
  .filter((row) => {
    const year = Number(row.Year);
    const latitude = Number(row.Latitude);
    const longitude = Number(row.Longitude);

    return (
      row.ID &&
      Number.isInteger(year) &&
      year >= minYear &&
      year <= maxYear &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    );
  })
  .map((row) => {
    const rawParticipants = normalizeList(row.Participants);
    const actors = getActors(row, rawParticipants, participantNormalization, actorNormalization);
    addActorAudit(actorAudit, actors, row.ID);

    return {
      event_id: row.ID,
      event_name: row.Battle || row.ID,
      war_name: normalizeWarName(row.War, Number(row.Year)),
      year: String(Number(row.Year)),
      location_name: getLocationName(row),
      latitude: String(Number(row.Latitude)),
      longitude: String(Number(row.Longitude)),
      participants: getParticipantsFromActors(actors) || getCleanParticipants(rawParticipants, participantNormalization),
      raw_participants: rawParticipants,
      actors: JSON.stringify(actors),
      winner: row.Winner || "",
      loser: row.Loser || "",
      participant_1: row["Participant 1"] || "",
      participant_2: row["Participant 2"] || "",
      country: row.Country || "",
      outcome: getOutcome(row),
      event_type: getEventType(row),
      narrative: getNarrative(row),
      source: row["Alternative Sources Consulted"] || "Historical Conflict Event Dataset v3",
    };
  });

validateRows(rows);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `${outputHeaders.join(",")}\n${rows
    .map((row) => outputHeaders.map((header) => csvEscape(row[header])).join(","))
    .join("\n")}\n`,
);
writeActorAudit(actorAudit);

console.log(`Wrote ${rows.length} HCED conflict events to ${outputPath}`);
console.log(`Wrote actor audit to ${actorAuditPath}`);
