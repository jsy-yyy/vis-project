import { useMemo, useState } from "react";
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
  getSelectedBattle,
  summarizeBattles,
} from "./lib/battleAnalytics";
import type { YearRange } from "./types/domain";

export default function App() {
  const { battles, wars, participants, loading, error } = useBattleData();
  const allYearRange = useMemo(() => getBattleYearRange(battles), [battles]);
  const [selectedWarId, setSelectedWarId] = useState<string | null>("all");
  const [selectedYearRange, setSelectedYearRange] = useState<YearRange>(allYearRange);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(battles[0]?.id ?? null);

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
  const selectedBattle = useMemo(
    () => getSelectedBattle(filteredBattles, selectedBattleId) ?? filteredBattles[0] ?? null,
    [filteredBattles, selectedBattleId],
  );

  if (loading) {
    return <div className="screen-message">Loading BattleMap data...</div>;
  }

  if (error) {
    return <div className="screen-message">Failed to load battle data: {error.message}</div>;
  }

  return (
    <AppShell
      header={
        <AppHeader
          totalBattles={battles.length}
          filteredBattles={filteredBattles.length}
          yearRange={summary.yearRange ?? selectedYearRange}
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
          onYearRangeChange={setSelectedYearRange}
          onParticipantChange={(participantId) => setSelectedParticipant(participantId)}
        />
      }
      primary={
        <>
          <MapView
            battles={filteredBattles}
            selectedBattleId={selectedBattle?.id ?? selectedBattleId}
            onSelectBattle={setSelectedBattleId}
          />
          <TimelineView
            battles={filteredBattles}
            selectedBattleId={selectedBattle?.id ?? selectedBattleId}
            selectedYearRange={selectedYearRange}
            onSelectBattle={setSelectedBattleId}
            onYearRangeChange={setSelectedYearRange}
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
          <CaseStudyPanel onSelectWar={setSelectedWarId} onYearRangeChange={setSelectedYearRange} />
        </>
      }
    />
  );
}
