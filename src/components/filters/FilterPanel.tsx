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
        <span>全局筛选</span>
      </div>

      <label className="field">
        <span>冲突组 conflict group</span>
        <div className="stacked-control">
          <input
            type="search"
            value={warSearch}
            onChange={(event) => setWarSearch(event.target.value)}
            placeholder="搜索冲突组"
            aria-label="搜索冲突组"
          />
          <select value={selectedWarId ?? "all"} onChange={(event) => onWarChange(event.target.value)}>
            <option value="all">全部冲突组</option>
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
          <span>起始年份</span>
          <input
            type="number"
            min={minYear}
            max={maxYear}
            value={selectedYearRange[0]}
            onChange={(event) => updateStartYear(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>结束年份</span>
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
        <span>参战方 participant</span>
        <div className="stacked-control">
          <input
            type="search"
            value={participantSearch}
            onChange={(event) => setParticipantSearch(event.target.value)}
            placeholder="搜索参战方"
            aria-label="搜索参战方"
          />
          <select
            value={selectedParticipant ?? "all"}
            onChange={(event) => onParticipantChange(event.target.value === "all" ? null : event.target.value)}
          >
            <option value="all">全部参战方</option>
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
          onReset();
          setWarSearch("");
          setParticipantSearch("");
        }}
      >
        <RotateCcw size={16} />
        重置
      </button>
    </div>
  );
}
