import { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinned } from "lucide-react";
import type * as GeoJSON from "geojson";
import type { Battle } from "../../types/domain";

type MapViewProps = {
  battles: Battle[];
  heatmapBattles: Battle[];
  selectedBattleId: string | null;
  currentYear: number;
  selectedWarId: string | null;
  onSelectBattle: (battleId: string | null) => void;
  onResetFilters: () => void;
};

type SnapshotOption = {
  value: string;
  label: string;
};

type CShapesBoundaryProperties = {
  snapshot_date: string;
  snapshot_year: number;
  snapshot_label: string;
  statename: string;
  source: string;
};

type CShapesBoundaryCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, CShapesBoundaryProperties>;
type LandCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry>;

type MapHeatCell = {
  key: string;
  bounds: L.LatLngBoundsExpression;
  count: number;
};

type CountryHighlight = {
  selected: Set<string>;
  winnerMain: Set<string>;
  winnerAllies: Set<string>;
  loserMain: Set<string>;
  loserAllies: Set<string>;
  internalConflict: Set<string>;
};

const baseMarkerStyle: L.CircleMarkerOptions = {
  radius: 7,
  color: "#101214",
  weight: 2,
  fillOpacity: 0.88,
};

const selectedMarkerStyle: L.CircleMarkerOptions = {
  radius: 10,
  color: "#fff3bf",
  weight: 3,
  fillColor: "#d6b66a",
  fillOpacity: 1,
};

const eventTypePalette = [
  "#d47b5d",
  "#4f9cff",
  "#8fd19e",
  "#d6b66a",
  "#c98fd1",
  "#86c5c7",
  "#f0a36b",
  "#aeb6ad",
];
const mapHeatGridSize = 5;

const countryAliasByKey: Record<string, string | string[]> = {
  america: "United States of America",
  american: "United States of America",
  americans: "United States of America",
  australia: "Australia",
  austria: "Austria",
  "austria hungary": "Austria-Hungary",
  "austro hungarian": "Austria-Hungary",
  belgian: "Belgium",
  belgium: "Belgium",
  british: "United Kingdom",
  britain: "United Kingdom",
  bulgaria: "Bulgaria",
  bulgarian: "Bulgaria",
  canada: "Canada",
  canadian: "Canada",
  china: "China",
  chinese: "China",
  algeria: "Algeria",
  benin: "Benin",
  bosnia: "Bosnia",
  "bosnia herzegovina": "Bosnia-Herzegovina",
  croatia: "Croatia",
  dahomey: "Benin",
  egypt: "Egypt",
  egyptian: "Egypt",
  ethiopia: "Ethiopia",
  ethiopian: "Ethiopia",
  france: "France",
  french: "France",
  german: ["Germany (Prussia)", "German Federal Republic", "German Democratic Republic"],
  germans: ["Germany (Prussia)", "German Federal Republic", "German Democratic Republic"],
  germany: ["Germany (Prussia)", "German Federal Republic", "German Democratic Republic"],
  greece: "Greece",
  greek: "Greece",
  india: "India",
  indian: "India",
  iran: "Iran (Persia)",
  iraq: "Iraq",
  iraqi: "Iraq",
  israel: "Israel",
  israeli: "Israel",
  israels: "Israel",
  italy: "Italy/Sardinia",
  italian: "Italy/Sardinia",
  japan: "Japan",
  japanese: "Japan",
  korea: "Korea",
  "north korea": "Korea, People's Republic of",
  "south korea": "Korea, Republic of",
  lebanon: "Lebanon",
  libya: "Libya",
  mexican: "Mexico",
  mexico: "Mexico",
  netherlands: "Netherlands",
  ottoman: "Turkey (Ottoman Empire)",
  "ottoman empire": "Turkey (Ottoman Empire)",
  pakistan: "Pakistan",
  persia: "Iran (Persia)",
  persian: "Iran (Persia)",
  poland: "Poland",
  polish: "Poland",
  prussia: ["Germany (Prussia)", "German Federal Republic", "German Democratic Republic"],
  romanian: "Rumania",
  romania: "Rumania",
  rumania: "Rumania",
  russia: "Russia (Soviet Union)",
  russian: "Russia (Soviet Union)",
  russians: "Russia (Soviet Union)",
  serbia: "Serbia",
  "saudi arabia": "Saudi Arabia",
  saudi: "Saudi Arabia",
  saudis: "Saudi Arabia",
  somalia: "Somalia",
  "south africa": "South Africa",
  soviet: "Russia (Soviet Union)",
  soviets: "Russia (Soviet Union)",
  spain: "Spain",
  spanish: "Spain",
  sudan: "Sudan",
  syria: "Syria",
  turkey: "Turkey (Ottoman Empire)",
  turkish: "Turkey (Ottoman Empire)",
  turks: "Turkey (Ottoman Empire)",
  "united kingdom": "United Kingdom",
  "united states": "United States of America",
  usa: "United States of America",
  ussr: "Russia (Soviet Union)",
  vietnam: ["Vietnam", "Vietnam (Annam/Cochin China/Tonkin)", "Vietnam, Democratic Republic of", "Vietnam, Republic of"],
  "north vietnam": "Vietnam, Democratic Republic of",
  "south vietnam": "Vietnam, Republic of",
  yugoslavia: "Yugoslavia",
};

const emptyCountryHighlight: CountryHighlight = {
  selected: new Set(),
  winnerMain: new Set(),
  winnerAllies: new Set(),
  loserMain: new Set(),
  loserAllies: new Set(),
  internalConflict: new Set(),
};

const cshapesSnapshots = [
  { date: "1890-07-01", year: 1890, label: "1890" },
  { date: "1900-07-01", year: 1900, label: "1900" },
  { date: "1910-07-01", year: 1910, label: "1910" },
  { date: "1914-08-01", year: 1914, label: "1914" },
  { date: "1918-11-11", year: 1918, label: "1918" },
  { date: "1920-07-01", year: 1920, label: "1920" },
  { date: "1930-07-01", year: 1930, label: "1930" },
  { date: "1939-09-01", year: 1939, label: "1939" },
  { date: "1940-07-01", year: 1940, label: "1940" },
  { date: "1945-05-08", year: 1945, label: "1945" },
  { date: "1950-07-01", year: 1950, label: "1950" },
  { date: "1960-07-01", year: 1960, label: "1960" },
  { date: "1970-07-01", year: 1970, label: "1970" },
  { date: "1980-07-01", year: 1980, label: "1980" },
  { date: "1990-07-01", year: 1990, label: "1990" },
  { date: "1991-12-25", year: 1991, label: "1991" },
  { date: "2000-07-01", year: 2000, label: "2000" },
  { date: "2003-07-01", year: 2003, label: "2003" },
];

const cshapesSnapshotOptions: SnapshotOption[] = [
  { value: "auto", label: "自动选择当前年前最近快照" },
  { value: "off", label: "关闭历史边界" },
  ...cshapesSnapshots.map((snapshot) => ({ value: snapshot.date, label: snapshot.label })),
];

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeCountryKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getCountryLookup(features: CShapesBoundaryCollection["features"]) {
  const lookup = new Map<string, string>();

  for (const feature of features) {
    const statename = feature.properties.statename;
    lookup.set(normalizeCountryKey(statename), statename);
  }

  return lookup;
}

function resolveCountryName(value: string, countryLookup: Map<string, string>) {
  const key = normalizeCountryKey(value);

  if (!key || key === "draw" || key === "unknown" || key === "na") {
    return [];
  }

  const alias = countryAliasByKey[key];
  if (alias) {
    const aliases = Array.isArray(alias) ? alias : [alias];
    const resolvedAliases = aliases
      .map((aliasName) => countryLookup.get(normalizeCountryKey(aliasName)))
      .filter((countryName): countryName is string => Boolean(countryName));

    return resolvedAliases.length > 0 ? resolvedAliases : [aliases[0]];
  }

  const countryName = countryLookup.get(key);
  return countryName ? [countryName] : [];
}

function resolveCountryNames(values: string[] | undefined, countryLookup: Map<string, string>) {
  const resolved = new Set<string>();

  for (const value of values ?? []) {
    for (const countryName of resolveCountryName(value, countryLookup)) {
      resolved.add(countryName);
    }
  }

  return resolved;
}

function hasIntersection(a: Set<string>, b: Set<string>) {
  for (const value of a) {
    if (b.has(value)) {
      return true;
    }
  }
  return false;
}

function mergeInto(target: Set<string>, source: Set<string>) {
  for (const value of source) {
    target.add(value);
  }
}

function deleteFrom(target: Set<string>, source: Set<string>) {
  for (const value of source) {
    target.delete(value);
  }
}

function without(source: Set<string>, removed: Set<string>) {
  const result = new Set<string>();

  for (const value of source) {
    if (!removed.has(value)) {
      result.add(value);
    }
  }

  return result;
}

function getBattleCountrySides(battle: Battle, countryLookup: Map<string, string>): CountryHighlight {
  if (!battle.actors?.length) {
    return {
      selected: new Set(),
      winnerMain: resolveCountryNames(battle.winnerNames, countryLookup),
      winnerAllies: new Set(),
      loserMain: resolveCountryNames(battle.loserNames, countryLookup),
      loserAllies: new Set(),
      internalConflict: new Set(),
    };
  }

  const winnerMain = new Set<string>();
  const loserMain = new Set<string>();
  const internalConflict = new Set<string>();

  for (const actor of battle.actors) {
    if (actor.status === "ambiguous" || actor.status === "unmapped") {
      continue;
    }

    if (actor.status === "mapped_internal") {
      for (const countryName of resolveCountryName(actor.mapTarget || battle.eventCountry || "", countryLookup)) {
        internalConflict.add(countryName);
      }
      continue;
    }

    if (!["country", "empire", "alliance"].includes(actor.type)) {
      continue;
    }

    const targetCountries = resolveCountryName(actor.mapTarget || actor.name, countryLookup);

    if (actor.role === "winner") {
      mergeInto(winnerMain, new Set(targetCountries));
    }

    if (actor.role === "loser") {
      mergeInto(loserMain, new Set(targetCountries));
    }
  }

  return {
    selected: new Set(),
    winnerMain,
    winnerAllies: new Set(),
    loserMain,
    loserAllies: new Set(),
    internalConflict,
  };
}

function getAllHighlightedCountries(highlight: CountryHighlight) {
  return new Set([
    ...highlight.selected,
    ...highlight.winnerMain,
    ...highlight.winnerAllies,
    ...highlight.loserMain,
    ...highlight.loserAllies,
    ...highlight.internalConflict,
  ]);
}

function getCountryConflictHighlight(
  countryName: string,
  battles: Battle[],
  countryLookup: Map<string, string>,
): CountryHighlight {
  const selected = new Set([countryName]);
  const sameMain = new Set<string>();
  const sameAllies = new Set<string>();
  const enemyMain = new Set<string>();
  const enemyAllies = new Set<string>();

  for (const battle of battles) {
    const sides = getBattleCountrySides(battle, countryLookup);

    if (sides.winnerMain.has(countryName)) {
      mergeInto(sameMain, without(sides.winnerMain, selected));
      mergeInto(enemyMain, sides.loserMain);
    }

    if (sides.loserMain.has(countryName)) {
      mergeInto(sameMain, without(sides.loserMain, selected));
      mergeInto(enemyMain, sides.winnerMain);
    }

    if (sides.internalConflict.has(countryName)) {
      mergeInto(enemyMain, sides.winnerMain);
      mergeInto(enemyMain, sides.loserMain);
    }
  }

  deleteFrom(sameMain, selected);
  deleteFrom(sameAllies, selected);
  deleteFrom(enemyMain, selected);
  deleteFrom(enemyAllies, selected);

  const enemyCountries = new Set([...enemyMain, ...enemyAllies]);
  deleteFrom(sameMain, enemyCountries);
  deleteFrom(sameAllies, enemyCountries);
  deleteFrom(sameAllies, sameMain);
  deleteFrom(enemyAllies, enemyMain);

  return {
    selected,
    winnerMain: sameMain,
    winnerAllies: sameAllies,
    loserMain: enemyMain,
    loserAllies: enemyAllies,
    internalConflict: new Set(),
  };
}

function getHighlightKey(highlight: CountryHighlight) {
  return [
    [...highlight.selected].sort().join("|"),
    [...highlight.winnerMain].sort().join("|"),
    [...highlight.winnerAllies].sort().join("|"),
    [...highlight.loserMain].sort().join("|"),
    [...highlight.loserAllies].sort().join("|"),
    [...highlight.internalConflict].sort().join("|"),
  ].join("::");
}

function getBattlePopup(battle: Battle) {
  const time = battle.endDate ? `${battle.startDate ?? battle.year} 至 ${battle.endDate}` : battle.startDate ?? battle.year;
  const winner = battle.winnerNames?.join(", ") || "未知";
  const loser = battle.loserNames?.join(", ") || "未知";
  const participants = battle.participantNames?.join(", ") || "未知";
  const internalActors =
    battle.actors
      ?.filter((actor) => actor.status === "mapped_internal")
      .map((actor) => actor.mapTarget ? `${actor.name} -> ${actor.mapTarget}` : actor.name)
      .join(", ") || "";

  return `
    <div class="battle-popup">
      <strong>${escapeHtml(battle.name)}</strong>
      <span>${escapeHtml(time)}</span>
      <span>${escapeHtml(battle.locationName ?? "未知地点")}</span>
      <span>${escapeHtml(battle.type ?? "冲突事件")}</span>
      <span>胜方 winner：${escapeHtml(winner)}</span>
      <span>败方 loser：${escapeHtml(loser)}</span>
      <span>参战方 participants：${escapeHtml(participants)}</span>
      ${internalActors ? `<span>内部行动者 internal actors：${escapeHtml(internalActors)}</span>` : ""}
      <span>${escapeHtml(battle.result ?? "结果未知")}</span>
    </div>
  `;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 997;
  }
  return hash;
}

function getEventTypeColor(type = "冲突事件") {
  return eventTypePalette[hashString(type) % eventTypePalette.length];
}

function getBattleStyle(battle: Battle, selected: boolean, highlighted: boolean): L.CircleMarkerOptions {
  if (highlighted) {
    return {
      ...baseMarkerStyle,
      radius: selected ? 11 : 9,
      color: selected ? "#fff3bf" : "#ffffff",
      weight: selected ? 4 : 3,
      fillColor: "#ef4444",
      fillOpacity: 1,
    };
  }

  return {
    ...(selected ? selectedMarkerStyle : baseMarkerStyle),
    radius: selected ? selectedMarkerStyle.radius : baseMarkerStyle.radius,
    fillColor: selected ? selectedMarkerStyle.fillColor : getEventTypeColor(battle.type),
  };
}

function getBoundaryStyle(
  feature?: GeoJSON.Feature<GeoJSON.Geometry, CShapesBoundaryProperties>,
  highlight: CountryHighlight = emptyCountryHighlight,
): L.PathOptions {
  const snapshotYear = feature?.properties.snapshot_year ?? 1900;
  const statename = feature?.properties.statename;

  if (statename && highlight.selected.has(statename)) {
    return {
      color: "#fff3bf",
      fillColor: "#d6b66a",
      fillOpacity: 0.72,
      opacity: 1,
      weight: 3,
    };
  }

  if (statename && highlight.internalConflict.has(statename)) {
    return {
      color: "#fffbeb",
      fillColor: "#f59e0b",
      fillOpacity: 0.64,
      opacity: 1,
      weight: 2.4,
    };
  }

  if (statename && highlight.winnerMain.has(statename)) {
    return {
      color: "#dbeafe",
      fillColor: "#2563eb",
      fillOpacity: 0.62,
      opacity: 1,
      weight: 2,
    };
  }

  if (statename && highlight.winnerAllies.has(statename)) {
    return {
      color: "#bfdbfe",
      fillColor: "#60a5fa",
      fillOpacity: 0.46,
      opacity: 0.95,
      weight: 1.6,
    };
  }

  if (statename && highlight.loserMain.has(statename)) {
    return {
      color: "#fee2e2",
      fillColor: "#dc2626",
      fillOpacity: 0.62,
      opacity: 1,
      weight: 2,
    };
  }

  if (statename && highlight.loserAllies.has(statename)) {
    return {
      color: "#fed7aa",
      fillColor: "#fb923c",
      fillOpacity: 0.46,
      opacity: 0.95,
      weight: 1.6,
    };
  }

  const opacity = snapshotYear < 1945 ? 0.18 : 0.14;
  return {
    color: "#60706a",
    fillColor: "#94a79f",
    fillOpacity: opacity,
    opacity: 0.58,
    weight: 1,
  };
}

function getLandStyle(): L.PathOptions {
  return {
    color: "#708078",
    fillColor: "#202a25",
    fillOpacity: 0.82,
    opacity: 0.7,
    weight: 1,
  };
}

function getBoundaryPopup(properties: CShapesBoundaryProperties) {
  return `
    <div class="battle-popup">
      <strong>${escapeHtml(properties.statename)}</strong>
      <span>${escapeHtml(properties.snapshot_label)}</span>
      <span>来源：${escapeHtml(properties.source)}</span>
    </div>
  `;
}

function getSnapshotForYear(year: number) {
  return cshapesSnapshots.reduce((latest, snapshot) => {
    if (snapshot.year > year) {
      return latest;
    }

    return snapshot.year > latest.year ? snapshot : latest;
  }, cshapesSnapshots[0]);
}

function getFeatureBounds(feature: GeoJSON.Feature<GeoJSON.Geometry>) {
  return L.geoJSON(feature).getBounds();
}

function getMapHeatCells(battles: Battle[]) {
  const cells = new Map<string, { latitudeSum: number; longitudeSum: number; count: number }>();

  for (const battle of battles) {
    const latCell = Math.floor((battle.latitude + 90) / mapHeatGridSize);
    const lngCell = Math.floor((battle.longitude + 180) / mapHeatGridSize);
    const key = `${latCell}:${lngCell}`;
    const cell = cells.get(key) ?? { latitudeSum: 0, longitudeSum: 0, count: 0 };

    cell.latitudeSum += battle.latitude;
    cell.longitudeSum += battle.longitude;
    cell.count += 1;
    cells.set(key, cell);
  }

  return Array.from(cells.entries())
    .map(([key, cell]): MapHeatCell => {
      const [latCell, lngCell] = key.split(":").map(Number);
      const south = latCell * mapHeatGridSize - 90;
      const west = lngCell * mapHeatGridSize - 180;

      return {
        key,
        bounds: [
          [south, west],
          [south + mapHeatGridSize, west + mapHeatGridSize],
        ],
        count: cell.count,
      };
    })
    .sort((left, right) => right.count - left.count);
}

export function MapView({
  battles,
  heatmapBattles,
  selectedBattleId,
  currentYear,
  selectedWarId,
  onSelectBattle,
  onResetFilters,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const landLayerRef = useRef<L.GeoJSON | null>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const heatLayerRef = useRef<L.FeatureGroup | null>(null);
  const battleLayerRef = useRef<L.FeatureGroup | null>(null);
  const markerRefs = useRef<Map<string, L.CircleMarker>>(new Map());
  const [selectedSnapshot, setSelectedSnapshot] = useState("auto");
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null);
  const [landCollection, setLandCollection] = useState<LandCollection | null>(null);
  const [boundaryCollection, setBoundaryCollection] = useState<CShapesBoundaryCollection | null>(null);
  const [yearFeedbackActive, setYearFeedbackActive] = useState(false);
  const allConflictGroupMode = selectedWarId === "all" || selectedWarId === null;
  const heatCells = useMemo(() => getMapHeatCells(heatmapBattles), [heatmapBattles]);
  const maxHeatCellCount = Math.max(1, ...heatCells.map((cell) => cell.count));
  const effectiveSnapshot = allConflictGroupMode
    ? "off"
    : selectedSnapshot === "auto"
      ? getSnapshotForYear(currentYear).date
      : selectedSnapshot;
  const effectiveSnapshotLabel =
    allConflictGroupMode
      ? "全部冲突组：事件密度热力图"
      : effectiveSnapshot === "off"
      ? "历史边界已关闭"
      : `CShapes 快照 ${cshapesSnapshots.find((snapshot) => snapshot.date === effectiveSnapshot)?.label ?? effectiveSnapshot}`;
  const countryLookup = useMemo(() => {
    const features = boundaryCollection?.features ?? [];
    const snapshotFeatures =
      effectiveSnapshot === "off"
        ? features
        : features.filter((feature) => feature.properties.snapshot_date === effectiveSnapshot);

    return getCountryLookup(snapshotFeatures.length > 0 ? snapshotFeatures : features);
  }, [boundaryCollection, effectiveSnapshot]);
  const countryBoundsLookup = useMemo(() => {
    const lookup = new Map<string, L.LatLngBounds>();

    if (!boundaryCollection || effectiveSnapshot === "off") {
      return lookup;
    }

    for (const feature of boundaryCollection.features) {
      if (feature.properties.snapshot_date !== effectiveSnapshot) {
        continue;
      }

      const bounds = getFeatureBounds(feature);
      if (!bounds.isValid()) {
        continue;
      }

      const key = normalizeCountryKey(feature.properties.statename);
      const existing = lookup.get(key);

      if (existing) {
        existing.extend(bounds);
      } else {
        lookup.set(key, bounds);
      }
    }

    return lookup;
  }, [boundaryCollection, effectiveSnapshot]);
  const eventTypeLegend = useMemo(() => {
    const counts = new Map<string, number>();

    for (const battle of battles) {
      const type = battle.type ?? "冲突事件";
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([type]) => ({ type, color: getEventTypeColor(type) }));
  }, [battles]);
  const selectedBattle = useMemo(
    () => battles.find((battle) => battle.id === selectedBattleId) ?? null,
    [battles, selectedBattleId],
  );

  useEffect(() => {
    setSelectedCountryName(null);
  }, [battles, currentYear]);

  useEffect(() => {
    setYearFeedbackActive(true);
    const timeoutId = window.setTimeout(() => setYearFeedbackActive(false), 900);

    return () => window.clearTimeout(timeoutId);
  }, [currentYear, effectiveSnapshot]);
  const activeCountryHighlight = useMemo(() => {
    if (selectedCountryName) {
      return getCountryConflictHighlight(selectedCountryName, battles, countryLookup);
    }

    if (selectedBattle) {
      return getBattleCountrySides(selectedBattle, countryLookup);
    }

    return emptyCountryHighlight;
  }, [battles, countryLookup, selectedBattle, selectedCountryName]);
  const activeCountryHighlightKey = useMemo(
    () => getHighlightKey(activeCountryHighlight),
    [activeCountryHighlight],
  );
  const highlightedCountries = useMemo(
    () => getAllHighlightedCountries(activeCountryHighlight),
    [activeCountryHighlight],
  );
  const highlightedBattleIds = useMemo(() => {
    const battleIds = new Set<string>();

    if (selectedCountryName) {
      for (const battle of battles) {
        const sides = getBattleCountrySides(battle, countryLookup);
        const winnerSide = new Set([...sides.winnerMain, ...sides.winnerAllies]);
        const loserSide = new Set([...sides.loserMain, ...sides.loserAllies]);

        if (
          (winnerSide.has(selectedCountryName) && loserSide.size > 0) ||
          (loserSide.has(selectedCountryName) && winnerSide.size > 0) ||
          sides.internalConflict.has(selectedCountryName)
        ) {
          battleIds.add(battle.id);
        }
      }

      return battleIds;
    }

    if (highlightedCountries.size === 0) {
      return battleIds;
    }

    for (const battle of battles) {
      const sides = getBattleCountrySides(battle, countryLookup);
      if (hasIntersection(getAllHighlightedCountries(sides), highlightedCountries)) {
        battleIds.add(battle.id);
      }
    }

    return battleIds;
  }, [battles, countryLookup, highlightedCountries, selectedCountryName]);

  function fitBattleCountries(battle: Battle, options: L.FitBoundsOptions = {}) {
    const map = mapRef.current;

    if (!map) {
      return false;
    }

    const highlight = getBattleCountrySides(battle, countryLookup);
    const countryNames = getAllHighlightedCountries(highlight);
    let bounds: L.LatLngBounds | null = null;

    for (const countryName of countryNames) {
      const countryBounds = countryBoundsLookup.get(normalizeCountryKey(countryName));

      if (!countryBounds) {
        continue;
      }

      bounds = bounds
        ? bounds.extend(countryBounds)
        : L.latLngBounds(countryBounds.getSouthWest(), countryBounds.getNorthEast());
    }

    if (!bounds?.isValid()) {
      return false;
    }

    map.fitBounds(bounds.pad(0.12), {
      animate: true,
      duration: 0.55,
      paddingTopLeft: [20, 20],
      paddingBottomRight: [20, 20],
      maxZoom: 5,
      ...options,
    });

    return true;
  }

  function handleBattleSelect(battle: Battle) {
    setSelectedCountryName(null);
    onSelectBattle(battle.id);
  }

  function handleCountrySelect(statename: string, layer: L.Layer) {
    setSelectedCountryName(statename);

    if ("getBounds" in layer) {
      const bounds = (layer as L.Polygon).getBounds();
      if (bounds.isValid()) {
        mapRef.current?.fitBounds(bounds.pad(0.4), {
          animate: true,
          duration: 0.55,
          maxZoom: 5,
        });
      }
    }
  }

  useEffect(() => {
    let active = true;

    fetch("/data/basemaps/ne_110m_land.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Natural Earth 陆地底图加载失败：${response.status}`);
        }

        return response.json() as Promise<LandCollection>;
      })
      .then((collection) => {
        if (active) {
          setLandCollection(collection);
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    fetch("/data/cshapes/cshapes_1886_2003_snapshots.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`CShapes 历史边界快照加载失败：${response.status}`);
        }

        return response.json() as Promise<CShapesBoundaryCollection>;
      })
      .then((collection) => {
        if (active) {
          setBoundaryCollection(collection);
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      scrollWheelZoom: true,
      worldCopyJump: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      zoomSnap: 0.25,
      zoomDelta: 0.25,
      wheelPxPerZoomLevel: 140,
      wheelDebounceTime: 24,
    });

    const battleLayer = L.featureGroup().addTo(map);
    const heatLayer = L.featureGroup().addTo(map);
    mapRef.current = map;
    heatLayerRef.current = heatLayer;
    battleLayerRef.current = battleLayer;

    return () => {
      landLayerRef.current?.remove();
      boundaryLayerRef.current?.remove();
      heatLayerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      landLayerRef.current = null;
      boundaryLayerRef.current = null;
      heatLayerRef.current = null;
      battleLayerRef.current = null;
      markerRefs.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !landCollection) {
      return;
    }

    landLayerRef.current?.remove();

    const landLayer = L.geoJSON(landCollection, {
      interactive: false,
      style: getLandStyle,
    }).addTo(map);

    landLayer.bringToBack();
    heatLayerRef.current?.bringToFront();
    landLayerRef.current = landLayer;
    boundaryLayerRef.current?.bringToFront();
    battleLayerRef.current?.bringToFront();
  }, [landCollection]);

  useEffect(() => {
    const heatLayer = heatLayerRef.current;

    if (!heatLayer) {
      return;
    }

    heatLayer.clearLayers();

    if (!allConflictGroupMode) {
      return;
    }

    for (const cell of heatCells) {
      const intensity = cell.count / maxHeatCellCount;
      const heatMarker = L.rectangle(cell.bounds, {
        color: "rgba(255, 243, 191, 0.08)",
        weight: 0.5,
        fillColor: "#d47b5d",
        fillOpacity: 0.05 + Math.sqrt(intensity) * 0.62,
        interactive: false,
      });

      heatMarker.addTo(heatLayer);
    }

    heatLayer.bringToFront();
    battleLayerRef.current?.bringToFront();
  }, [allConflictGroupMode, heatCells, maxHeatCellCount]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    boundaryLayerRef.current?.remove();
    boundaryLayerRef.current = null;

    if (!boundaryCollection || effectiveSnapshot === "off") {
      return;
    }

    const filteredCollection: CShapesBoundaryCollection = {
      type: "FeatureCollection",
      features: boundaryCollection.features.filter(
        (feature) => feature.properties.snapshot_date === effectiveSnapshot,
      ),
    };

    const boundaryLayer = L.geoJSON(filteredCollection, {
      style: (feature) =>
        getBoundaryStyle(
          feature as GeoJSON.Feature<GeoJSON.Geometry, CShapesBoundaryProperties>,
          activeCountryHighlight,
        ),
      onEachFeature: (feature, layer) => {
        const properties = feature.properties as CShapesBoundaryProperties;
        layer.bindPopup(getBoundaryPopup(properties));
        layer.on("click", () => handleCountrySelect(properties.statename, layer));
      },
    }).addTo(map);

    battleLayerRef.current?.bringToFront();
    boundaryLayerRef.current = boundaryLayer;
  }, [activeCountryHighlight, activeCountryHighlightKey, boundaryCollection, effectiveSnapshot]);

  useEffect(() => {
    const battleLayer = battleLayerRef.current;

    if (!battleLayer) {
      return;
    }

    battleLayer.clearLayers();
    markerRefs.current.clear();

    for (const battle of battles) {
      const selected = battle.id === selectedBattleId;
      const highlighted = highlightedBattleIds.has(battle.id);
      const marker = L.circleMarker([battle.latitude, battle.longitude], getBattleStyle(battle, selected, highlighted))
        .bindPopup(getBattlePopup(battle))
        .on("click", () => handleBattleSelect(battle));

      marker.addTo(battleLayer);
      markerRefs.current.set(battle.id, marker);
    }
  }, [battles, highlightedBattleIds, selectedBattleId, onSelectBattle]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = selectedBattleId ? markerRefs.current.get(selectedBattleId) : null;
    const battle = selectedBattleId ? battles.find((row) => row.id === selectedBattleId) : null;

    if (!map || !marker || !battle) {
      return;
    }

    marker.openPopup();
    if (!fitBattleCountries(battle, { duration: 0.45 })) {
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 5), { animate: true, duration: 0.45 });
    }
  }, [battles, countryBoundsLookup, countryLookup, selectedBattleId]);

  return (
    <section className="view-panel map-panel">
      <div className="section-heading">
        <MapPinned size={18} />
        <h2>地图视图</h2>
      </div>
      <div className="map-stage" aria-label="交互式冲突事件地图">
        <div className="leaflet-map-shell">
          <div ref={mapContainerRef} className="leaflet-map" aria-label="交互式全球冲突事件地图" />
          <div
            className={yearFeedbackActive ? "map-year-feedback active" : "map-year-feedback"}
            role="status"
            aria-live="polite"
          >
            <strong>{currentYear}</strong>
            <span>{effectiveSnapshotLabel}</span>
          </div>
          <div className="boundary-control">
            <label>
              <span>{allConflictGroupMode ? "地图表达方式" : "CShapes 2.0 历史边界快照"}</span>
              <select
                value={allConflictGroupMode ? "heatmap" : selectedSnapshot}
                disabled={allConflictGroupMode}
                onChange={(event) => setSelectedSnapshot(event.target.value)}
              >
                {allConflictGroupMode ? <option value="heatmap">事件密度热力图</option> : null}
                {cshapesSnapshotOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <small>
              当前显示：{effectiveSnapshotLabel}
            </small>
          </div>
          <div className="map-legend" aria-label="冲突事件类型颜色图例">
            {allConflictGroupMode ? (
              <>
                <div>
                  <span style={{ "--legend-color": "#d47b5d" } as React.CSSProperties} />
                  <strong>事件密度越高颜色越深</strong>
                </div>
                <div>
                  <span style={{ "--legend-color": "#fff3bf" } as React.CSSProperties} />
                  <strong>小点仍可点击查看事件</strong>
                </div>
              </>
            ) : activeCountryHighlight.internalConflict.size > 0 ? (
              <div>
                <span style={{ "--legend-color": "#f59e0b" } as React.CSSProperties} />
                <strong>内部冲突</strong>
              </div>
            ) : null}
            {!allConflictGroupMode ? eventTypeLegend.map((style) => (
              <div key={style.type}>
                <span style={{ "--legend-color": style.color } as React.CSSProperties} />
                <strong>{style.type}</strong>
              </div>
            )) : null}
          </div>
        </div>
        <div className="map-list">
          {battles.length === 0 ? (
            <div className="empty-state empty-state-with-action">
              <p>{currentYear} 年没有可见的冲突事件。</p>
              <button className="secondary-action-button" type="button" onClick={onResetFilters}>
                重置筛选
              </button>
            </div>
          ) : (
            battles.slice(0, 8).map((battle) => (
              <button
                key={battle.id}
                className={battle.id === selectedBattleId ? "list-link active" : "list-link"}
                type="button"
                onClick={() => handleBattleSelect(battle)}
              >
                <span>{battle.name}</span>
                <small>{battle.year}</small>
              </button>
            ))
          )}
          {selectedBattle ? (
            <div className="map-selection">
              <strong>{selectedBattle.name}</strong>
              <span>{selectedBattle.locationName}</span>
              <button className="secondary-action-button compact" type="button" onClick={() => onSelectBattle(null)}>
                清除事件选择
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
