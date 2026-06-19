import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ListTree } from "lucide-react";
import { getAdjacentBattleId } from "../../lib/battleInteraction";
import { getTimelineChartSummary } from "../../lib/timelineAnalytics";
import type { AnalysisMode, Battle, YearRange } from "../../types/domain";

type TimelineDetailsProps = {
  baselineBattles: Battle[];
  filteredBattles: Battle[];
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
  const currentYearBattles = useMemo(
    () =>
      (analysisMode === "range" ? filteredBattles : filteredBattles.filter((battle) => battle.year === currentYear))
        .sort((left, right) => left.year - right.year || left.name.localeCompare(right.name)),
    [analysisMode, currentYear, filteredBattles],
  );
  const chartSummary = useMemo(
    () =>
      getTimelineChartSummary(
        baselineBattles,
        analysisMode,
        currentYear,
        selectedYearRange,
        allYearRange,
      ),
    [allYearRange, analysisMode, baselineBattles, currentYear, selectedYearRange],
  );
  const maxTimeCount = Math.max(1, ...chartSummary.bars.map((bar) => bar.count));
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
          <article className="timeline-chart-card timeline-temporal-chart">
            <header>
              <div>
                <h3>{chartSummary.title}</h3>
                <p>
                  {chartSummary.mode === "year-type"
                    ? "柱高表示年度事件量，颜色表示事件类型。"
                    : chartSummary.mode === "month"
                      ? "按事件日期汇总月份分布。"
                      : "当前数据缺少可用月份，回退展示本年度类型分布。"}
                </p>
              </div>
              <span>{currentYearBattles.length} 条当前结果</span>
            </header>
            {chartSummary.bars.length > 0 ? (
              <>
                <div
                  className={`timeline-stacked-bars ${chartSummary.mode}`}
                  role="img"
                  aria-label={`${activeLabel}${chartSummary.title}`}
                >
                  {chartSummary.bars.map((bar) => (
                    <div
                      key={bar.key}
                      className={bar.current ? "timeline-stacked-bar current" : "timeline-stacked-bar"}
                      data-total={bar.count}
                      title={`${bar.label}: ${bar.count} 条事件`}
                    >
                      <strong>{bar.count}</strong>
                      <span
                        className="timeline-stack"
                        style={{ height: `${Math.max(3, (bar.count / maxTimeCount) * 100)}%` }}
                      >
                        {bar.segments.map((segment) => (
                          <i
                            key={segment.key}
                            className={`timeline-stack-segment segment-${chartSummary.legend.indexOf(segment.label) % 6}`}
                            data-count={segment.count}
                            title={`${bar.label} · ${segment.label}: ${segment.count}`}
                            style={{ flexGrow: segment.count }}
                          />
                        ))}
                      </span>
                      <small>{bar.label}</small>
                    </div>
                  ))}
                </div>
                <div className="timeline-stack-legend" aria-label="图表图例">
                  {chartSummary.legend.map((label, index) => (
                    <span key={label}>
                      <i className={`segment-${index % 6}`} />
                      {label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="compact-empty">当前范围暂无可视化事件数据。</div>
            )}
          </article>

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
