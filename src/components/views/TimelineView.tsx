import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { BarChart3 } from "lucide-react";
import {
  getTimelinePeriodComparison,
  getYearlyEventCounts,
  getYearlyEventSummary,
} from "../../lib/timelineAnalytics";
import type { Battle, Participant, War, YearRange } from "../../types/domain";

type TimelineViewProps = {
  baselineBattles: Battle[];
  filteredBattles: Battle[];
  wars: War[];
  participants: Participant[];
  selectedBattleId: string | null;
  allYearRange: YearRange;
  selectedYearRange: YearRange;
  currentYear: number;
  yearAdjustmentMessage: string | null;
  onSelectBattle: (battleId: string | null) => void;
  onCurrentYearChange: (year: number) => void;
  onResetFilters: () => void;
};

const eventListLimit = 24;
const eventListPageSize = 24;

export function TimelineView({
  baselineBattles,
  filteredBattles,
  wars,
  participants,
  selectedBattleId,
  allYearRange,
  selectedYearRange,
  currentYear,
  yearAdjustmentMessage,
  onSelectBattle,
  onCurrentYearChange,
  onResetFilters,
}: TimelineViewProps) {
  const chartScrollRef = useRef<HTMLDivElement | null>(null);
  const selectedBarRef = useRef<HTMLButtonElement | null>(null);
  const [visibleEventCount, setVisibleEventCount] = useState(eventListLimit);
  const participantNames = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant.name])),
    [participants],
  );
  const warNames = useMemo(
    () => new Map(wars.map((war) => [war.id, war.name])),
    [wars],
  );
  const sortedBattles = useMemo(
    () => [...filteredBattles].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name)),
    [filteredBattles],
  );
  const currentYearBattles = useMemo(
    () => sortedBattles.filter((battle) => battle.year === currentYear),
    [currentYear, sortedBattles],
  );
  const visibleCurrentYearBattles = currentYearBattles.slice(0, visibleEventCount);
  const hasHiddenCurrentYearBattles = visibleEventCount < currentYearBattles.length;
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
  const maxScaledCount = Math.sqrt(maxCount);
  const middleCount = Math.ceil(maxCount / 4);
  const currentYearCount = filteredCountByYear.get(currentYear) ?? 0;
  const yearTickInterval =
    baselineYearlyCounts.length <= 20 ? 1 : baselineYearlyCounts.length <= 60 ? 5 : 10;
  const currentYearSummary = useMemo(
    () => getYearlyEventSummary(baselineBattles, filteredBattles, currentYear),
    [baselineBattles, currentYear, filteredBattles],
  );
  const periodComparison = useMemo(
    () => getTimelinePeriodComparison(filteredBattles, currentYear, selectedYearRange),
    [currentYear, filteredBattles, selectedYearRange],
  );

  function getParticipantLabel(participantId: string) {
    return participantNames.get(participantId) ?? participantId;
  }

  function getConflictGroupLabel(warId: string) {
    return warNames.get(warId) ?? warId;
  }

  function formatRange(range: YearRange | null) {
    if (!range) {
      return "无可用区间";
    }

    return range[0] === range[1] ? String(range[0]) : `${range[0]}-${range[1]}`;
  }

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

  useEffect(() => {
    setVisibleEventCount(eventListLimit);
  }, [currentYear, filteredBattles, selectedYearRange]);

  function handleBattleSelect(battle: Battle) {
    onCurrentYearChange(battle.year);
    onSelectBattle(battle.id);
  }

  function handleBarKeyDown(event: KeyboardEvent<HTMLButtonElement>, year: number) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onCurrentYearChange(Math.max(minYear, year - 1));
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      onCurrentYearChange(Math.min(maxYear, year + 1));
    }
  }

  function getScaledHeight(count: number) {
    return `${(Math.sqrt(count) / maxScaledCount) * 100}%`;
  }

  return (
    <section className="view-panel timeline-panel">
      <div className="section-heading">
        <BarChart3 size={18} />
        <h2>时间轴视图</h2>
      </div>
      <div className="timeline-year-control">
        <div className="timeline-control-heading">
          <div>
            <strong>地图年份</strong>
            <span>地图仅显示该单一年份的冲突事件。</span>
          </div>
          <output aria-label="当前地图年份">{currentYear}</output>
        </div>
        <div className="inline-actions">
          <button className="secondary-action-button compact" type="button" onClick={() => onCurrentYearChange(maxYear)}>
            重置年份到 {maxYear}
          </button>
          {selectedBattleId ? (
            <button className="secondary-action-button compact" type="button" onClick={() => onSelectBattle(null)}>
              清除事件选择
            </button>
          ) : null}
        </div>
        <div className="timeline-range">
          <span>{minYear}</span>
          <input
            type="range"
            min={minYear}
            max={maxYear}
            value={currentYear}
            onChange={(event) => onCurrentYearChange(Number(event.target.value))}
            aria-label="选择地图显示的单一年份"
          />
          <span>{maxYear}</span>
        </div>
        {yearAdjustmentMessage ? (
          <p className="timeline-adjustment-note" role="status">{yearAdjustmentMessage}</p>
        ) : null}
      </div>

      <div className="timeline-chart-heading">
        <div>
          <h3>按年份统计冲突事件</h3>
          <p>对比年份窗口内的整体背景与当前筛选结果。点击柱子可切换地图年份。</p>
        </div>
        <div className="timeline-legend" aria-label="时间轴图例">
          <span><i className="baseline" />外层：年份窗口全部事件</span>
          <span><i className="filtered" />内层：符合当前筛选</span>
          <span><i className="selected" />描边：当前地图年份</span>
          <span><i className="scaled" />柱高：平方根缩放</span>
        </div>
      </div>
      <div className="timeline-chart-frame">
        <div className="timeline-y-axis" aria-hidden="true">
          <strong>事件数</strong>
          <span>{maxCount}</span>
          <span>{middleCount}</span>
          <span>0</span>
        </div>
        <div ref={chartScrollRef} className="timeline-chart-scroll">
          <div className="timeline-chart" aria-label="按年份统计冲突事件">
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
                  title={`${year} 年：${filteredCount} 条符合筛选，${count} 条总事件`}
                  aria-label={`${year} 年：${filteredCount} 条符合筛选的冲突事件，${count} 条总冲突事件`}
                  aria-pressed={selected}
                  onClick={() => onCurrentYearChange(year)}
                  onKeyDown={(event) => handleBarKeyDown(event, year)}
                >
                  <span className="timeline-bar-slot">
                    <span
                      className="timeline-bar-fill baseline"
                      style={{
                        height: getScaledHeight(count),
                        minHeight: count > 0 ? "2px" : undefined,
                      }}
                    />
                    <span
                      className="timeline-bar-fill filtered"
                      style={{
                        height: getScaledHeight(filteredCount),
                        minHeight: filteredCount > 0 ? "2px" : undefined,
                      }}
                    />
                  </span>
                  <small>{showYear ? year : ""}</small>
                </button>
              );
            })}
          </div>
          <div className="timeline-x-axis">年份</div>
        </div>
      </div>
      <div className="timeline-current-year" aria-label="当前时间轴年份">
        当前年份：{currentYear}
        <small>
          地图显示 {currentYearCount} 条事件 | 可用年份窗口 {absoluteMinYear}-{absoluteMaxYear}
        </small>
      </div>
      <div className="timeline-analysis-grid">
        <article className="timeline-analysis-card">
          <h3>{currentYear} 年摘要</h3>
          <dl>
            <div>
              <dt>窗口内全部事件</dt>
              <dd>{currentYearSummary.totalCount}</dd>
            </div>
            <div>
              <dt>符合当前筛选</dt>
              <dd>{currentYearSummary.filteredCount}</dd>
            </div>
            <div>
              <dt>主要冲突组</dt>
              <dd>
                {currentYearSummary.topConflictGroups.length > 0
                  ? currentYearSummary.topConflictGroups
                      .map(([group, count]) => `${getConflictGroupLabel(group)} (${count})`)
                      .join(", ")
                  : "没有匹配的冲突组"}
              </dd>
            </div>
            <div>
              <dt>主要参战方</dt>
              <dd>
                {currentYearSummary.topParticipants.length > 0
                  ? currentYearSummary.topParticipants
                      .map(([participantId, count]) => `${getParticipantLabel(participantId)} (${count})`)
                      .join(", ")
                  : "没有匹配的参战方"}
              </dd>
            </div>
          </dl>
        </article>
        <article className="timeline-analysis-card">
          <h3>前后阶段对比</h3>
          <dl>
            <div>
              <dt>{formatRange(periodComparison.previousRange)}</dt>
              <dd>此前 {periodComparison.previousCount} 条事件</dd>
            </div>
            <div>
              <dt>{currentYear}</dt>
              <dd>当前年份 {currentYearSummary.filteredCount} 条事件</dd>
            </div>
            <div>
              <dt>{formatRange(periodComparison.nextRange)}</dt>
              <dd>此后 {periodComparison.nextCount} 条事件</dd>
            </div>
          </dl>
          <p>
            对比基于当前筛选条件，并取当前地图年份前后各五年的窗口。
          </p>
        </article>
      </div>
      <div className="timeline-event-heading">
        <h3>{currentYear} 年事件</h3>
        <span>
          显示 {visibleCurrentYearBattles.length} / {currentYearBattles.length}
        </span>
      </div>
      {currentYearBattles.length === 0 ? (
        <div className="empty-state empty-state-with-action">
          <p>{currentYear} 年没有符合当前筛选的冲突事件。</p>
          <button className="secondary-action-button" type="button" onClick={onResetFilters}>
            重置筛选
          </button>
        </div>
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
      {currentYearBattles.length > eventListLimit ? (
        <div className="timeline-list-actions">
          {hasHiddenCurrentYearBattles ? (
            <button
              className="secondary-action-button compact"
              type="button"
              onClick={() => setVisibleEventCount((count) => Math.min(count + eventListPageSize, currentYearBattles.length))}
            >
              查看更多事件
            </button>
          ) : (
            <button
              className="secondary-action-button compact"
              type="button"
              onClick={() => setVisibleEventCount(eventListLimit)}
            >
              收起事件列表
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
