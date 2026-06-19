import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ListTree } from "lucide-react";
import { getAdjacentBattleId } from "../../lib/battleInteraction";
import { summarizeBattles } from "../../lib/battleAnalytics";
import { getTimelinePeriodComparison, getYearlyEventSummary } from "../../lib/timelineAnalytics";
import type { AnalysisMode, Battle, Participant, YearRange } from "../../types/domain";

type TimelineDetailsProps = {
  baselineBattles: Battle[];
  filteredBattles: Battle[];
  participants: Participant[];
  selectedBattleId: string | null;
  selectedBattleYear: number | null;
  selectedBattleLocked: boolean;
  allYearRange: YearRange;
  selectedYearRange: YearRange;
  analysisMode: AnalysisMode;
  currentYear: number;
  onSelectBattle: (battleId: string | null) => void;
  onResetFilters: () => void;
};

const eventListLimit = 24;
const eventListPageSize = 24;

export function TimelineDetails({
  baselineBattles,
  filteredBattles,
  participants,
  selectedBattleId,
  selectedBattleYear,
  selectedBattleLocked,
  allYearRange,
  selectedYearRange,
  analysisMode,
  currentYear,
  onSelectBattle,
  onResetFilters,
}: TimelineDetailsProps) {
  const [expanded, setExpanded] = useState(false);
  const [visibleEventCount, setVisibleEventCount] = useState(eventListLimit);
  const participantNames = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant.name])),
    [participants],
  );
  const currentYearBattles = useMemo(
    () =>
      (analysisMode === "range" ? filteredBattles : filteredBattles.filter((battle) => battle.year === currentYear))
        .sort((left, right) => left.year - right.year || left.name.localeCompare(right.name)),
    [analysisMode, currentYear, filteredBattles],
  );
  const rangeSummary = useMemo(() => summarizeBattles(filteredBattles), [filteredBattles]);
  const currentYearSummary = useMemo(
    () => getYearlyEventSummary(baselineBattles, filteredBattles, currentYear),
    [baselineBattles, currentYear, filteredBattles],
  );
  const periodComparison = useMemo(
    () => getTimelinePeriodComparison(filteredBattles, currentYear, selectedYearRange),
    [currentYear, filteredBattles, selectedYearRange],
  );
  const previousBattleId = getAdjacentBattleId(currentYearBattles, selectedBattleId, -1);
  const nextBattleId = getAdjacentBattleId(currentYearBattles, selectedBattleId, 1);
  const visibleCurrentYearBattles = currentYearBattles.slice(0, visibleEventCount);
  const activeLabel =
    analysisMode === "range" ? `${selectedYearRange[0]}–${selectedYearRange[1]} 年` : `${currentYear} 年`;
  const selectedBattleOutsideActiveScope =
    selectedBattleLocked &&
    selectedBattleYear !== null &&
    (analysisMode === "range"
      ? selectedBattleYear < selectedYearRange[0] || selectedBattleYear > selectedYearRange[1]
      : selectedBattleYear !== currentYear);

  useEffect(() => {
    setVisibleEventCount(eventListLimit);
  }, [analysisMode, currentYear, filteredBattles, selectedYearRange]);

  function formatRange(range: YearRange | null) {
    if (!range) {
      return "无可用区间";
    }
    return range[0] === range[1] ? String(range[0]) : `${range[0]}–${range[1]}`;
  }

  return (
    <section
      id="timeline-details"
      className={expanded ? "view-panel timeline-details expanded" : "view-panel timeline-details"}
    >
      <button
        className="timeline-details-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls="timeline-details-content"
        onClick={() => setExpanded((value) => !value)}
      >
        <span>
          <ListTree size={18} />
          <strong>{activeLabel}详情</strong>
          <small>
            {currentYearBattles.length} 条当前结果
            {analysisMode === "range" ? " · 多年度分析" : ""}
          </small>
        </span>
        <span>
          {selectedBattleOutsideActiveScope ? `锁定事件位于 ${selectedBattleYear} 年 · ` : ""}
          {expanded ? "收起" : "展开分析"}
          <ChevronDown size={17} />
        </span>
      </button>

      {expanded ? (
        <div id="timeline-details-content" className="timeline-details-content">
          <div className="timeline-analysis-grid">
            <article className="timeline-analysis-card">
              <h3>{activeLabel}摘要</h3>
              <dl>
                <div>
                  <dt>{analysisMode === "range" ? "范围内事件" : "窗口内全部事件"}</dt>
                  <dd>{analysisMode === "range" ? baselineBattles.length : currentYearSummary.totalCount}</dd>
                </div>
                <div><dt>符合当前参战方</dt><dd>{currentYearBattles.length}</dd></div>
                <div>
                  <dt>主要参战方</dt>
                  <dd>
                    {(analysisMode === "range" ? rangeSummary.topParticipants : currentYearSummary.topParticipants).length > 0
                      ? (analysisMode === "range" ? rangeSummary.topParticipants : currentYearSummary.topParticipants)
                          .map(([id, count]) => `${participantNames.get(id) ?? id} (${count})`)
                          .join(", ")
                      : "没有匹配的参战方"}
                  </dd>
                </div>
              </dl>
            </article>
            <article className="timeline-analysis-card">
              <h3>{analysisMode === "range" ? "范围概览" : "前后阶段对比"}</h3>
              <dl>
                {analysisMode === "range" ? (
                  <>
                    <div><dt>{selectedYearRange[0]}</dt><dd>起始年</dd></div>
                    <div><dt>{formatRange(rangeSummary.yearRange)}</dt><dd>{rangeSummary.totalBattles} 条</dd></div>
                    <div><dt>{selectedYearRange[1]}</dt><dd>结束年</dd></div>
                  </>
                ) : (
                  <>
                    <div><dt>{formatRange(periodComparison.previousRange)}</dt><dd>{periodComparison.previousCount} 条</dd></div>
                    <div><dt>{currentYear}</dt><dd>{currentYearSummary.filteredCount} 条</dd></div>
                    <div><dt>{formatRange(periodComparison.nextRange)}</dt><dd>{periodComparison.nextCount} 条</dd></div>
                  </>
                )}
              </dl>
              <p>
                {analysisMode === "range"
                  ? "当前列表展示所选年份范围内的全部匹配事件。"
                  : "基于当前年份窗口和参战方状态，对比当前年份前后各五年。"}
              </p>
            </article>
          </div>

          <div className="timeline-event-heading">
            <h3>{activeLabel}事件</h3>
            <div className="timeline-event-navigation">
              <span>显示 {visibleCurrentYearBattles.length} / {currentYearBattles.length}</span>
              <button
                className="secondary-action-button compact"
                type="button"
                disabled={!previousBattleId}
                onClick={() => previousBattleId && onSelectBattle(previousBattleId)}
              >
                上一事件
              </button>
              <button
                className="secondary-action-button compact"
                type="button"
                disabled={!nextBattleId}
                onClick={() => nextBattleId && onSelectBattle(nextBattleId)}
              >
                下一事件
              </button>
              {selectedBattleId ? (
                <button className="secondary-action-button compact" type="button" onClick={() => onSelectBattle(null)}>
                  清除事件
                </button>
              ) : null}
            </div>
          </div>

          {currentYearBattles.length === 0 ? (
            <div className="empty-state empty-state-with-action">
              <p>{activeLabel}没有符合当前联动状态的冲突事件。</p>
              <button className="secondary-action-button" type="button" onClick={onResetFilters}>重置联动</button>
            </div>
          ) : (
            <div className="timeline-track">
              {visibleCurrentYearBattles.map((battle) => (
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

          {currentYearBattles.length > eventListLimit ? (
            <div className="timeline-list-actions">
              <button
                className="secondary-action-button compact"
                type="button"
                onClick={() =>
                  setVisibleEventCount((count) =>
                    count < currentYearBattles.length
                      ? Math.min(count + eventListPageSize, currentYearBattles.length)
                      : eventListLimit)}
              >
                {visibleEventCount < currentYearBattles.length ? "查看更多事件" : "收起事件列表"}
              </button>
            </div>
          ) : null}
          <p className="timeline-details-footnote">完整数据范围：{allYearRange[0]}–{allYearRange[1]}</p>
        </div>
      ) : null}
    </section>
  );
}
