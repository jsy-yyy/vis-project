import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { BarChart3, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from "lucide-react";
import { getAdjacentPlayableYear, getPlayableYears } from "../../lib/battleInteraction";
import { getYearlyEventCounts } from "../../lib/timelineAnalytics";
import { normalizeYearRange, updateYearRangeBoundary } from "../../lib/timelineRange";
import type { Battle, Participant, YearRange } from "../../types/domain";

type TimelineOverviewProps = {
  baselineBattles: Battle[];
  filteredBattles: Battle[];
  participants: Participant[];
  selectedParticipant: string | null;
  selectedBattle: Battle | null;
  selectedBattleLocked: boolean;
  selectedBattleOutOfScope: boolean;
  allYearRange: YearRange;
  selectedYearRange: YearRange;
  currentYear: number;
  yearAdjustmentMessage: string | null;
  onYearRangeChange: (range: YearRange) => void;
  onCurrentYearChange: (year: number) => void;
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
  selectedYearRange,
  currentYear,
  yearAdjustmentMessage,
  onYearRangeChange,
  onCurrentYearChange,
  onClearParticipant,
  onClearBattle,
  onReset,
  onStatusChange,
}: TimelineOverviewProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const brushAnchorRef = useRef<number | null>(null);
  const brushMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackDelay, setPlaybackDelay] = useState(1400);
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
  const selectedParticipantName = selectedParticipant
    ? participants.find((participant) => participant.id === selectedParticipant)?.name ?? selectedParticipant
    : null;

  useEffect(() => {
    setIsPlaying(false);
  }, [filteredBattles, selectedYearRange]);

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
    const year = getYearFromPointer(event);
    brushAnchorRef.current = year;
    brushMovedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleBrushMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (brushAnchorRef.current === null || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    brushMovedRef.current = true;
    onYearRangeChange(normalizeYearRange(brushAnchorRef.current, getYearFromPointer(event), allYearRange));
  }

  function handleBrushEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!brushMovedRef.current) {
      onCurrentYearChange(getYearFromPointer(event));
    }
    suppressClickRef.current = true;
    brushAnchorRef.current = null;
    brushMovedRef.current = false;
  }

  function handleYearKeyDown(event: KeyboardEvent<HTMLButtonElement>, year: number) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onCurrentYearChange(Math.max(selectedYearRange[0], year - 1));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onCurrentYearChange(Math.min(selectedYearRange[1], year + 1));
    }
  }

  return (
    <section id="timeline-overview" className="view-panel timeline-overview-panel">
      <div className="timeline-overview-heading">
        <div className="section-heading">
          <BarChart3 size={18} />
          <div>
            <h2>时间概览与地图窗口</h2>
            <p>拖动年度分布选择分析窗口；单击柱形切换地图年份。</p>
          </div>
        </div>
        <output className="timeline-current-output" aria-label="当前地图年份">{currentYear}</output>
      </div>

      <div className="timeline-state-strip" aria-label="当前联动状态">
        <span>
          年份窗口 <strong>{selectedYearRange[0]}–{selectedYearRange[1]}</strong>
          {selectedYearRange[0] !== allYearRange[0] || selectedYearRange[1] !== allYearRange[1] ? (
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
          const inRange = year >= selectedYearRange[0] && year <= selectedYearRange[1];
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
              aria-label={`${year} 年：全部 ${count} 条，当前参战方 ${filteredCount} 条`}
              aria-pressed={selected}
              onClick={(event) => {
                event.stopPropagation();
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
                onCurrentYearChange(year);
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

      <div className="timeline-overview-controls">
        <div className="timeline-range-inputs" aria-label="年份窗口输入">
          <label>
            起始年
            <input
              type="number"
              min={allYearRange[0]}
              max={allYearRange[1]}
              value={selectedYearRange[0]}
              onChange={(event) =>
                onYearRangeChange(
                  updateYearRangeBoundary(selectedYearRange, "start", Number(event.target.value), allYearRange),
                )}
            />
          </label>
          <label>
            结束年
            <input
              type="number"
              min={allYearRange[0]}
              max={allYearRange[1]}
              value={selectedYearRange[1]}
              onChange={(event) =>
                onYearRangeChange(
                  updateYearRangeBoundary(selectedYearRange, "end", Number(event.target.value), allYearRange),
                )}
            />
          </label>
        </div>
        <div className="timeline-playback-controls">
          <button
            className="icon-control-button"
            type="button"
            disabled={previousPlayableYear === null}
            onClick={() => previousPlayableYear !== null && onCurrentYearChange(previousPlayableYear)}
            title="上一个有事件的年份"
          >
            <SkipBack size={16} />
          </button>
          <button
            className={isPlaying ? "icon-control-button active" : "icon-control-button"}
            type="button"
            disabled={playableYears.length < 2}
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
            disabled={nextPlayableYear === null}
            onClick={() => nextPlayableYear !== null && onCurrentYearChange(nextPlayableYear)}
            title="下一个有事件的年份"
          >
            <SkipForward size={16} />
          </button>
          <label className="timeline-speed-control">
            <span>速度</span>
            <select value={playbackDelay} onChange={(event) => setPlaybackDelay(Number(event.target.value))}>
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
      {yearAdjustmentMessage ? <p className="timeline-adjustment-note">{yearAdjustmentMessage}</p> : null}
    </section>
  );
}
