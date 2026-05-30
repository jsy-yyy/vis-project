import { BarChart3 } from "lucide-react";
import type { Battle, YearRange } from "../../types/domain";

type TimelineViewProps = {
  battles: Battle[];
  selectedBattleId: string | null;
  selectedYearRange: YearRange;
  onSelectBattle: (battleId: string) => void;
  onYearRangeChange: (range: YearRange) => void;
};

export function TimelineView({
  battles,
  selectedBattleId,
  selectedYearRange,
  onSelectBattle,
  onYearRangeChange,
}: TimelineViewProps) {
  const sortedBattles = [...battles].sort((a, b) => a.year - b.year);

  return (
    <section className="view-panel timeline-panel">
      <div className="section-heading">
        <BarChart3 size={18} />
        <h2>Timeline View</h2>
      </div>
      <div className="timeline-range">
        <span>{selectedYearRange[0]}</span>
        <input
          type="range"
          min={1500}
          max={1945}
          value={selectedYearRange[0]}
          onChange={(event) =>
            onYearRangeChange([Math.min(Number(event.target.value), selectedYearRange[1]), selectedYearRange[1]])
          }
          aria-label="Timeline start year"
        />
        <input
          type="range"
          min={1500}
          max={1945}
          value={selectedYearRange[1]}
          onChange={(event) =>
            onYearRangeChange([selectedYearRange[0], Math.max(Number(event.target.value), selectedYearRange[0])])
          }
          aria-label="Timeline end year"
        />
        <span>{selectedYearRange[1]}</span>
      </div>
      {sortedBattles.length === 0 ? (
        <div className="empty-state">The selected time window has no battles.</div>
      ) : (
        <div className="timeline-track">
          {sortedBattles.map((battle) => (
            <button
              key={battle.id}
              className={battle.id === selectedBattleId ? "timeline-item active" : "timeline-item"}
              type="button"
              onClick={() => onSelectBattle(battle.id)}
            >
              <span className="timeline-year">{battle.year}</span>
              <span className="timeline-label">{battle.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
