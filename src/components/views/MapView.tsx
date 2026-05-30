import { MapPinned } from "lucide-react";
import type { Battle } from "../../types/domain";

type MapViewProps = {
  battles: Battle[];
  selectedBattleId: string | null;
  onSelectBattle: (battleId: string) => void;
};

const bounds = {
  minLng: -12,
  maxLng: 46,
  minLat: 34,
  maxLat: 61,
};

function projectBattle(battle: Battle) {
  const x = ((battle.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = (1 - (battle.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
  return {
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(6, Math.min(94, y)),
  };
}

export function MapView({ battles, selectedBattleId, onSelectBattle }: MapViewProps) {
  return (
    <section className="view-panel map-panel">
      <div className="section-heading">
        <MapPinned size={18} />
        <h2>Map View</h2>
      </div>
      {battles.length === 0 ? (
        <div className="empty-state">No battles match the current filters.</div>
      ) : (
        <div className="map-stage" aria-label="Battle map placeholder">
          <svg viewBox="0 0 100 100" role="img" aria-label="Projected battle locations">
            <path className="map-shape shape-west" d="M8 48 C18 30 31 22 42 31 C50 38 41 55 51 64 C42 72 24 73 14 62 Z" />
            <path className="map-shape shape-east" d="M45 31 C62 18 83 22 92 40 C88 58 76 73 57 71 C51 60 57 45 45 31 Z" />
            <path className="map-route" d="M23 62 C35 50 44 48 53 55 C65 64 73 57 83 43" />
            {battles.map((battle) => {
              const point = projectBattle(battle);
              const selected = battle.id === selectedBattleId;
              return (
                <g
                  key={battle.id}
                  className="svg-button"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectBattle(battle.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      onSelectBattle(battle.id);
                    }
                  }}
                >
                  <circle className={selected ? "battle-dot selected" : "battle-dot"} cx={point.x} cy={point.y} r={selected ? 3.8 : 2.8} />
                  <title>{battle.name}</title>
                </g>
              );
            })}
          </svg>
          <div className="map-list">
            {battles.slice(0, 5).map((battle) => (
              <button
                key={battle.id}
                className={battle.id === selectedBattleId ? "list-link active" : "list-link"}
                type="button"
                onClick={() => onSelectBattle(battle.id)}
              >
                <span>{battle.name}</span>
                <small>{battle.year}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
