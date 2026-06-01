import { useEffect, useMemo, useRef } from "react";
import { BarChart3 } from "lucide-react";
import { getYearlyEventCounts } from "../../lib/timelineAnalytics";
import type { Battle, YearRange } from "../../types/domain";

type TimelineViewProps = {
  baselineBattles: Battle[];
  filteredBattles: Battle[];
  selectedBattleId: string | null;
  allYearRange: YearRange;
  selectedYearRange: YearRange;
  currentYear: number;
  yearAdjustmentMessage: string | null;
  onSelectBattle: (battleId: string) => void;
  onCurrentYearChange: (year: number) => void;
};

const eventListLimit = 24;

export function TimelineView({
  baselineBattles,
  filteredBattles,
  selectedBattleId,
  allYearRange,
  selectedYearRange,
  currentYear,
  yearAdjustmentMessage,
  onSelectBattle,
  onCurrentYearChange,
}: TimelineViewProps) {
  const chartScrollRef = useRef<HTMLDivElement | null>(null);
  const selectedBarRef = useRef<HTMLButtonElement | null>(null);
  const sortedBattles = [...filteredBattles].sort((a, b) => a.year - b.year);
  const currentYearBattles = sortedBattles.filter((battle) => battle.year === currentYear);
  const visibleCurrentYearBattles = currentYearBattles.slice(0, eventListLimit);
  const [absoluteMinYear, absoluteMaxYear] = allYearRange;
  const [minYear, maxYear] = selectedYearRange;

  const baselineYearlyCounts = useMemo(
    () => getYearlyEventCounts(baselineBattles, selectedYearRange),
    [baselineBattles, selectedYearRange],
  );
  const filteredYearlyCounts = useMemo(
    () => getYearlyEventCounts(filteredBattles, selectedYearRange),
    [filteredBattles, selectedYearRange],
  );
  const filteredCountByYear = useMemo(
    () => new Map(filteredYearlyCounts.map((item) => [item.year, item.count])),
    [filteredYearlyCounts],
  );
  const maxCount = Math.max(1, ...baselineYearlyCounts.map((item) => item.count));
  const middleCount = Math.ceil(maxCount / 2);
  const currentYearCount = filteredCountByYear.get(currentYear) ?? 0;
  const yearTickInterval =
    baselineYearlyCounts.length <= 20 ? 1 : baselineYearlyCounts.length <= 60 ? 5 : 10;

  useEffect(() => {
    const chartScroll = chartScrollRef.current;
    const selectedBar = selectedBarRef.current;

    if (!chartScroll || !selectedBar) {
      return;
    }

    chartScroll.scrollTo({
      left: selectedBar.offsetLeft - chartScroll.clientWidth / 2 + selectedBar.clientWidth / 2,
      behavior: "smooth",
    });
  }, [currentYear]);

  function handleBattleSelect(battle: Battle) {
    onCurrentYearChange(battle.year);
    onSelectBattle(battle.id);
  }

  return (
    <section className="view-panel timeline-panel">
      <div className="section-heading">
        <BarChart3 size={18} />
        <h2>Timeline View</h2>
      </div>
      <div className="timeline-year-control">
        <div className="timeline-control-heading">
          <div>
            <strong>Map year</strong>
            <span>The map displays conflict events from this single year only.</span>
          </div>
          <output aria-label="Selected map year">{currentYear}</output>
        </div>
        <div className="timeline-range">
          <span>{minYear}</span>
          <input
            type="range"
            min={minYear}
            max={maxYear}
            value={currentYear}
            onChange={(event) => onCurrentYearChange(Number(event.target.value))}
            aria-label="Select the single year displayed on the map"
          />
          <span>{maxYear}</span>
        </div>
        {yearAdjustmentMessage ? (
          <p className="timeline-adjustment-note" role="status">{yearAdjustmentMessage}</p>
        ) : null}
      </div>

      <div className="timeline-chart-heading">
        <div>
          <h3>Conflict events by year</h3>
          <p>Compare the full time-window context with the current filters. Click a bar to change the map year.</p>
        </div>
        <div className="timeline-legend" aria-label="Timeline legend">
          <span><i className="baseline" />All events in year window</span>
          <span><i className="filtered" />Matching filters</span>
          <span><i className="selected" />Selected map year frame</span>
        </div>
      </div>
      <div className="timeline-chart-frame">
        <div className="timeline-y-axis" aria-hidden="true">
          <strong>Events</strong>
          <span>{maxCount}</span>
          <span>{middleCount}</span>
          <span>0</span>
        </div>
        <div ref={chartScrollRef} className="timeline-chart-scroll">
          <div className="timeline-chart" aria-label="Conflict events by year">
            {baselineYearlyCounts.map(({ year, count }, index) => {
              const selected = year === currentYear;
              const filteredCount = filteredCountByYear.get(year) ?? 0;
              const showYear =
                selected ||
                index === 0 ||
                index === baselineYearlyCounts.length - 1 ||
                year % yearTickInterval === 0;

              return (
                <button
                  key={year}
                  ref={selected ? selectedBarRef : undefined}
                  className={selected ? "timeline-bar active" : "timeline-bar"}
                  type="button"
                  title={`${year}: ${filteredCount} matching events, ${count} total events`}
                  aria-label={`${year}: ${filteredCount} matching conflict events, ${count} total conflict events`}
                  aria-pressed={selected}
                  onClick={() => onCurrentYearChange(year)}
                >
                  <span className="timeline-bar-slot">
                    <span
                      className="timeline-bar-fill baseline"
                      style={{
                        height: `${(count / maxCount) * 100}%`,
                        minHeight: count > 0 ? "2px" : undefined,
                      }}
                    />
                    <span
                      className="timeline-bar-fill filtered"
                      style={{
                        height: `${(filteredCount / maxCount) * 100}%`,
                        minHeight: filteredCount > 0 ? "2px" : undefined,
                      }}
                    />
                  </span>
                  <small>{showYear ? year : ""}</small>
                </button>
              );
            })}
          </div>
          <div className="timeline-x-axis">Year</div>
        </div>
      </div>
      <div className="timeline-current-year" aria-label="Current timeline year">
        Selected: {currentYear}
        <small>
          {currentYearCount} events shown on map | available window {absoluteMinYear}-{absoluteMaxYear}
        </small>
      </div>
      <div className="timeline-event-heading">
        <h3>Events in {currentYear}</h3>
        <span>
          Showing {visibleCurrentYearBattles.length} of {currentYearBattles.length}
        </span>
      </div>
      {currentYearBattles.length === 0 ? (
        <div className="empty-state">No conflict events in {currentYear} match the current filters.</div>
      ) : (
        <div className="timeline-track">
          {visibleCurrentYearBattles.map((battle) => (
            <button
              key={battle.id}
              className={battle.id === selectedBattleId ? "timeline-item active" : "timeline-item"}
              type="button"
              onClick={() => handleBattleSelect(battle)}
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
