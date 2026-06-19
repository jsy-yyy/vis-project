import type { Battle } from "../types/domain";

export type MapHeatCell = {
  key: string;
  latCell: number;
  lngCell: number;
  latitude: number;
  longitude: number;
  count: number;
  bounds: [[number, number], [number, number]];
  battleIds: string[];
};

export const mapHeatGridSize = 8;
export const eventMarkerZoomThreshold = 5;

export type MapLayerMode = "heat" | "events";

export function getMapLayerMode(
  zoom: number,
  threshold = eventMarkerZoomThreshold,
): MapLayerMode {
  return zoom >= threshold ? "events" : "heat";
}

export function getHeatCellTargetZoom(
  boundsZoom: number,
  threshold = eventMarkerZoomThreshold,
) {
  return Math.max(threshold, Math.min(threshold + 1, boundsZoom));
}

export function shouldClearHeatCellFocus(
  zoom: number,
  threshold = eventMarkerZoomThreshold,
) {
  return getMapLayerMode(zoom, threshold) === "heat";
}

export function shouldAutoFocusBattleSelection(
  selectedBattleId: string | null,
  lastAutoFocusedBattleId: string | null,
) {
  return Boolean(selectedBattleId && selectedBattleId !== lastAutoFocusedBattleId);
}

export function getMapHeatCells(battles: Battle[], gridSize = mapHeatGridSize) {
  const cells = new Map<
    string,
    {
      latCell: number;
      lngCell: number;
      latitudeSum: number;
      longitudeSum: number;
      count: number;
      battleIds: string[];
    }
  >();

  for (const battle of battles) {
    const latCell = Math.floor((battle.latitude + 90) / gridSize);
    const lngCell = Math.floor((battle.longitude + 180) / gridSize);
    const key = `${latCell}:${lngCell}`;
    const cell = cells.get(key) ?? {
      latCell,
      lngCell,
      latitudeSum: 0,
      longitudeSum: 0,
      count: 0,
      battleIds: [],
    };

    cell.latitudeSum += battle.latitude;
    cell.longitudeSum += battle.longitude;
    cell.count += 1;
    cell.battleIds.push(battle.id);
    cells.set(key, cell);
  }

  return Array.from(cells.entries())
    .map(([key, cell]): MapHeatCell => {
      const south = cell.latCell * gridSize - 90;
      const west = cell.lngCell * gridSize - 180;

      return {
        key,
        latCell: cell.latCell,
        lngCell: cell.lngCell,
        latitude: cell.latitudeSum / cell.count,
        longitude: cell.longitudeSum / cell.count,
        count: cell.count,
        bounds: [
          [Math.max(-90, south), Math.max(-180, west)],
          [Math.min(90, south + gridSize), Math.min(180, west + gridSize)],
        ],
        battleIds: cell.battleIds,
      };
    })
    .sort((left, right) => right.count - left.count);
}

export function filterBattlesByHeatCell(battles: Battle[], cell: MapHeatCell | null) {
  if (!cell) {
    return battles;
  }

  const battleIds = new Set(cell.battleIds);
  return battles.filter((battle) => battleIds.has(battle.id));
}
