import { useMemo, useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { filterNamedRows } from "../../lib/appState";
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
}: FilterPanelProps) {
  const [minYear, maxYear] = allYearRange;
  const [warSearch, setWarSearch] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const visibleWars = useMemo(() => filterNamedRows(wars, warSearch), [warSearch, wars]);
  const visibleParticipants = useMemo(
    () => filterNamedRows(participants, participantSearch),
    [participantSearch, participants],
  );
  const warOptions = useMemo(() => {
    const selectedWar = selectedWarId && selectedWarId !== "all" ? wars.find((war) => war.id === selectedWarId) : null;
    return selectedWar && !visibleWars.some((war) => war.id === selectedWar.id)
      ? [selectedWar, ...visibleWars]
      : visibleWars;
  }, [selectedWarId, visibleWars, wars]);
  const participantOptions = useMemo(() => {
    const selectedParticipantRow = participants.find((participant) => participant.id === selectedParticipant);
    return selectedParticipantRow &&
      !visibleParticipants.some((participant) => participant.id === selectedParticipantRow.id)
      ? [selectedParticipantRow, ...visibleParticipants]
      : visibleParticipants;
  }, [participants, selectedParticipant, visibleParticipants]);

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
        <div className="stacked-control">
          <input
            type="search"
            value={warSearch}
            onChange={(event) => setWarSearch(event.target.value)}
            placeholder="Search groups"
            aria-label="Search conflict groups"
          />
          <select value={selectedWarId ?? "all"} onChange={(event) => onWarChange(event.target.value)}>
            <option value="all">All conflict groups</option>
            {warOptions.map((war) => (
              <option key={war.id} value={war.id}>
                {war.name}
              </option>
            ))}
          </select>
        </div>
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
        <div className="stacked-control">
          <input
            type="search"
            value={participantSearch}
            onChange={(event) => setParticipantSearch(event.target.value)}
            placeholder="Search participants"
            aria-label="Search participants"
          />
          <select
            value={selectedParticipant ?? "all"}
            onChange={(event) => onParticipantChange(event.target.value === "all" ? null : event.target.value)}
          >
            <option value="all">All participants</option>
            {participantOptions.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>
      </label>

      <button
        className="icon-text-button"
        type="button"
        onClick={() => {
          onWarChange("all");
          onYearRangeChange(allYearRange);
          onParticipantChange(null);
          setWarSearch("");
          setParticipantSearch("");
        }}
      >
        <RotateCcw size={16} />
        Reset
      </button>
    </div>
  );
}
