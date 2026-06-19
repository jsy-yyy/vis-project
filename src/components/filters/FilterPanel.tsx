import { useEffect, useMemo, useState } from "react";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { filterNamedRows } from "../../lib/appState";
import type { Participant, YearRange } from "../../types/domain";

type FilterPanelProps = {
  participants: Participant[];
  allYearRange: YearRange;
  selectedYearRange: YearRange;
  selectedParticipant: string | null;
  onYearRangeChange: (range: YearRange) => void;
  onParticipantChange: (participantId: string | null) => void;
  onReset: () => void;
};

export function FilterPanel({
  participants,
  allYearRange,
  selectedYearRange,
  selectedParticipant,
  onYearRangeChange,
  onParticipantChange,
  onReset,
}: FilterPanelProps) {
  const [minYear, maxYear] = allYearRange;
  const [participantSearch, setParticipantSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const visibleParticipants = useMemo(
    () => filterNamedRows(participants, participantSearch),
    [participantSearch, participants],
  );
  const participantOptions = useMemo(() => {
    const selectedParticipantRow = participants.find((participant) => participant.id === selectedParticipant);
    return selectedParticipantRow &&
      !visibleParticipants.some((participant) => participant.id === selectedParticipantRow.id)
      ? [selectedParticipantRow, ...visibleParticipants]
      : visibleParticipants;
  }, [participants, selectedParticipant, visibleParticipants]);
  const selectedParticipantName = selectedParticipant
    ? participants.find((participant) => participant.id === selectedParticipant)?.name ?? selectedParticipant
    : "全部参战方";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const syncExpandedState = () => setExpanded(false);

    syncExpandedState();
    mediaQuery.addEventListener("change", syncExpandedState);
    return () => mediaQuery.removeEventListener("change", syncExpandedState);
  }, []);

  function handleReset() {
    onReset();
    setParticipantSearch("");
  }

  function updateStartYear(value: number) {
    onYearRangeChange([Math.min(value, selectedYearRange[1]), selectedYearRange[1]]);
  }

  function updateEndYear(value: number) {
    onYearRangeChange([selectedYearRange[0], Math.max(value, selectedYearRange[0])]);
  }

  return (
    <div className={expanded ? "filter-panel expanded" : "filter-panel collapsed"}>
      <div className="filter-panel-heading">
        <div className="panel-title-inline">
          <SlidersHorizontal size={18} />
          <span>全局筛选</span>
        </div>
        <span className="filter-summary">
          {selectedYearRange[0]}-{selectedYearRange[1]} · {selectedParticipantName}
        </span>
        {!expanded ? (
          <button className="filter-heading-reset" type="button" onClick={handleReset} title="重置筛选">
            <RotateCcw size={15} />
            <span>重置</span>
          </button>
        ) : null}
        <button
          className="filter-toggle-button"
          type="button"
          aria-label={expanded ? "收起全局筛选" : "展开全局筛选"}
          aria-expanded={expanded}
          aria-controls="global-filter-fields"
          title={expanded ? "收起全局筛选" : "展开全局筛选"}
          onClick={() => setExpanded((current) => !current)}
        >
          <span>{expanded ? "收起" : "展开"}</span>
          <ChevronDown size={17} />
        </button>
      </div>

      <div id="global-filter-fields" className="filter-fields">
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
          onClick={handleReset}
        >
          <RotateCcw size={16} />
          重置
        </button>
      </div>
    </div>
  );
}
