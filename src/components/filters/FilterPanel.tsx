import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { Participant, War, YearRange } from "../../types/domain";

type FilterPanelProps = {
  wars: War[];
  participants: Participant[];
  allYearRange: YearRange;
  selectedWarId: string | null;
  selectedYearRange: YearRange;
  selectedParticipant: string | null;
  onWarChange: (warId: string | null) => void;
  onYearRangeChange: (range: YearRange) => void;
  onParticipantChange: (participantId: string | null) => void;
  onReset: () => void;
};

export function FilterPanel({
  wars,
  participants,
  allYearRange,
  selectedWarId,
  selectedYearRange,
  selectedParticipant,
  onWarChange,
  onYearRangeChange,
  onParticipantChange,
  onReset,
}: FilterPanelProps) {
  const [minYear, maxYear] = allYearRange;

  function updateStartYear(value: number) {
    onYearRangeChange([Math.min(value, selectedYearRange[1]), selectedYearRange[1]]);
  }

  function updateEndYear(value: number) {
    onYearRangeChange([selectedYearRange[0], Math.max(value, selectedYearRange[0])]);
  }

  return (
    <div className="filter-panel">
      <div className="panel-title-inline">
        <SlidersHorizontal size={18} />
        <span>Global Filters</span>
      </div>

      <label className="field">
        <span>Conflict group</span>
        <select value={selectedWarId ?? "all"} onChange={(event) => onWarChange(event.target.value)}>
          <option value="all">All conflict groups</option>
          {wars.map((war) => (
            <option key={war.id} value={war.id}>
              {war.name}
            </option>
          ))}
        </select>
      </label>

      <div className="range-fields">
        <label className="field">
          <span>Start year</span>
          <input
            type="number"
            min={minYear}
            max={maxYear}
            value={selectedYearRange[0]}
            onChange={(event) => updateStartYear(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>End year</span>
          <input
            type="number"
            min={minYear}
            max={maxYear}
            value={selectedYearRange[1]}
            onChange={(event) => updateEndYear(Number(event.target.value))}
          />
        </label>
      </div>

      <label className="field">
        <span>Participant</span>
        <select
          value={selectedParticipant ?? "all"}
          onChange={(event) => onParticipantChange(event.target.value === "all" ? null : event.target.value)}
        >
          <option value="all">All participants</option>
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.name}
            </option>
          ))}
        </select>
      </label>

      <button
        className="icon-text-button"
        type="button"
        onClick={onReset}
      >
        <RotateCcw size={16} />
        Reset
      </button>
    </div>
  );
}
