import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const sourceUrl = "https://icr.ethz.ch/data/cshapes/CShapes-2.0.geojson";
const defaultSourcePath =
  process.platform === "darwin" ? "/private/tmp/cshapes-2.0.geojson" : resolve(rootDir, ".cache/cshapes-2.0.geojson");
const sourcePath = process.env.CSHAPES_SOURCE ?? defaultSourcePath;
const outputPath = resolve(rootDir, "public/data/cshapes/cshapes_1886_2003_snapshots.geojson");

const snapshots = [
  ...Array.from({ length: 12 }, (_, index) => {
    const year = 1890 + index * 10;
    return { date: `${year}-07-01`, year, label: `${year}` };
  }),
  { date: "1914-08-01", year: 1914, label: "1914" },
  { date: "1918-11-11", year: 1918, label: "1918" },
  { date: "1939-09-01", year: 1939, label: "1939" },
  { date: "1945-05-08", year: 1945, label: "1945" },
  { date: "1991-12-25", year: 1991, label: "1991" },
  { date: "2003-07-01", year: 2003, label: "2003" },
];

function toDateNumber(date) {
  return Number(date.replace(/-/g, ""));
}

function featureStart(feature) {
  const { gwsyear, gwsmonth, gwsday } = feature.properties;
  return gwsyear * 10000 + gwsmonth * 100 + gwsday;
}

function featureEnd(feature) {
  const { gweyear, gwemonth, gweday } = feature.properties;
  return gweyear * 10000 + gwemonth * 100 + gweday;
}

function roundCoordinate(value) {
  if (typeof value === "number") {
    return Math.round(value * 10) / 10;
  }

  return value.map(roundCoordinate);
}

function simplifyRing(ring) {
  const roundedRing = ring.map(roundCoordinate);

  if (roundedRing.length <= 12) {
    return roundedRing;
  }

  const simplified = roundedRing.filter((_, index) => {
    return index === 0 || index === roundedRing.length - 1 || index % 4 === 0;
  });

  if (simplified.length < 4) {
    return roundedRing.slice(0, 4);
  }

  return simplified;
}

function simplifyCoordinates(coordinates, geometryType) {
  if (geometryType === "Polygon") {
    return coordinates.map(simplifyRing);
  }

  if (geometryType === "MultiPolygon") {
    return coordinates.map((polygon) => polygon.map(simplifyRing));
  }

  return roundCoordinate(coordinates);
}

function ensureSourceDownloaded() {
  if (existsSync(sourcePath)) {
    return;
  }

  mkdirSync(dirname(sourcePath), { recursive: true });
  execFileSync("curl", ["-L", sourceUrl, "-o", sourcePath], { stdio: "inherit" });
}

ensureSourceDownloaded();

const cshapes = JSON.parse(readFileSync(sourcePath, "utf8"));
const outputFeatures = [];

for (const snapshot of snapshots) {
  const snapshotDate = toDateNumber(snapshot.date);

  for (const feature of cshapes.features) {
    if (featureStart(feature) > snapshotDate || featureEnd(feature) < snapshotDate) {
      continue;
    }

    const statename = feature.properties.cntry_name;

    outputFeatures.push({
      type: "Feature",
      properties: {
        snapshot_date: snapshot.date,
        snapshot_year: snapshot.year,
        snapshot_label: snapshot.label,
        statename,
        gwcode: feature.properties.gwcode,
        start_year: feature.properties.gwsyear,
        end_year: feature.properties.gweyear,
        source: "CShapes 2.0",
      },
      geometry: {
        type: feature.geometry.type,
        coordinates: simplifyCoordinates(feature.geometry.coordinates, feature.geometry.type),
      },
    });
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  JSON.stringify({
    type: "FeatureCollection",
    name: "cshapes_1886_2003_snapshots",
    source: sourceUrl,
    generated_from: "CShapes 2.0",
    temporal_extent: "1886-2003",
    snapshots: snapshots.map((snapshot) => snapshot.date),
    features: outputFeatures,
  }),
);

console.log(`Wrote ${outputFeatures.length} CShapes snapshot features to ${outputPath}`);
