import { useEffect, useMemo, useState } from "react";
import { FilterPanel } from "./components/filters/FilterPanel";
import { AppHeader } from "./components/layout/AppHeader";
import { AppShell } from "./components/layout/AppShell";
import { CaseStudyPanel } from "./components/panels/CaseStudyPanel";
import { DetailPanel } from "./components/panels/DetailPanel";
import { StatisticsPanel } from "./components/panels/StatisticsPanel";
import { MapView } from "./components/views/MapView";
import { NetworkView } from "./components/views/NetworkView";
import { TimelineView } from "./components/views/TimelineView";
import { useBattleData } from "./hooks/useBattleData";
import {
  filterBattles,
  getBattleYearRange,
  getClosestBattleYear,
  getSelectedBattle,
  summarizeBattles,
} from "./lib/battleAnalytics";
import type { YearRange } from "./types/domain";

export default function App() {
  const { battles, wars, participants, loading, error } = useBattleData();
  const allYearRange = useMemo(() => getBattleYearRange(battles), [battles]);
  const [selectedWarId, setSelectedWarId] = useState<string | null>("all");
  const [selectedYearRange, setSelectedYearRange] = useState<YearRange>(allYearRange);
  const [currentYear, setCurrentYear] = useState(allYearRange[1]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [detailStatusMessage, setDetailStatusMessage] = useState<string | null>(null);
  const [yearAdjustmentMessage, setYearAdjustmentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (battles.length === 0) {
      return;
    }

    setSelectedYearRange(allYearRange);
    setCurrentYear(allYearRange[1]);
  }, [allYearRange, battles]);

  const timeWindowBattles = useMemo(
    () =>
      filterBattles(battles, {
        selectedWarId: "all",
        selectedYearRange,
        selectedParticipant: null,
      }),
    [battles, selectedYearRange],
  );
  const scopeBattles = useMemo(
    () =>
      filterBattles(battles, {
        selectedWarId,
        selectedYearRange,
        selectedParticipant: null,
      }),
    [battles, selectedWarId, selectedYearRange],
  );
  const resultBattles = useMemo(
    () =>
      filterBattles(battles, {
        selectedWarId,
        selectedYearRange,
        selectedParticipant,
      }),
    [battles, selectedWarId, selectedYearRange, selectedParticipant],
  );

  const summary = useMemo(() => summarizeBattles(resultBattles), [resultBattles]);
  const mapBattles = useMemo(
    () => resultBattles.filter((battle) => battle.year === currentYear),
    [currentYear, resultBattles],
  );
  const selectedBattle = useMemo(
    () => getSelectedBattle(mapBattles, selectedBattleId),
    [mapBattles, selectedBattleId],
  );

  function syncSelectedBattleAfterScopeChange(nextBattles: typeof battles, nextYear: number, message: string) {
    if (!selectedBattleId) {
      setDetailStatusMessage(null);
      return;
    }

    const stillVisible = nextBattles.some((battle) => battle.id === selectedBattleId && battle.year === nextYear);
    if (stillVisible) {
      setDetailStatusMessage(null);
      return;
    }

    setDetailStatusMessage(message);
    setSelectedBattleId(null);
  }

  function updateYearRange(range: YearRange) {
    const nextBattles = filterBattles(battles, {
      selectedWarId,
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
    syncSelectedBattleAfterScopeChange(
      nextBattles,
      nextYear,
      "年份范围变化后，原选中事件已不在当前地图范围内，详情已清空。",
    );
  }

  function updateCurrentYear(year: number) {
    setCurrentYear(year);
    setYearAdjustmentMessage(null);
    syncSelectedBattleAfterScopeChange(
      resultBattles,
      year,
      "地图年份切换后，原选中事件已不在当前地图年份中，详情已清空。",
    );
  }

  function updateSelectedBattle(battleId: string | null) {
    setSelectedBattleId(battleId);
    setDetailStatusMessage(null);
  }

  function resetFilters() {
    setSelectedWarId("all");
    setSelectedYearRange(allYearRange);
    setSelectedParticipant(null);
    setCurrentYear(allYearRange[1]);
    setYearAdjustmentMessage(null);
    setDetailStatusMessage(null);
    setSelectedBattleId(null);
  }

  function applyCaseStudy(warId: string, range: YearRange) {
    const nextBattles = filterBattles(battles, {
      selectedWarId: warId,
      selectedYearRange: range,
      selectedParticipant: null,
    });

    setSelectedWarId(warId);
    setSelectedYearRange(range);
    setSelectedParticipant(null);
    setCurrentYear(getClosestBattleYear(nextBattles, range[1]));
    setYearAdjustmentMessage(null);
    setDetailStatusMessage(null);
    setSelectedBattleId(null);
  }

  function updateWarFilter(warId: string | null) {
    const nextBattles = filterBattles(battles, {
      selectedWarId: warId,
      selectedYearRange,
      selectedParticipant,
    });

    const nextYear = getClosestBattleYear(nextBattles, currentYear);

    setSelectedWarId(warId);
    setCurrentYear(nextYear);
    setYearAdjustmentMessage(
      nextYear !== currentYear ? `地图年份已根据当前冲突组 conflict group 调整为 ${nextYear}。` : null,
    );
    syncSelectedBattleAfterScopeChange(
      nextBattles,
      nextYear,
      "冲突组筛选变化后，原选中事件已不在当前结果中，详情已清空。",
    );
  }

  function updateParticipantFilter(participantId: string | null) {
    const nextBattles = filterBattles(battles, {
      selectedWarId,
      selectedYearRange,
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
      nextYear,
      "参战方筛选变化后，原选中事件已不在当前结果中，详情已清空。",
    );
  }

  if (loading) {
    return <div className="screen-message">正在加载 HCED 冲突事件数据...</div>;
  }

  if (error) {
    return <div className="screen-message">冲突事件数据加载失败：{error.message}</div>;
  }

  return (
    <AppShell
      header={
        <AppHeader
          totalBattles={battles.length}
          filteredBattles={resultBattles.length}
          visibleMapBattles={mapBattles.length}
          currentYear={currentYear}
        />
      }
      filters={
        <FilterPanel
          wars={wars}
          participants={participants}
          allYearRange={allYearRange}
          selectedWarId={selectedWarId}
          selectedYearRange={selectedYearRange}
          selectedParticipant={selectedParticipant}
          onWarChange={updateWarFilter}
          onYearRangeChange={updateYearRange}
          onParticipantChange={updateParticipantFilter}
          onReset={resetFilters}
        />
      }
      primary={
        <>
          <MapView
            battles={mapBattles}
            heatmapBattles={resultBattles}
            selectedBattleId={selectedBattleId}
            currentYear={currentYear}
            selectedWarId={selectedWarId}
            onSelectBattle={updateSelectedBattle}
            onResetFilters={resetFilters}
          />
          <TimelineView
            baselineBattles={timeWindowBattles}
            filteredBattles={resultBattles}
            wars={wars}
            participants={participants}
            selectedBattleId={selectedBattleId}
            allYearRange={allYearRange}
            selectedYearRange={selectedYearRange}
            currentYear={currentYear}
            yearAdjustmentMessage={yearAdjustmentMessage}
            onSelectBattle={updateSelectedBattle}
            onCurrentYearChange={updateCurrentYear}
            onResetFilters={resetFilters}
          />
          <NetworkView
            battles={scopeBattles}
            wars={wars}
            participants={participants}
            selectedParticipant={selectedParticipant}
            onSelectParticipant={updateParticipantFilter}
            onResetFilters={resetFilters}
          />
        </>
      }
      sidebar={
        <>
          <StatisticsPanel summary={summary} wars={wars} participants={participants} />
          <DetailPanel
            battle={selectedBattle}
            wars={wars}
            participants={participants}
            emptyMessage={detailStatusMessage}
          />
          <CaseStudyPanel onApplyCaseStudy={applyCaseStudy} />
        </>
      }
    />
  );
}
