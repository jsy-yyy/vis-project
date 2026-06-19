import { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronsDown, ChevronsUp, MapPinned, Search } from "lucide-react";
import type * as GeoJSON from "geojson";
import {
  getAdjacentBattleId,
  getVisibleBattlePage,
  searchAndSortBattles,
  type BattleSortKey,
} from "../../lib/battleInteraction";
import { escapeHtml, getBattlePopupHtml } from "../../lib/battlePopup";
import {
  eventMarkerZoomThreshold,
  filterBattlesByHeatCell,
  getHeatCellTargetZoom,
  getMapHeatCells,
  getMapLayerMode,
  shouldAutoFocusBattleSelection,
  shouldClearHeatCellFocus,
} from "../../lib/mapHeat";
import type { Battle, Participant } from "../../types/domain";

type MapViewProps = {
  battles: Battle[];
  selectedBattleId: string | null;
  currentYear: number;
  participants: Participant[];
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
  color: "#0c1013",
  weight: 2,
  fillOpacity: 0.88,
};

const selectedMarkerStyle: L.CircleMarkerOptions = {
  radius: 10,
  color: "#fff7e6",
  weight: 3,
  fillColor: "#f1b86b",
  fillOpacity: 1,
};

const eventTypeColors: Record<string, string> = {
  land: "#ff8066",
  sea: "#69b7ff",
  air: "#b99cff",
  "land and sea": "#5ed3c6",
  "land and air": "#f1b86b",
  "sea and air": "#78d3f2",
  "air and sea": "#78d3f2",
  massacre: "#f0525f",
};
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
  ...cshapesSnapshots.map((snapshot) => ({ value: snapshot.date, label: snapshot.label })),
];

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

function getEventTypeColor(type = "冲突事件") {
  return eventTypeColors[type.trim().toLowerCase()] ?? "#9aa7ad";
}

function getBattleStyle(
  battle: Battle,
  selected: boolean,
  highlighted: boolean,
  pulsing: boolean,
): L.CircleMarkerOptions {
  if (highlighted) {
    return {
      ...baseMarkerStyle,
      radius: selected ? 11 : 9,
      color: selected ? "#fff7e6" : "#ffffff",
      weight: selected ? 4 : 3,
      fillColor: "#f0525f",
      fillOpacity: 1,
      className: pulsing ? "battle-marker selected-pulse" : "battle-marker",
    };
  }

  return {
    ...(selected ? selectedMarkerStyle : baseMarkerStyle),
    radius: selected ? selectedMarkerStyle.radius : baseMarkerStyle.radius,
    fillColor: selected ? selectedMarkerStyle.fillColor : getEventTypeColor(battle.type),
    className: pulsing ? "battle-marker selected-pulse" : "battle-marker",
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
      color: "#fff7e6",
      fillColor: "#f1b86b",
      fillOpacity: 0.72,
      opacity: 1,
      weight: 3,
    };
  }

  if (statename && highlight.internalConflict.has(statename)) {
    return {
      color: "#fff7e6",
      fillColor: "#f1b86b",
      fillOpacity: 0.64,
      opacity: 1,
      weight: 2.4,
    };
  }

  if (statename && highlight.winnerMain.has(statename)) {
    return {
      color: "#e6f3ff",
      fillColor: "#3988d5",
      fillOpacity: 0.62,
      opacity: 1,
      weight: 2,
    };
  }

  if (statename && highlight.winnerAllies.has(statename)) {
    return {
      color: "#d8ecff",
      fillColor: "#69b7ff",
      fillOpacity: 0.46,
      opacity: 0.95,
      weight: 1.6,
    };
  }

  if (statename && highlight.loserMain.has(statename)) {
    return {
      color: "#ffe7e2",
      fillColor: "#d94f5c",
      fillOpacity: 0.62,
      opacity: 1,
      weight: 2,
    };
  }

  if (statename && highlight.loserAllies.has(statename)) {
    return {
      color: "#ffe6df",
      fillColor: "#ff8066",
      fillOpacity: 0.46,
      opacity: 0.95,
      weight: 1.6,
    };
  }

  const opacity = snapshotYear < 1945 ? 0.18 : 0.14;
  return {
    color: "#65737b",
    fillColor: "#4d5a61",
    fillOpacity: opacity,
    opacity: 0.58,
    weight: 1,
  };
}

function getLandStyle(): L.PathOptions {
  return {
    color: "#536169",
    fillColor: "#20272b",
    fillOpacity: 0.94,
    opacity: 0.78,
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

export function MapView({
  battles,
  selectedBattleId,
  currentYear,
  participants,
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
  const lastAutoFocusedBattleIdRef = useRef<string | null>(null);
  const pendingPopupBattleIdRef = useRef<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState("auto");
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null);
  const [landCollection, setLandCollection] = useState<LandCollection | null>(null);
  const [boundaryCollection, setBoundaryCollection] = useState<CShapesBoundaryCollection | null>(null);
  const [yearFeedbackActive, setYearFeedbackActive] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const [eventSortKey, setEventSortKey] = useState<BattleSortKey>("name");
  const [expandedEventList, setExpandedEventList] = useState(false);
  const [previewBattleId, setPreviewBattleId] = useState<string | null>(null);
  const [pulseBattleId, setPulseBattleId] = useState<string | null>(null);
  const [focusedHeatCellKey, setFocusedHeatCellKey] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(2);
  const [mapInstanceVersion, setMapInstanceVersion] = useState(0);
  const participantNames = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant.name])),
    [participants],
  );
  const heatCells = useMemo(() => getMapHeatCells(battles), [battles]);
  const maxHeatCellCount = Math.max(1, ...heatCells.map((cell) => cell.count));
  const mapLayerMode = getMapLayerMode(mapZoom);
  const focusedHeatCell = useMemo(
    () => heatCells.find((cell) => cell.key === focusedHeatCellKey) ?? null,
    [focusedHeatCellKey, heatCells],
  );
  const focusedHeatBattleIds = useMemo(
    () => new Set(focusedHeatCell?.battleIds ?? []),
    [focusedHeatCell],
  );
  const listBattles = useMemo(
    () => filterBattlesByHeatCell(battles, focusedHeatCell),
    [battles, focusedHeatCell],
  );
  const effectiveSnapshot =
    selectedSnapshot === "auto" ? getSnapshotForYear(currentYear).date : selectedSnapshot;
  const effectiveSnapshotLabel =
    `密度气泡 + CShapes 快照 ${cshapesSnapshots.find((snapshot) => snapshot.date === effectiveSnapshot)?.label ?? effectiveSnapshot}`;
  const countryLookup = useMemo(() => {
    const features = boundaryCollection?.features ?? [];
    const snapshotFeatures = features.filter(
      (feature) => feature.properties.snapshot_date === effectiveSnapshot,
    );

    return getCountryLookup(snapshotFeatures.length > 0 ? snapshotFeatures : features);
  }, [boundaryCollection, effectiveSnapshot]);
  const countryBoundsLookup = useMemo(() => {
    const lookup = new Map<string, L.LatLngBounds>();

    if (!boundaryCollection) {
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
  const sortedListBattles = useMemo(
    () => searchAndSortBattles(listBattles, eventSearch, eventSortKey, participantNames),
    [eventSearch, eventSortKey, listBattles, participantNames],
  );
  const visibleListBattles = useMemo(
    () => getVisibleBattlePage(sortedListBattles, expandedEventList, 8),
    [expandedEventList, sortedListBattles],
  );
  const previousBattleId = getAdjacentBattleId(sortedListBattles, selectedBattleId, -1);
  const nextBattleId = getAdjacentBattleId(sortedListBattles, selectedBattleId, 1);

  useEffect(() => {
    setSelectedCountryName(null);
    setPreviewBattleId(null);
    setFocusedHeatCellKey(null);
  }, [battles, currentYear]);

  useEffect(() => {
    setExpandedEventList(false);
  }, [eventSearch, eventSortKey, currentYear]);

  useEffect(() => {
    if (!selectedBattleId) {
      setPulseBattleId(null);
      lastAutoFocusedBattleIdRef.current = null;
      pendingPopupBattleIdRef.current = null;
      return;
    }

    setPulseBattleId(selectedBattleId);
    const timeoutId = window.setTimeout(() => setPulseBattleId(null), 900);
    return () => window.clearTimeout(timeoutId);
  }, [selectedBattleId]);

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
  const selectedBattleHasCountrySides = Boolean(
    selectedBattle && highlightedCountries.size > 0,
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

    const paddedBounds = bounds.pad(0.12);
    if (map.getBoundsZoom(paddedBounds, false, L.point(20, 20)) < eventMarkerZoomThreshold) {
      return false;
    }

    map.fitBounds(paddedBounds, {
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
    focusBattleMarkerLayer(battle);
    onSelectBattle(battle.id);
  }

  function focusBattleMarkerLayer(battle: Battle) {
    const map = mapRef.current;
    lastAutoFocusedBattleIdRef.current = battle.id;
    pendingPopupBattleIdRef.current = battle.id;

    if (!map) {
      return;
    }

    const fittedCountries = fitBattleCountries(battle, { duration: 0.45 });
    const targetZoom = Math.max(map.getZoom(), eventMarkerZoomThreshold);

    if (!fittedCountries) {
      setMapZoom(targetZoom);
      map.setView([battle.latitude, battle.longitude], targetZoom, { animate: true });
    }

    const marker = markerRefs.current.get(battle.id);
    if (marker && getMapLayerMode(targetZoom) === "events") {
      marker.openPopup();
      pendingPopupBattleIdRef.current = null;
    }
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

  function handleHeatCellSelect(cell: ReturnType<typeof getMapHeatCells>[number]) {
    const map = mapRef.current;
    setFocusedHeatCellKey(cell.key);
    setExpandedEventList(false);

    if (!map) {
      return;
    }

    const bounds = L.latLngBounds(cell.bounds);
    const targetZoom = getHeatCellTargetZoom(
      map.getBoundsZoom(bounds.pad(0.08), false, L.point(32, 32)),
    );

    map.flyTo(bounds.getCenter(), targetZoom, {
      animate: true,
      duration: 0.5,
    });
  }

  function clearHeatCellFocus() {
    setFocusedHeatCellKey(null);
    setExpandedEventList(false);
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
    const handleZoomEnd = () => {
      const nextZoom = map.getZoom();
      setMapZoom(nextZoom);

      if (shouldClearHeatCellFocus(nextZoom)) {
        setFocusedHeatCellKey(null);
        setExpandedEventList(false);
      }
    };

    map.on("zoomend", handleZoomEnd);
    mapRef.current = map;
    heatLayerRef.current = heatLayer;
    battleLayerRef.current = battleLayer;
    setMapInstanceVersion((version) => version + 1);

    return () => {
      map.off("zoomend", handleZoomEnd);
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
    landLayerRef.current = landLayer;
    boundaryLayerRef.current?.bringToFront();
    heatLayerRef.current?.bringToFront();
    battleLayerRef.current?.bringToFront();
  }, [landCollection]);

  useEffect(() => {
    const heatLayer = heatLayerRef.current;

    if (!heatLayer) {
      return;
    }

    heatLayer.clearLayers();

    if (mapLayerMode !== "heat") {
      return;
    }

    for (const cell of heatCells) {
      const intensity = cell.count / maxHeatCellCount;
      const heatMarker = L.circleMarker([cell.latitude, cell.longitude], {
        radius: 3 + Math.sqrt(intensity) * 17,
        color: "rgba(255, 192, 177, 0.54)",
        weight: 1,
        fillColor: "#ff8066",
        fillOpacity: 0.12 + Math.sqrt(intensity) * 0.5,
        className: cell.key === focusedHeatCellKey ? "density-bubble active" : "density-bubble",
        interactive: true,
      });

      heatMarker
        .bindTooltip(`${currentYear} 年 · ${cell.count} 条事件 · 点击查看该区域事件`)
        .on("click", () => handleHeatCellSelect(cell));

      heatMarker.addTo(heatLayer);
    }

    heatLayer.bringToFront();
    battleLayerRef.current?.bringToFront();
  }, [currentYear, focusedHeatCellKey, heatCells, mapLayerMode, maxHeatCellCount]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    boundaryLayerRef.current?.remove();
    boundaryLayerRef.current = null;

    if (!boundaryCollection) {
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

    heatLayerRef.current?.bringToFront();
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

    if (mapLayerMode !== "events") {
      return;
    }

    for (const battle of battles) {
      const selected = battle.id === selectedBattleId;
      const highlighted =
        highlightedBattleIds.has(battle.id) ||
        focusedHeatBattleIds.has(battle.id) ||
        battle.id === previewBattleId;
      const marker = L.circleMarker(
        [battle.latitude, battle.longitude],
        getBattleStyle(battle, selected, highlighted, battle.id === pulseBattleId),
      )
        .bindPopup(getBattlePopupHtml(battle), { className: "battle-popup-leaflet" })
        .on("click", () => handleBattleSelect(battle));

      marker.addTo(battleLayer);
      markerRefs.current.set(battle.id, marker);
    }
  }, [
    battles,
    focusedHeatBattleIds,
    highlightedBattleIds,
    mapLayerMode,
    onSelectBattle,
    previewBattleId,
    pulseBattleId,
    selectedBattleId,
  ]);

  useEffect(() => {
    const battle = selectedBattleId ? battles.find((row) => row.id === selectedBattleId) : null;

    if (
      mapInstanceVersion === 0 ||
      !battle ||
      !shouldAutoFocusBattleSelection(selectedBattleId, lastAutoFocusedBattleIdRef.current)
    ) {
      return;
    }

    focusBattleMarkerLayer(battle);
  }, [battles, mapInstanceVersion, selectedBattleId]);

  useEffect(() => {
    if (
      mapLayerMode !== "events" ||
      !selectedBattleId ||
      pendingPopupBattleIdRef.current !== selectedBattleId
    ) {
      return;
    }

    const marker = markerRefs.current.get(selectedBattleId);
    if (!marker) {
      return;
    }

    marker.openPopup();
    pendingPopupBattleIdRef.current = null;
  }, [mapLayerMode, selectedBattleId]);

  return (
    <section id="map-view" className="view-panel map-panel">
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
          <div className="map-layer-mode" aria-live="polite">
            {mapLayerMode === "heat" ? "聚合气泡模式" : "事件点模式"}
          </div>
          <div className="boundary-control">
            <label>
              <span>CShapes 2.0 历史边界快照</span>
              <select
                value={selectedSnapshot}
                onChange={(event) => setSelectedSnapshot(event.target.value)}
              >
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
            {mapLayerMode === "heat" ? (
              <div>
                <span style={{ "--legend-color": "#ff8066" } as React.CSSProperties} />
                <strong>气泡越大、颜色越亮，当前年份事件越集中</strong>
              </div>
            ) : null}
            {mapLayerMode === "events" ? (
              <>
                {activeCountryHighlight.internalConflict.size > 0 ? (
                  <div>
                    <span style={{ "--legend-color": "#f1b86b" } as React.CSSProperties} />
                    <strong>内部冲突</strong>
                  </div>
                ) : null}
                {activeCountryHighlight.winnerMain.size > 0 ? (
                  <div>
                    <span style={{ "--legend-color": "#69b7ff" } as React.CSSProperties} />
                    <strong>{selectedCountryName ? "同阵营" : "胜方"}</strong>
                  </div>
                ) : null}
                {activeCountryHighlight.loserMain.size > 0 ? (
                  <div>
                    <span style={{ "--legend-color": "#d94f5c" } as React.CSSProperties} />
                    <strong>{selectedCountryName ? "对立方" : "败方"}</strong>
                  </div>
                ) : null}
                {eventTypeLegend.map((style) => (
                  <div key={style.type}>
                    <span style={{ "--legend-color": style.color } as React.CSSProperties} />
                    <strong>{style.type}</strong>
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </div>
        <div className="map-list">
          {focusedHeatCell ? (
            <div className="map-heat-focus" role="status">
              <span>
                <strong>已聚焦密度气泡</strong>
                {focusedHeatCell.count} 条事件
              </span>
              <button type="button" onClick={clearHeatCellFocus}>
                退出区域聚焦
              </button>
            </div>
          ) : null}
          <div className="map-list-tools">
            <label className="map-search-field">
              <Search size={15} />
              <input
                value={eventSearch}
                type="search"
                placeholder="搜索事件、地点、类型、参战方"
                onChange={(event) => setEventSearch(event.target.value)}
              />
            </label>
            <label className="map-sort-field">
              <span>排序</span>
              <select
                value={eventSortKey}
                onChange={(event) => setEventSortKey(event.target.value as BattleSortKey)}
              >
                <option value="name">名称</option>
                <option value="location">地点</option>
                <option value="type">事件类型</option>
              </select>
            </label>
          </div>
          {battles.length === 0 ? (
            <div className="empty-state empty-state-with-action">
              <p>{currentYear} 年没有可见的冲突事件。</p>
              <button className="secondary-action-button" type="button" onClick={onResetFilters}>
                重置筛选
              </button>
            </div>
          ) : sortedListBattles.length === 0 ? (
            <div className="empty-state">
              <p>没有匹配“{eventSearch}”的事件。</p>
            </div>
          ) : (
            visibleListBattles.map((battle) => (
              <button
                key={battle.id}
                className={[
                  "list-link",
                  battle.id === selectedBattleId ? "active" : "",
                  battle.id === previewBattleId ? "preview" : "",
                ].join(" ")}
                type="button"
                onPointerEnter={() => setPreviewBattleId(battle.id)}
                onPointerLeave={() => setPreviewBattleId(null)}
                onFocus={() => setPreviewBattleId(battle.id)}
                onBlur={() => setPreviewBattleId(null)}
                onClick={() => handleBattleSelect(battle)}
              >
                <span>
                  <strong>{battle.name}</strong>
                  <em>{battle.locationName ?? "未知地点"} · {battle.type ?? "事件"}</em>
                </span>
                <small>{battle.year}</small>
              </button>
            ))
          )}
          {sortedListBattles.length > 8 ? (
            <button
              className="map-list-more"
              type="button"
              onClick={() => setExpandedEventList((expanded) => !expanded)}
            >
              {expandedEventList ? <ChevronsUp size={15} /> : <ChevronsDown size={15} />}
              {expandedEventList ? "收起" : `查看更多 ${sortedListBattles.length - 8} 条`}
            </button>
          ) : null}
          {selectedBattle ? (
            <div className="map-selection">
              <strong>{selectedBattle.name}</strong>
              <span>{selectedBattle.locationName}</span>
              {!selectedBattleHasCountrySides ? (
                <span className="map-color-data-note" role="status">
                  该事件没有可靠的胜败方或国家映射数据，未应用国家阵营着色。
                </span>
              ) : null}
              <div className="map-selection-actions">
                <button
                  className="secondary-action-button compact"
                  type="button"
                  disabled={!previousBattleId}
                  onClick={() => previousBattleId && onSelectBattle(previousBattleId)}
                >
                  上一条
                </button>
                <button
                  className="secondary-action-button compact"
                  type="button"
                  disabled={!nextBattleId}
                  onClick={() => nextBattleId && onSelectBattle(nextBattleId)}
                >
                  下一条
                </button>
              </div>
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
