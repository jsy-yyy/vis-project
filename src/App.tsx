import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/layout/AppHeader";
import { AppShell } from "./components/layout/AppShell";
import { DetailVisualPanel } from "./components/panels/DetailVisualPanel";
import { StatisticsPanel } from "./components/panels/StatisticsPanel";
import { MapView } from "./components/views/MapView";
import { NetworkView } from "./components/views/NetworkView";
import { TimelineDetails } from "./components/views/TimelineDetails";
import { TimelineOverview } from "./components/views/TimelineOverview";
import { useBattleData } from "./hooks/useBattleData";
import {
  buildSharedAppSearch,
  clampYearRange,
  getSelectedEvent,
  getSelectionScopeStatus,
  parseSharedAppState,
} from "./lib/appState";
import { getFocusedBattleState } from "./lib/battleInteraction";
import {
  filterBattles,
  getBattleYearRange,
  getClosestBattleYear,
  summarizeBattles,
} from "./lib/battleAnalytics";
import { buildCaseStudyAnalysis, caseStudyDefinitions } from "./lib/caseStudyAnalytics";
import type { AnalysisMode, YearRange } from "./types/domain";

export default function App() {
  const { battles, wars, participants, loading, error, retry } = useBattleData();
  const allYearRange = useMemo(() => getBattleYearRange(battles), [battles]);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("single");
  const [selectedYearRange, setSelectedYearRange] = useState<YearRange>(allYearRange);
  const [currentYear, setCurrentYear] = useState(allYearRange[1]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [selectedBattleLocked, setSelectedBattleLocked] = useState(false);
  const [detailStatusMessage, setDetailStatusMessage] = useState<string | null>(null);
  const [yearAdjustmentMessage, setYearAdjustmentMessage] = useState<string | null>(null);
  const [liveStatusMessage, setLiveStatusMessage] = useState("BattleMap 已准备好。");
  const [stateRestoredFromUrl, setStateRestoredFromUrl] = useState(false);

  useEffect(() => {
    if (battles.length === 0 || stateRestoredFromUrl) {
      return;
    }

    const sharedState = parseSharedAppState(window.location.search);
    const nextYearRange = clampYearRange(sharedState.selectedYearRange, allYearRange);
    const nextParticipant = sharedState.selectedParticipant &&
      participants.some((participant) => participant.id === sharedState.selectedParticipant)
      ? sharedState.selectedParticipant
      : null;
    const nextEffectiveRange: YearRange =
      sharedState.analysisMode === "range" ? nextYearRange : allYearRange;
    const filteredEvents = filterBattles(battles, {
      selectedYearRange: nextEffectiveRange,
      selectedParticipant: nextParticipant,
    });
    const clampedYear = sharedState.currentYear
      ? Math.min(Math.max(sharedState.currentYear, nextEffectiveRange[0]), nextEffectiveRange[1])
      : nextEffectiveRange[1];
    const nextYear = getClosestBattleYear(filteredEvents, clampedYear);
    const selectedEventExists = Boolean(
      sharedState.selectedBattleId && battles.some((battle) => battle.id === sharedState.selectedBattleId),
    );

    setAnalysisMode(sharedState.analysisMode);
    setSelectedYearRange(nextYearRange);
    setSelectedParticipant(nextParticipant);
    setCurrentYear(nextYear);
    setSelectedBattleId(selectedEventExists ? sharedState.selectedBattleId : null);
    setSelectedBattleLocked(selectedEventExists ? sharedState.selectedBattleLocked : false);
    setStateRestoredFromUrl(true);
  }, [allYearRange, battles, participants, stateRestoredFromUrl]);

  const effectiveYearRange = useMemo<YearRange>(
    () => (analysisMode === "range" ? selectedYearRange : [currentYear, currentYear]),
    [analysisMode, currentYear, selectedYearRange],
  );
  const scopeBattles = useMemo(
    () =>
      filterBattles(battles, {
        selectedYearRange: effectiveYearRange,
        selectedParticipant: null,
      }),
    [battles, effectiveYearRange],
  );
  const resultBattles = useMemo(
    () =>
      filterBattles(battles, {
        selectedYearRange: effectiveYearRange,
        selectedParticipant,
      }),
    [battles, effectiveYearRange, selectedParticipant],
  );
  const timelineOverviewBattles = useMemo(
    () =>
      filterBattles(battles, {
        selectedYearRange: analysisMode === "range" ? selectedYearRange : allYearRange,
        selectedParticipant,
      }),
    [allYearRange, analysisMode, battles, selectedParticipant, selectedYearRange],
  );

  const summary = useMemo(() => summarizeBattles(resultBattles), [resultBattles]);
  const mapBattles = resultBattles;
  const selectedBattle = useMemo(
    () => getSelectedEvent(battles, resultBattles, mapBattles, selectedBattleId, selectedBattleLocked),
    [battles, resultBattles, mapBattles, selectedBattleId, selectedBattleLocked],
  );
  const selectedBattleScopeStatus = useMemo(
    () => getSelectionScopeStatus(resultBattles, mapBattles, selectedBattleId),
    [resultBattles, mapBattles, selectedBattleId],
  );
  const highlightedParticipantIds = selectedBattle?.participants ?? [];
  const caseStudies = useMemo(
    () => caseStudyDefinitions.map((definition) => buildCaseStudyAnalysis(battles, definition)),
    [battles],
  );

  useEffect(() => {
    if (!stateRestoredFromUrl || battles.length === 0) {
      return;
    }

    const nextSearch = buildSharedAppSearch({
      analysisMode,
      allYearRange,
      currentYear,
      selectedYearRange,
      selectedParticipant,
      selectedBattleId,
      selectedBattleLocked,
    });
    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;

    if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [
    allYearRange,
    analysisMode,
    battles.length,
    currentYear,
    selectedBattleId,
    selectedBattleLocked,
    selectedParticipant,
    selectedYearRange,
    stateRestoredFromUrl,
  ]);

  function syncSelectedBattleAfterScopeChange(nextBattles: typeof battles, message: string) {
    if (!selectedBattleId) {
      setDetailStatusMessage(null);
      return;
    }

    const stillVisible = nextBattles.some((battle) => battle.id === selectedBattleId);
    if (stillVisible) {
      setDetailStatusMessage(null);
      return;
    }

    if (selectedBattleLocked) {
      setDetailStatusMessage("锁定事件当前不在筛选范围或地图年份内，详情已保留。");
      return;
    }

    setDetailStatusMessage(message);
    setLiveStatusMessage(message);
    setSelectedBattleId(null);
    setSelectedBattleLocked(false);
  }

  const focusBattle = useCallback(
    (battleId: string, options: { scrollTo?: "map" | "details" | "none"; announce?: boolean } = {}) => {
      const nextState = getFocusedBattleState(battles, battleId, selectedBattleLocked);
      if (!nextState) {
        setLiveStatusMessage("未找到该事件，选择保持不变。");
        return;
      }

      setCurrentYear(nextState.currentYear);
      if (analysisMode === "range") {
        setSelectedYearRange((range) => [
          Math.min(range[0], nextState.currentYear),
          Math.max(range[1], nextState.currentYear),
        ]);
      }
      setSelectedBattleId(nextState.selectedBattleId);
      setSelectedBattleLocked(nextState.selectedBattleLocked);
      setDetailStatusMessage(null);
      setYearAdjustmentMessage(null);

      if (options.announce !== false) {
        setLiveStatusMessage(`已定位事件：${nextState.battle.name}，${nextState.battle.year} 年。`);
      }

      if (options.scrollTo && options.scrollTo !== "none") {
        window.location.hash = options.scrollTo === "details" ? "analysis-view" : "map-view";
      }
    },
    [analysisMode, battles, selectedBattleLocked],
  );

  function updateYearRange(range: YearRange) {
    const nextBattles = filterBattles(battles, {
      selectedYearRange: range,
      selectedParticipant,
    });

    const clampedYear = Math.min(Math.max(currentYear, range[0]), range[1]);
    const nextYear = getClosestBattleYear(nextBattles, clampedYear);

    setSelectedYearRange(range);
    setCurrentYear(nextYear);
    setYearAdjustmentMessage(
      nextYear !== currentYear ? `地图年份已根据当前年份窗口调整为 ${nextYear}。` : null,
    );
    setLiveStatusMessage(`年份窗口已更新为 ${range[0]}-${range[1]}，地图年份 ${nextYear}。`);
    syncSelectedBattleAfterScopeChange(
      nextBattles,
      "年份范围变化后，原选中事件已不在当前地图范围内，详情已清空。",
    );
  }

  function updateCurrentYear(year: number) {
    const nextRange: YearRange = [year, year];
    setCurrentYear(year);
    if (analysisMode === "range") {
      setSelectedYearRange(nextRange);
    }
    setYearAdjustmentMessage(null);
    setLiveStatusMessage(`地图年份已切换为 ${year}。`);
    syncSelectedBattleAfterScopeChange(
      filterBattles(battles, {
        selectedYearRange: nextRange,
        selectedParticipant,
      }),
      "地图年份切换后，原选中事件已不在当前地图年份中，详情已清空。",
    );
  }

  function updateAnalysisMode(mode: AnalysisMode) {
    if (mode === analysisMode) {
      return;
    }

    if (mode === "range") {
      setSelectedYearRange([currentYear, currentYear]);
      setAnalysisMode("range");
      setLiveStatusMessage(`已切换为多年度分析，当前范围 ${currentYear}-${currentYear}。`);
      return;
    }

    const nextYear = selectedYearRange[1];
    setAnalysisMode("single");
    setCurrentYear(nextYear);
    setLiveStatusMessage(`已切换为单年度分析，地图年份 ${nextYear}。`);
  }

  function updateSelectedBattle(battleId: string | null) {
    if (battleId) {
      focusBattle(battleId);
      return;
    }

    setSelectedBattleId(null);
    if (!battleId) {
      setSelectedBattleLocked(false);
    }
    setDetailStatusMessage(null);
    setLiveStatusMessage("已清除事件选择。");
  }

  function toggleSelectedBattleLock() {
    if (!selectedBattleId) {
      return;
    }

    setSelectedBattleLocked((locked) => {
      setLiveStatusMessage(locked ? "已解除事件锁定。" : "已锁定当前事件。");
      return !locked;
    });
    setDetailStatusMessage(null);
  }

  function jumpToSelectedBattle() {
    if (!selectedBattle) {
      return;
    }

    if (analysisMode === "range") {
      setSelectedYearRange([
        Math.min(selectedYearRange[0], selectedBattle.year),
        Math.max(selectedYearRange[1], selectedBattle.year),
      ]);
    }
    setCurrentYear(selectedBattle.year);
    setDetailStatusMessage(null);
    setLiveStatusMessage(`已跳转到锁定事件年份 ${selectedBattle.year}。`);
    window.location.hash = "map-view";
  }

  function resetFilters() {
    setAnalysisMode("single");
    setSelectedYearRange(allYearRange);
    setSelectedParticipant(null);
    setCurrentYear(allYearRange[1]);
    setYearAdjustmentMessage(null);
    setDetailStatusMessage(null);
    setSelectedBattleId(null);
    setSelectedBattleLocked(false);
    setLiveStatusMessage("筛选已重置。");
  }

  function applyCaseStudy(range: YearRange, label: string, preferredYear?: number) {
    const nextBattles = filterBattles(battles, {
      selectedYearRange: range,
      selectedParticipant: null,
    });

    setAnalysisMode("range");
    setSelectedYearRange(range);
    setSelectedParticipant(null);
    setCurrentYear(getClosestBattleYear(nextBattles, preferredYear ?? range[1]));
    setYearAdjustmentMessage(null);
    setDetailStatusMessage(null);
    setSelectedBattleId(null);
    setSelectedBattleLocked(false);
    setLiveStatusMessage(`已应用案例窗口：${label}。`);
  }

  function focusCaseStudyParticipant(participantId: string, range: YearRange, peakYear: number, label: string) {
    const nextBattles = filterBattles(battles, {
      selectedYearRange: range,
      selectedParticipant: participantId,
    });

    setAnalysisMode("range");
    setSelectedYearRange(range);
    setSelectedParticipant(participantId);
    setCurrentYear(getClosestBattleYear(nextBattles, peakYear));
    setYearAdjustmentMessage(null);
    setDetailStatusMessage(null);
    setSelectedBattleId(null);
    setSelectedBattleLocked(false);
    setLiveStatusMessage(`已聚焦案例 ${label} 的核心参战方。`);
    window.location.hash = "network-view";
  }

  function updateParticipantFilter(participantId: string | null) {
    const nextBattles = filterBattles(battles, {
      selectedYearRange: effectiveYearRange,
      selectedParticipant: participantId,
    });

    const nextYear = getClosestBattleYear(nextBattles, currentYear);

    setSelectedParticipant(participantId);
    setCurrentYear(nextYear);
    setYearAdjustmentMessage(
      nextYear !== currentYear ? `地图年份已根据当前参战方 participant 调整为 ${nextYear}。` : null,
    );
    syncSelectedBattleAfterScopeChange(
      nextBattles,
      "参战方筛选变化后，原选中事件已不在当前结果中，详情已清空。",
    );
    setLiveStatusMessage(
      participantId
        ? `参战方筛选已应用：${participants.find((participant) => participant.id === participantId)?.name ?? participantId}。`
        : "已清除参战方筛选。",
    );
  }

  function copyAnalysisLink() {
    const link = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(
        () => setLiveStatusMessage("当前分析链接已复制。"),
        () => {
          fallbackCopy();
          setLiveStatusMessage("当前分析链接已复制。");
        },
      );
      return;
    }

    fallbackCopy();
    setLiveStatusMessage("当前分析链接已复制。");
  }

  if (loading) {
    return <div className="screen-message">正在加载 HCED 冲突事件数据...</div>;
  }

  if (error) {
    return (
      <div className="screen-message screen-message-stack">
        <span>冲突事件数据加载失败：{error.message}</span>
        <button className="icon-text-button" type="button" onClick={retry}>
          重试
        </button>
      </div>
    );
  }

  return (
    <AppShell
      onCopyLink={copyAnalysisLink}
      header={
        <AppHeader
          totalBattles={battles.length}
          filteredBattles={resultBattles.length}
          visibleMapBattles={mapBattles.length}
          yearLabel={
            analysisMode === "range"
              ? `${selectedYearRange[0]}–${selectedYearRange[1]}`
              : String(currentYear)
          }
        />
      }
      primary={
        <>
          <TimelineOverview
            baselineBattles={battles}
            filteredBattles={timelineOverviewBattles}
            participants={participants}
            selectedParticipant={selectedParticipant}
            selectedBattle={selectedBattle}
            selectedBattleLocked={selectedBattleLocked}
            selectedBattleOutOfScope={Boolean(
              selectedBattleId && selectedBattleLocked && !selectedBattleScopeStatus.inFilteredScope,
            )}
            allYearRange={allYearRange}
            analysisMode={analysisMode}
            selectedYearRange={selectedYearRange}
            currentYear={currentYear}
            yearAdjustmentMessage={yearAdjustmentMessage}
            caseStudies={caseStudies}
            onAnalysisModeChange={updateAnalysisMode}
            onYearRangeChange={updateYearRange}
            onCurrentYearChange={updateCurrentYear}
            onApplyCaseStudy={(analysis) =>
              applyCaseStudy(analysis.range, analysis.label, analysis.peakYear)}
            onFocusCaseStudyParticipant={(analysis) =>
              focusCaseStudyParticipant(
                analysis.primaryParticipantId,
                analysis.range,
                analysis.peakYear,
                analysis.label,
              )}
            onClearParticipant={() => updateParticipantFilter(null)}
            onClearBattle={() => updateSelectedBattle(null)}
            onReset={resetFilters}
            onStatusChange={setLiveStatusMessage}
          />
          <MapView
            battles={mapBattles}
            selectedBattleId={selectedBattleScopeStatus.inMapYear ? selectedBattleId : null}
            currentYear={currentYear}
            analysisMode={analysisMode}
            activeYearRange={effectiveYearRange}
            participants={participants}
            onSelectBattle={(battleId) => {
              if (battleId) {
                focusBattle(battleId, { scrollTo: "none" });
              } else {
                updateSelectedBattle(null);
              }
            }}
            onResetFilters={resetFilters}
          />
          <TimelineDetails
            baselineBattles={timelineOverviewBattles}
            filteredBattles={resultBattles}
            selectedBattleId={selectedBattleId}
            selectedBattleYear={selectedBattle?.year ?? null}
            selectedBattleLocked={selectedBattleLocked}
            allYearRange={allYearRange}
            selectedYearRange={selectedYearRange}
            analysisMode={analysisMode}
            currentYear={currentYear}
            onSelectBattle={(battleId) => {
              if (battleId) {
                focusBattle(battleId, { scrollTo: "map" });
              } else {
                updateSelectedBattle(null);
              }
            }}
            onResetFilters={resetFilters}
          />
          <NetworkView
            battles={scopeBattles}
            wars={wars}
            participants={participants}
            selectedParticipant={selectedParticipant}
            highlightedParticipantIds={highlightedParticipantIds}
            onSelectParticipant={updateParticipantFilter}
            onSelectBattle={(battleId) => focusBattle(battleId, { scrollTo: "map" })}
            onResetFilters={resetFilters}
          />
        </>
      }
      sidebar={
        <>
          <StatisticsPanel
            summary={summary}
            participants={participants}
            selectedParticipant={selectedParticipant}
            onParticipantSelect={updateParticipantFilter}
          />
          <DetailVisualPanel
            battle={selectedBattle}
            participants={participants}
            emptyMessage={detailStatusMessage}
            locked={selectedBattleLocked}
            outOfScope={Boolean(
              selectedBattleId && selectedBattleLocked && !selectedBattleScopeStatus.inFilteredScope,
            )}
            outOfMapYear={Boolean(
              selectedBattleId && selectedBattleLocked && selectedBattleScopeStatus.inFilteredScope && !selectedBattleScopeStatus.inMapYear,
            )}
            onToggleLock={toggleSelectedBattleLock}
            onClearSelection={() => updateSelectedBattle(null)}
            onJumpToEvent={jumpToSelectedBattle}
          />
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {liveStatusMessage}
          </div>
        </>
      }
    />
  );
}
