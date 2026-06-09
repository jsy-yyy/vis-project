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
import { getTimelineSelectionState, getVisibleSelectedEvent } from "./lib/appState";
import { filterBattles, getBattleYearRange, summarizeBattles } from "./lib/battleAnalytics";
import type { YearRange } from "./types/domain";

export default function App() {
  const { battles, wars, participants, loading, error, retry } = useBattleData();
  const allYearRange = useMemo(() => getBattleYearRange(battles), [battles]);
  const [selectedWarId, setSelectedWarId] = useState<string | null>("all");
  const [selectedYearRange, setSelectedYearRange] = useState<YearRange>(allYearRange);
  const [currentYear, setCurrentYear] = useState(allYearRange[1]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);

  useEffect(() => {
    if (battles.length === 0) {
      return;
    }

    setSelectedYearRange(allYearRange);
    setCurrentYear(allYearRange[1]);
  }, [allYearRange, battles]);

  const filteredBattles = useMemo(
    () =>
      filterBattles(battles, {
        selectedWarId,
        selectedYearRange,
        selectedParticipant,
      }),
    [battles, selectedWarId, selectedYearRange, selectedParticipant],
  );

  const summary = useMemo(() => summarizeBattles(filteredBattles), [filteredBattles]);
  const mapBattles = useMemo(
    () => filteredBattles.filter((battle) => battle.year === currentYear),
    [currentYear, filteredBattles],
  );
  const selectedBattle = useMemo(
    () => getVisibleSelectedEvent(filteredBattles, mapBattles, selectedBattleId),
    [filteredBattles, mapBattles, selectedBattleId],
  );

  function updateYearRange(range: YearRange) {
    setSelectedYearRange(range);
    setCurrentYear((year) => Math.min(Math.max(year, range[0]), range[1]));
    setSelectedBattleId(null);
  }

  function updateCurrentYear(year: number) {
    setCurrentYear(year);
    setSelectedBattleId(null);
  }

  function updateSelectedBattleFromTimeline(battleId: string) {
    const nextState = getTimelineSelectionState(filteredBattles, battleId, currentYear);
    setSelectedBattleId(nextState.selectedEventId);
    setCurrentYear(nextState.currentYear);
  }

  if (loading) {
    return <div className="screen-message">Loading HCED conflict events...</div>;
  }

  if (error) {
    return (
      <div className="screen-message screen-message-stack">
        <span>Failed to load conflict event data: {error.message}</span>
        <button className="icon-text-button" type="button" onClick={retry}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <AppShell
      header={
        <AppHeader
          totalBattles={battles.length}
          filteredBattles={mapBattles.length}
          yearRange={[currentYear, currentYear]}
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
          onWarChange={(warId) => setSelectedWarId(warId)}
          onYearRangeChange={updateYearRange}
          onParticipantChange={(participantId) => setSelectedParticipant(participantId)}
        />
      }
      primary={
        <>
          <MapView
            battles={mapBattles}
            selectedBattleId={selectedBattleId}
            currentYear={currentYear}
            onSelectBattle={setSelectedBattleId}
          />
          <TimelineView
            battles={filteredBattles}
            selectedBattleId={selectedBattleId}
            allYearRange={allYearRange}
            selectedYearRange={selectedYearRange}
            currentYear={currentYear}
            onSelectBattle={updateSelectedBattleFromTimeline}
            onCurrentYearChange={updateCurrentYear}
          />
          <NetworkView
            battles={filteredBattles}
            participants={participants}
            selectedParticipant={selectedParticipant}
            onSelectParticipant={setSelectedParticipant}
          />
        </>
      }
      sidebar={
        <>
          <StatisticsPanel summary={summary} wars={wars} participants={participants} />
          <DetailPanel battle={selectedBattle} wars={wars} participants={participants} />
          <CaseStudyPanel onSelectWar={setSelectedWarId} onYearRangeChange={updateYearRange} />
        </>
      }
    />
  );
}
