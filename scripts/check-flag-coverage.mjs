import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveHistoricalFlag } from "../src/lib/battlePopup.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const dataPath = resolve(rootDir, "public/data/hced/conflict_events.csv");
const allowedAmbiguousActors = new Set(["Korea", "Somaliland", "Tibet"]);
const eligibleActorTypes = new Set(["alliance", "country", "empire"]);

function getPublicAssetPath(src) {
  if (!src?.startsWith("/")) {
    return null;
  }
  return resolve(rootDir, "public", src.slice(1));
}

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

  return rows;
}

function addMissingActor(missingActors, name, year) {
  const entry = missingActors.get(name) ?? { name, count: 0, years: new Map() };
  entry.count += 1;
  entry.years.set(year, (entry.years.get(year) ?? 0) + 1);
  missingActors.set(name, entry);
}

function formatEntry(entry) {
  return {
    actor: entry.name,
    count: entry.count,
    years: [...entry.years.entries()]
      .sort(([left], [right]) => left - right)
      .map(([year, count]) => `${year}:${count}`)
      .join(", "),
  };
}

const [headers, ...rows] = parseCsv(readFileSync(dataPath, "utf8"));
const yearIndex = headers.indexOf("year");
const actorsIndex = headers.indexOf("actors");
const missingActors = new Map();
const missingAssets = new Map();

for (const row of rows) {
  const year = Number(row[yearIndex]);
  if (!Number.isFinite(year)) {
    continue;
  }

  let actors = [];
  try {
    actors = JSON.parse(row[actorsIndex] || "[]");
  } catch {
    continue;
  }

  for (const actor of actors) {
    if (
      !eligibleActorTypes.has(actor.type) ||
      actor.status === "ambiguous" ||
      actor.status === "unmapped"
    ) {
      continue;
    }

    const lookupName = actor.name || actor.rawName || actor.mapTarget;
    const flag = lookupName ? resolveHistoricalFlag(lookupName, year) : null;
    if (lookupName && !flag) {
      addMissingActor(missingActors, lookupName, year);
      continue;
    }

    const assetPath = getPublicAssetPath(flag?.src);
    if (lookupName && assetPath && !existsSync(assetPath)) {
      const key = `${flag.src}:${lookupName}`;
      missingAssets.set(key, {
        actor: lookupName,
        year,
        source: flag.src,
      });
    }
  }
}

const entries = [...missingActors.values()].sort((left, right) => right.count - left.count);
const allowedEntries = entries.filter((entry) => allowedAmbiguousActors.has(entry.name));
const unexpectedEntries = entries.filter((entry) => !allowedAmbiguousActors.has(entry.name));

if (allowedEntries.length > 0) {
  console.log("Allowed ambiguous actors using text fallback:");
  console.table(allowedEntries.map(formatEntry));
}

if (unexpectedEntries.length > 0) {
  console.error("Unexpected actors without a flag:");
  console.table(unexpectedEntries.map(formatEntry));
  process.exitCode = 1;
} else {
  console.log("Flag coverage check passed: no unexpected mapped actors are missing flags.");
}

if (missingAssets.size > 0) {
  console.error("Flag assets referenced by the resolver are missing:");
  console.table([...missingAssets.values()]);
  process.exitCode = 1;
} else {
  console.log("Flag asset check passed: every resolved local flag file exists.");
}
