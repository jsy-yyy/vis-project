import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  BarChart3,
  ChevronDown,
  Lightbulb,
  MapPinned,
  Network,
  Pause,
  Play,
  RotateCcw,
  SearchCheck,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { getAdjacentPlayableYear, getPlayableYears } from "../../lib/battleInteraction";
import type { CaseStudyAnalysis } from "../../lib/caseStudyAnalytics";
import { resolveCShapesSnapshot } from "../../lib/cshapesSnapshots";
import { getYearlyEventCounts } from "../../lib/timelineAnalytics";
import {
  getClosestYearRangeBoundary,
  getDraggedYearRange,
  normalizeYearRange,
  resolveOverlappingRangeBoundary,
  updateYearRangeBoundary,
  type YearRangeBoundary,
} from "../../lib/timelineRange";
import type { AnalysisMode, Battle, Participant, YearRange } from "../../types/domain";

type TimelineOverviewProps = {
  baselineBattles: Battle[];
  filteredBattles: Battle[];
  participants: Participant[];
  selectedParticipant: string | null;
  selectedBattle: Battle | null;
  selectedBattleLocked: boolean;
  selectedBattleOutOfScope: boolean;
  allYearRange: YearRange;
  analysisMode: AnalysisMode;
  selectedYearRange: YearRange;
  currentYear: number;
  yearAdjustmentMessage: string | null;
  caseStudies: CaseStudyAnalysis[];
  onAnalysisModeChange: (mode: AnalysisMode) => void;
  onYearRangeChange: (range: YearRange) => void;
  onCurrentYearChange: (year: number) => void;
  onApplyCaseStudy: (analysis: CaseStudyAnalysis) => void;
  onFocusCaseStudyParticipant: (analysis: CaseStudyAnalysis) => void;
  onClearParticipant: () => void;
  onClearBattle: () => void;
  onReset: () => void;
  onStatusChange: (message: string) => void;
};

export function TimelineOverview({
  baselineBattles,
  filteredBattles,
  participants,
  selectedParticipant,
  selectedBattle,
  selectedBattleLocked,
  selectedBattleOutOfScope,
  allYearRange,
  analysisMode,
  selectedYearRange,
  currentYear,
  yearAdjustmentMessage,
  caseStudies,
  onAnalysisModeChange,
  onYearRangeChange,
  onCurrentYearChange,
  onApplyCaseStudy,
  onFocusCaseStudyParticipant,
  onClearParticipant,
  onClearBattle,
  onReset,
  onStatusChange,
}: TimelineOverviewProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const rangeTrackRef = useRef<HTMLDivElement | null>(null);
  const brushAnchorRef = useRef<number | null>(null);
  const brushMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const rangeDragRef = useRef<{
    originYear: number;
    fixedYear: number;
    boundary: YearRangeBoundary | null;
    moved: boolean;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackDelay, setPlaybackDelay] = useState(1400);
  const [selectedCaseStudyId, setSelectedCaseStudyId] = useState(caseStudies[0]?.id ?? "");
  const [caseInsightsExpanded, setCaseInsightsExpanded] = useState(false);
  const allYearCounts = useMemo(
    () => getYearlyEventCounts(baselineBattles, allYearRange),
    [allYearRange, baselineBattles],
  );
  const filteredYearCounts = useMemo(
    () => new Map(getYearlyEventCounts(filteredBattles, allYearRange).map((item) => [item.year, item.count])),
    [allYearRange, filteredBattles],
  );
  const maxCount = Math.max(1, ...allYearCounts.map((item) => item.count));
  const playableYears = useMemo(() => getPlayableYears(filteredBattles), [filteredBattles]);
  const previousPlayableYear = getAdjacentPlayableYear(playableYears, currentYear, -1);
  const nextPlayableYear = getAdjacentPlayableYear(playableYears, currentYear, 1);
  const activeYearRange: YearRange = analysisMode === "range" ? selectedYearRange : [currentYear, currentYear];
  const rangeStartPercent =
    ((selectedYearRange[0] - allYearRange[0]) / Math.max(1, allYearRange[1] - allYearRange[0])) * 100;
  const rangeEndPercent =
    ((selectedYearRange[1] - allYearRange[0]) / Math.max(1, allYearRange[1] - allYearRange[0])) * 100;
  const selectedParticipantName = selectedParticipant
    ? participants.find((participant) => participant.id === selectedParticipant)?.name ?? selectedParticipant
    : null;
  const selectedCaseStudy =
    caseStudies.find((analysis) => analysis.id === selectedCaseStudyId) ?? caseStudies[0] ?? null;
  const snapshotReferenceYear = analysisMode === "range" ? selectedYearRange[1] : currentYear;
  const resolvedSnapshot = resolveCShapesSnapshot(snapshotReferenceYear);

  function formatPercentage(value: number) {
    return `${(value * 100).toFixed(1)}%`;
  }

  function formatParticipantName(id: string) {
    return participants.find((participant) => participant.id === id)?.name
      ?? id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  function formatSignedValue(value: number, suffix = "") {
    return `${value > 0 ? "+" : ""}${value}${suffix}`;
  }

  useEffect(() => {
    setIsPlaying(false);
  }, [analysisMode, filteredBattles, selectedYearRange]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const nextYear = getAdjacentPlayableYear(playableYears, currentYear, 1);
      if (nextYear === null) {
        setIsPlaying(false);
        onStatusChange("时间播放已到达当前筛选范围的最后一个事件年份。");
        return;
      }
      onCurrentYearChange(nextYear);
    }, playbackDelay);

    return () => window.clearTimeout(timeoutId);
  }, [currentYear, isPlaying, onCurrentYearChange, onStatusChange, playableYears, playbackDelay]);

  function getYearFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const bounds = chartRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) {
      return currentYear;
    }

    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    return Math.round(allYearRange[0] + ratio * (allYearRange[1] - allYearRange[0]));
  }

  function handleBrushStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (analysisMode !== "range") {
      return;
    }
    const year = getYearFromPointer(event);
    brushAnchorRef.current = year;
    brushMovedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleBrushMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (analysisMode !== "range") {
      return;
    }
    if (brushAnchorRef.current === null || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    brushMovedRef.current = true;
    onYearRangeChange(normalizeYearRange(brushAnchorRef.current, getYearFromPointer(event), allYearRange));
  }

  function handleBrushEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (analysisMode !== "range") {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!brushMovedRef.current) {
      const year = getYearFromPointer(event);
      onYearRangeChange([year, year]);
    }
    suppressClickRef.current = true;
    brushAnchorRef.current = null;
    brushMovedRef.current = false;
  }

  function handleYearKeyDown(event: KeyboardEvent<HTMLButtonElement>, year: number) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onCurrentYearChange(Math.max(allYearRange[0], year - 1));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onCurrentYearChange(Math.min(allYearRange[1], year + 1));
    }
  }

  function getYearFromRangePointer(event: ReactPointerEvent<HTMLElement>) {
    const bounds = rangeTrackRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) {
      return selectedYearRange[0];
    }

    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    return Math.round(allYearRange[0] + ratio * (allYearRange[1] - allYearRange[0]));
  }

  function beginRangeDrag(
    event: ReactPointerEvent<HTMLElement>,
    requestedBoundary?: YearRangeBoundary,
  ) {
    const pointerYear = getYearFromRangePointer(event);
    const boundary = requestedBoundary ?? getClosestYearRangeBoundary(selectedYearRange, pointerYear);
    const fixedYear =
      boundary === "start"
        ? selectedYearRange[1]
        : boundary === "end"
          ? selectedYearRange[0]
          : selectedYearRange[0];

    rangeDragRef.current = {
      originYear: pointerYear,
      fixedYear,
      boundary,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveRangeDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = rangeDragRef.current;
    if (!drag || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    const pointerYear = getYearFromRangePointer(event);
    const boundary =
      drag.boundary ?? resolveOverlappingRangeBoundary(drag.originYear, pointerYear);
    if (!boundary) {
      return;
    }

    drag.boundary = boundary;
    drag.moved = drag.moved || pointerYear !== drag.originYear;
    onYearRangeChange(getDraggedYearRange(drag.fixedYear, pointerYear, allYearRange));
  }

  function endRangeDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = rangeDragRef.current;
    if (!drag) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!drag.moved && drag.boundary) {
      onYearRangeChange(
        getDraggedYearRange(drag.fixedYear, getYearFromRangePointer(event), allYearRange),
      );
    }
    rangeDragRef.current = null;
  }

  function handleRangeHandleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    boundary: YearRangeBoundary,
  ) {
    const currentValue = boundary === "start" ? selectedYearRange[0] : selectedYearRange[1];
    let nextValue: number | null = null;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextValue = currentValue - 1;
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextValue = currentValue + 1;
    } else if (event.key === "Home") {
      nextValue = allYearRange[0];
    } else if (event.key === "End") {
      nextValue = allYearRange[1];
    }

    if (nextValue === null) {
      return;
    }

    event.preventDefault();
    onYearRangeChange(updateYearRangeBoundary(selectedYearRange, boundary, nextValue, allYearRange));
  }

  return (
    <section id="timeline-overview" className="view-panel timeline-overview-panel">
      <div className="timeline-overview-heading">
        <div className="section-heading">
          <BarChart3 size={18} />
          <div>
            <h2>时间概览与地图窗口</h2>
            <p>
              {analysisMode === "range"
                ? "拖动年度分布或双滑块选择多年度分析范围。"
                : "单击柱形或拖动拉条切换地图年份。"}
            </p>
          </div>
        </div>
        <output
          className="timeline-current-output"
          aria-label={analysisMode === "range" ? "当前窗口参考年份" : "当前地图年份"}
        >
          {analysisMode === "range" ? `参考 ${currentYear}` : currentYear}
        </output>
      </div>

      <div className="timeline-state-strip" aria-label="当前联动状态">
        <span>
          {analysisMode === "range" ? "年份窗口" : "地图年份"}{" "}
          <strong>{analysisMode === "range" ? `${selectedYearRange[0]}–${selectedYearRange[1]}` : currentYear}</strong>
          {analysisMode === "range" &&
          (selectedYearRange[0] !== allYearRange[0] || selectedYearRange[1] !== allYearRange[1]) ? (
            <button type="button" onClick={() => onYearRangeChange(allYearRange)}>恢复全时期</button>
          ) : null}
        </span>
        {selectedParticipantName ? (
          <span>
            参战方 <strong>{selectedParticipantName}</strong>
            <button type="button" onClick={onClearParticipant}><X size={13} />清除</button>
          </span>
        ) : (
          <span>参战方 <strong>全部</strong></span>
        )}
        {selectedBattle ? (
          <span className={selectedBattleOutOfScope ? "warning" : ""}>
            {selectedBattleLocked ? "锁定事件" : "选中事件"} <strong>{selectedBattle.name}</strong>
            <button type="button" onClick={onClearBattle}><X size={13} />清除</button>
          </span>
        ) : null}
      </div>

      <div className="analysis-mode-toggle" aria-label="分析模式">
        <button
          type="button"
          className={analysisMode === "single" ? "active" : ""}
          aria-pressed={analysisMode === "single"}
          onClick={() => onAnalysisModeChange("single")}
        >
          单年度分析
        </button>
        <button
          type="button"
          className={analysisMode === "range" ? "active" : ""}
          aria-pressed={analysisMode === "range"}
          onClick={() => onAnalysisModeChange("range")}
        >
          多年度分析
        </button>
      </div>

      <div
        ref={chartRef}
        className="timeline-overview-chart"
        aria-label="按年份统计的冲突事件分布，可拖动选择年份窗口"
        onPointerDown={handleBrushStart}
        onPointerMove={handleBrushMove}
        onPointerUp={handleBrushEnd}
        onPointerCancel={handleBrushEnd}
      >
        {allYearCounts.map(({ year, count }) => {
          const inRange = year >= activeYearRange[0] && year <= activeYearRange[1];
          const selected = year === currentYear;
          const filteredCount = filteredYearCounts.get(year) ?? 0;
          return (
            <button
              key={year}
              className={[
                "timeline-overview-bar",
                inRange ? "in-range" : "out-of-range",
                selected ? "active" : "",
              ].join(" ")}
              type="button"
              data-year={year}
              aria-label={`${year} 年：全部 ${count} 条，当前筛选结果 ${filteredCount} 条`}
              aria-pressed={selected}
              onClick={(event) => {
                event.stopPropagation();
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
                if (analysisMode === "range") {
                  onYearRangeChange([year, year]);
                } else {
                  onCurrentYearChange(year);
                }
              }}
              onKeyDown={(event) => handleYearKeyDown(event, year)}
            >
              <span
                className="timeline-overview-bar-total"
                style={{ height: `${Math.max(2, (Math.sqrt(count) / Math.sqrt(maxCount)) * 100)}%` }}
              />
              <span
                className="timeline-overview-bar-filtered"
                style={{ height: `${(Math.sqrt(filteredCount) / Math.sqrt(maxCount)) * 100}%` }}
              />
              {selected || year === allYearRange[0] || year === allYearRange[1] || year % 10 === 0 ? (
                <small>{year}</small>
              ) : null}
            </button>
          );
        })}
      </div>

      {analysisMode === "single" ? (
        <label
          className="timeline-current-slider"
          style={{
            "--timeline-slot": `${100 / allYearCounts.length}%`,
            "--timeline-half-slot": `${50 / allYearCounts.length}%`,
          } as CSSProperties}
        >
          <span className="timeline-current-slider-track">
            <input
              type="range"
              min={allYearRange[0]}
              max={allYearRange[1]}
              value={currentYear}
              onChange={(event) => onCurrentYearChange(Number(event.target.value))}
              aria-label="拖动选择地图年份"
            />
          </span>
          <span className="timeline-current-slider-labels">
            <span>{allYearRange[0]}</span>
            <output aria-label="拉条当前年份">{currentYear}</output>
            <span>{allYearRange[1]}</span>
          </span>
        </label>
      ) : (
        <div
          className="timeline-range-slider"
          style={{
            "--timeline-slot": `${100 / allYearCounts.length}%`,
            "--timeline-half-slot": `${50 / allYearCounts.length}%`,
            "--range-start": `${rangeStartPercent}%`,
            "--range-end": `${rangeEndPercent}%`,
          } as CSSProperties}
        >
          <div
            ref={rangeTrackRef}
            className="timeline-range-slider-interaction"
            aria-label="拖动选择多年度分析范围"
            onPointerDown={beginRangeDrag}
            onPointerMove={moveRangeDrag}
            onPointerUp={endRangeDrag}
            onPointerCancel={endRangeDrag}
          >
            <div className="timeline-range-slider-track" aria-hidden="true">
              <span />
            </div>
            <button
              type="button"
              className="timeline-range-handle start"
              style={{ left: `${rangeStartPercent}%` }}
              aria-label="拖动选择起始年份"
              aria-valuemin={allYearRange[0]}
              aria-valuemax={allYearRange[1]}
              aria-valuenow={selectedYearRange[0]}
              onPointerDown={(event) => {
                event.stopPropagation();
                beginRangeDrag(
                  event,
                  selectedYearRange[0] === selectedYearRange[1] ? undefined : "start",
                );
              }}
              onPointerMove={moveRangeDrag}
              onPointerUp={endRangeDrag}
              onPointerCancel={endRangeDrag}
              onKeyDown={(event) => handleRangeHandleKeyDown(event, "start")}
            />
            <button
              type="button"
              className="timeline-range-handle end"
              style={{ left: `${rangeEndPercent}%` }}
              aria-label="拖动选择结束年份"
              aria-valuemin={allYearRange[0]}
              aria-valuemax={allYearRange[1]}
              aria-valuenow={selectedYearRange[1]}
              onPointerDown={(event) => {
                event.stopPropagation();
                beginRangeDrag(
                  event,
                  selectedYearRange[0] === selectedYearRange[1] ? undefined : "end",
                );
              }}
              onPointerMove={moveRangeDrag}
              onPointerUp={endRangeDrag}
              onPointerCancel={endRangeDrag}
              onKeyDown={(event) => handleRangeHandleKeyDown(event, "end")}
            />
          </div>
          <div className="timeline-range-slider-labels">
            <span>{allYearRange[0]}</span>
            <output aria-label="拉条年份范围">
              {selectedYearRange[0]}–{selectedYearRange[1]}
            </output>
            <span>{allYearRange[1]}</span>
          </div>
        </div>
      )}

      <div className="timeline-overview-controls">
        <div className="timeline-mode-summary" aria-live="polite">
          {analysisMode === "range"
            ? `分析范围 ${selectedYearRange[0]}–${selectedYearRange[1]}，窗口参考 ${currentYear}，历史边界快照 ${resolvedSnapshot.label}`
            : `地图显示 ${currentYear} 年事件，历史边界快照 ${resolvedSnapshot.label}`}
        </div>
        <div className="timeline-playback-controls">
          <button
            className="icon-control-button"
            type="button"
            disabled={analysisMode === "range" || previousPlayableYear === null}
            onClick={() => previousPlayableYear !== null && onCurrentYearChange(previousPlayableYear)}
            title="上一个有事件的年份"
          >
            <SkipBack size={16} />
          </button>
          <button
            className={isPlaying ? "icon-control-button active" : "icon-control-button"}
            type="button"
            disabled={analysisMode === "range" || playableYears.length < 2}
            aria-pressed={isPlaying}
            onClick={() => {
              if (!isPlaying && nextPlayableYear === null && playableYears.length > 0) {
                onCurrentYearChange(playableYears[0]);
              }
              setIsPlaying((playing) => !playing);
            }}
            title={isPlaying ? "暂停时间播放" : "播放时间轴"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            className="icon-control-button"
            type="button"
            disabled={analysisMode === "range" || nextPlayableYear === null}
            onClick={() => nextPlayableYear !== null && onCurrentYearChange(nextPlayableYear)}
            title="下一个有事件的年份"
          >
            <SkipForward size={16} />
          </button>
          <label className="timeline-speed-control">
            <span>速度</span>
            <select
              value={playbackDelay}
              disabled={analysisMode === "range"}
              onChange={(event) => setPlaybackDelay(Number(event.target.value))}
            >
              <option value={2200}>慢</option>
              <option value={1400}>标准</option>
              <option value={800}>快</option>
            </select>
          </label>
          <button className="secondary-action-button compact" type="button" onClick={onReset}>
            <RotateCcw size={14} />重置联动
          </button>
        </div>
      </div>
      {selectedCaseStudy ? (
        <div
          className={caseInsightsExpanded ? "timeline-case-presets expanded" : "timeline-case-presets"}
          aria-label="案例分析预设"
        >
          <div className="timeline-case-preset-controls">
            <label>
              <span>案例预设</span>
              <select
                value={selectedCaseStudy.id}
                onChange={(event) => setSelectedCaseStudyId(event.target.value)}
              >
                {caseStudies.map((analysis) => (
                  <option key={analysis.id} value={analysis.id}>
                    {analysis.label} · {analysis.range[0]}–{analysis.range[1]}
                  </option>
                ))}
              </select>
            </label>
            <span>
              峰值 {selectedCaseStudy.peakYear} · {selectedCaseStudy.peakCount} 条事件
            </span>
            <button
              type="button"
              onClick={() => {
                setCaseInsightsExpanded(true);
                onApplyCaseStudy(selectedCaseStudy);
              }}
            >
              应用窗口
            </button>
            <button type="button" onClick={() => onFocusCaseStudyParticipant(selectedCaseStudy)}>
              聚焦核心参战方
            </button>
            <button
              className="case-insights-toggle"
              type="button"
              aria-expanded={caseInsightsExpanded}
              aria-controls="case-insights-content"
              onClick={() => setCaseInsightsExpanded((expanded) => !expanded)}
            >
              <Lightbulb size={15} />
              {caseInsightsExpanded ? "收起洞察" : "查看洞察"}
              <ChevronDown size={15} />
            </button>
          </div>
          {caseInsightsExpanded ? (
            <div id="case-insights-content" className="case-insights-content">
              <div className="case-insights-heading">
                <div>
                  <strong>{selectedCaseStudy.label}：洞察与验证路径</strong>
                  <p>指标由当前 HCED 数据动态计算；空间描述作为待地图核验的分析假设。</p>
                </div>
                {selectedCaseStudy.comparison ? (
                  <span>
                    对比 {selectedCaseStudy.comparison.label}：
                    事件 {formatSignedValue(selectedCaseStudy.comparison.eventCountDifference)}
                    {selectedCaseStudy.comparison.eventCountPercentDifference === null
                      ? ""
                      : `（${formatSignedValue(
                          Number((selectedCaseStudy.comparison.eventCountPercentDifference * 100).toFixed(1)),
                          "%",
                        )}）`}
                    ，峰值 {formatSignedValue(selectedCaseStudy.comparison.peakCountDifference)}
                  </span>
                ) : null}
              </div>
              <div className="case-insight-metrics">
                <div>
                  <small>事件总量</small>
                  <strong>{selectedCaseStudy.totalEvents}</strong>
                  <span>{selectedCaseStudy.range[0]}–{selectedCaseStudy.range[1]}</span>
                </div>
                <div>
                  <small>时间峰值</small>
                  <strong>{selectedCaseStudy.peakYear}</strong>
                  <span>{selectedCaseStudy.peakCount} 条 · {formatPercentage(selectedCaseStudy.peakShare)}</span>
                </div>
                <div>
                  <small>最强共现</small>
                  <strong>
                    {selectedCaseStudy.topPairs[0]
                      ? `${formatParticipantName(selectedCaseStudy.topPairs[0].source)}–${formatParticipantName(
                          selectedCaseStudy.topPairs[0].target,
                        )}`
                      : "暂无"}
                  </strong>
                  <span>
                    {selectedCaseStudy.topPairs[0]?.count ?? 0} 条 · {formatPercentage(selectedCaseStudy.topPairShare)}
                  </span>
                </div>
                <div>
                  <small>主要事件类型</small>
                  <strong>{selectedCaseStudy.topTypes[0]?.[0] ?? "暂无"}</strong>
                  <span>
                    {selectedCaseStudy.topTypes[0]?.[1] ?? 0} 条 · {formatPercentage(selectedCaseStudy.topTypeShare)}
                  </span>
                </div>
              </div>
              <p className="case-analysis-prompt">
                <Lightbulb size={15} />
                分析提示：{selectedCaseStudy.narrative}
              </p>
              <ol className="case-verification-path">
                <li><BarChart3 size={15} /><span><strong>时间</strong>确认峰值及峰值前后的变化过程。</span></li>
                <li><MapPinned size={15} /><span><strong>地图</strong>核验事件热点是否形成多个空间簇。</span></li>
                <li><Network size={15} /><span><strong>关系</strong>验证核心共现边及其相对强度。</span></li>
                <li><SearchCheck size={15} /><span><strong>详情</strong>回溯具体事件，检查聚合模式的数据依据。</span></li>
              </ol>
              {selectedCaseStudy.topPairs[1] ? (
                <p className="case-secondary-finding">
                  次强共现：{formatParticipantName(selectedCaseStudy.topPairs[1].source)}–
                  {formatParticipantName(selectedCaseStudy.topPairs[1].target)}
                  （{selectedCaseStudy.topPairs[1].count} 条）
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {yearAdjustmentMessage ? <p className="timeline-adjustment-note">{yearAdjustmentMessage}</p> : null}
    </section>
  );
}
