import { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinned } from "lucide-react";
import type * as GeoJSON from "geojson";
import type { Battle } from "../../types/domain";

type MapViewProps = {
  battles: Battle[];
  selectedBattleId: string | null;
  currentYear: number;
  onSelectBattle: (battleId: string) => void;
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

const countryAliasByKey: Record<string, string> = {
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
  egypt: "Egypt",
  egyptian: "Egypt",
  ethiopia: "Ethiopia",
  ethiopian: "Ethiopia",
  france: "France",
  french: "France",
  german: "Germany (Prussia)",
  germans: "Germany (Prussia)",
  germany: "Germany (Prussia)",
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
  prussia: "Germany (Prussia)",
  romanian: "Rumania",
  rumania: "Rumania",
  russia: "Russia (Soviet Union)",
  russian: "Russia (Soviet Union)",
  russians: "Russia (Soviet Union)",
  serbia: "Serbia",
  soviet: "Russia (Soviet Union)",
  soviets: "Russia (Soviet Union)",
  spain: "Spain",
  spanish: "Spain",
  turkey: "Turkey (Ottoman Empire)",
  turkish: "Turkey (Ottoman Empire)",
  turks: "Turkey (Ottoman Empire)",
  "united kingdom": "United Kingdom",
  "united states": "United States of America",
  usa: "United States of America",
  ussr: "Russia (Soviet Union)",
};

const emptyCountryHighlight: CountryHighlight = {
  selected: new Set(),
  winnerMain: new Set(),
  winnerAllies: new Set(),
  loserMain: new Set(),
  loserAllies: new Set(),
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
  { value: "auto", label: "Auto nearest to current year" },
  { value: "off", label: "Historical borders off" },
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
    return null;
  }

  const alias = countryAliasByKey[key];
  if (alias) {
    return countryLookup.get(normalizeCountryKey(alias)) ?? alias;
  }

  return countryLookup.get(key) ?? null;
}

function resolveCountryNames(values: string[] | undefined, countryLookup: Map<string, string>) {
  const resolved = new Set<string>();

  for (const value of values ?? []) {
    const countryName = resolveCountryName(value, countryLookup);
    if (countryName) {
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
  const winnerMain = resolveCountryNames(battle.winnerNames, countryLookup);
  const loserMain = resolveCountryNames(battle.loserNames, countryLookup);
  const participant1 = resolveCountryNames(battle.participant1Names, countryLookup);
  const participant2 = resolveCountryNames(battle.participant2Names, countryLookup);

  const shouldReverseParticipants =
    (hasIntersection(participant1, loserMain) && !hasIntersection(participant1, winnerMain)) ||
    (hasIntersection(participant2, winnerMain) && !hasIntersection(participant2, loserMain));

  const winnerSideParticipants = shouldReverseParticipants ? participant2 : participant1;
  const loserSideParticipants = shouldReverseParticipants ? participant1 : participant2;

  return {
    selected: new Set(),
    winnerMain,
    winnerAllies: without(winnerSideParticipants, winnerMain),
    loserMain,
    loserAllies: without(loserSideParticipants, loserMain),
  };
}

function getAllHighlightedCountries(highlight: CountryHighlight) {
  return new Set([
    ...highlight.selected,
    ...highlight.winnerMain,
    ...highlight.winnerAllies,
    ...highlight.loserMain,
    ...highlight.loserAllies,
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
    const winnerSide = new Set([...sides.winnerMain, ...sides.winnerAllies]);
    const loserSide = new Set([...sides.loserMain, ...sides.loserAllies]);

    if (winnerSide.has(countryName)) {
      mergeInto(sameMain, without(sides.winnerMain, selected));
      mergeInto(sameAllies, without(sides.winnerAllies, selected));
      mergeInto(enemyMain, sides.loserMain);
      mergeInto(enemyAllies, sides.loserAllies);
    }

    if (loserSide.has(countryName)) {
      mergeInto(sameMain, without(sides.loserMain, selected));
      mergeInto(sameAllies, without(sides.loserAllies, selected));
      mergeInto(enemyMain, sides.winnerMain);
      mergeInto(enemyAllies, sides.winnerAllies);
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
  };
}

function getHighlightKey(highlight: CountryHighlight) {
  return [
    [...highlight.selected].sort().join("|"),
    [...highlight.winnerMain].sort().join("|"),
    [...highlight.winnerAllies].sort().join("|"),
    [...highlight.loserMain].sort().join("|"),
    [...highlight.loserAllies].sort().join("|"),
  ].join("::");
}

function getBattlePopup(battle: Battle) {
  const time = battle.endDate ? `${battle.startDate ?? battle.year} to ${battle.endDate}` : battle.startDate ?? battle.year;
  const winner = battle.winnerNames?.join(", ") || "Unknown";
  const loser = battle.loserNames?.join(", ") || "Unknown";
  const participants = battle.participantNames?.join(", ") || "Unknown";

  return `
    <div class="battle-popup">
      <strong>${escapeHtml(battle.name)}</strong>
      <span>${escapeHtml(time)}</span>
      <span>${escapeHtml(battle.locationName ?? "Unknown location")}</span>
      <span>${escapeHtml(battle.type ?? "Conflict event")}</span>
      <span>Winner: ${escapeHtml(winner)}</span>
      <span>Loser: ${escapeHtml(loser)}</span>
      <span>Participants: ${escapeHtml(participants)}</span>
      <span>${escapeHtml(battle.result ?? "Outcome unknown")}</span>
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

function getEventTypeColor(type = "Conflict event") {
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
    radius: selected ? selectedMarkerStyle.radius : Math.min(9, 5 + battle.participants.length * 0.35),
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
      <span>Source: ${escapeHtml(properties.source)}</span>
    </div>
  `;
}

function getNearestSnapshot(year: number) {
  return cshapesSnapshots.reduce((nearest, snapshot) => {
    const nearestDistance = Math.abs(nearest.year - year);
    const snapshotDistance = Math.abs(snapshot.year - year);
    return snapshotDistance < nearestDistance ? snapshot : nearest;
  }, cshapesSnapshots[0]);
}

export function MapView({ battles, selectedBattleId, currentYear, onSelectBattle }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const landLayerRef = useRef<L.GeoJSON | null>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const battleLayerRef = useRef<L.FeatureGroup | null>(null);
  const markerRefs = useRef<Map<string, L.CircleMarker>>(new Map());
  const [selectedSnapshot, setSelectedSnapshot] = useState("auto");
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null);
  const [landCollection, setLandCollection] = useState<LandCollection | null>(null);
  const [boundaryCollection, setBoundaryCollection] = useState<CShapesBoundaryCollection | null>(null);
  const effectiveSnapshot = selectedSnapshot === "auto" ? getNearestSnapshot(currentYear).date : selectedSnapshot;
  const countryLookup = useMemo(() => {
    const features = boundaryCollection?.features ?? [];
    const snapshotFeatures =
      effectiveSnapshot === "off"
        ? features
        : features.filter((feature) => feature.properties.snapshot_date === effectiveSnapshot);

    return getCountryLookup(snapshotFeatures.length > 0 ? snapshotFeatures : features);
  }, [boundaryCollection, effectiveSnapshot]);
  const eventTypeLegend = useMemo(() => {
    const counts = new Map<string, number>();

    for (const battle of battles) {
      const type = battle.type ?? "Conflict event";
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
          (loserSide.has(selectedCountryName) && winnerSide.size > 0)
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

  function handleBattleSelect(battle: Battle) {
    const map = mapRef.current;
    setSelectedCountryName(null);
    onSelectBattle(battle.id);

    if (map) {
      map.flyTo([battle.latitude, battle.longitude], Math.max(map.getZoom(), 5), {
        animate: true,
        duration: 0.55,
      });
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

  useEffect(() => {
    let active = true;

    fetch("/data/basemaps/ne_110m_land.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load Natural Earth land layer: ${response.status}`);
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
          throw new Error(`Failed to load CShapes snapshots: ${response.status}`);
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
    mapRef.current = map;
    battleLayerRef.current = battleLayer;

    return () => {
      landLayerRef.current?.remove();
      boundaryLayerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      landLayerRef.current = null;
      boundaryLayerRef.current = null;
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
    battleLayerRef.current?.bringToFront();
  }, [landCollection]);

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

    if (!map || !marker) {
      return;
    }

    marker.openPopup();
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 5), { animate: true, duration: 0.45 });
  }, [selectedBattleId, battles]);

  return (
    <section className="view-panel map-panel">
      <div className="section-heading">
        <MapPinned size={18} />
        <h2>Map View</h2>
      </div>
      <div className="map-stage" aria-label="Interactive conflict event map">
        <div className="leaflet-map-shell">
          <div ref={mapContainerRef} className="leaflet-map" aria-label="Interactive world conflict event map" />
          {battles.length === 0 ? (
            <div className="map-empty-overlay">No conflict events in {currentYear} match the current filters.</div>
          ) : null}
          <div className="boundary-control">
            <label>
              <span>CShapes 2.0 boundary snapshot</span>
              <select value={selectedSnapshot} onChange={(event) => setSelectedSnapshot(event.target.value)}>
                {cshapesSnapshotOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <small>
              Showing {cshapesSnapshots.find((snapshot) => snapshot.date === effectiveSnapshot)?.label ?? "off"}
            </small>
          </div>
          <div className="map-legend" aria-label="Conflict event type color legend">
            {eventTypeLegend.map((style) => (
              <div key={style.type}>
                <span style={{ "--legend-color": style.color } as React.CSSProperties} />
                <strong>{style.type}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="map-list">
          {battles.length === 0 ? (
            <div className="empty-state">No visible conflict events in {currentYear}.</div>
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
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
