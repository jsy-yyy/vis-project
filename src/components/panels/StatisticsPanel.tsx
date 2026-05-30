import { Activity } from "lucide-react";
import type { BattleSummary, Participant, War } from "../../types/domain";

type StatisticsPanelProps = {
  summary: BattleSummary;
  wars: War[];
  participants: Participant[];
};

function lookupName(id: string, rows: Array<{ id: string; name: string }>) {
  return rows.find((row) => row.id === id)?.name ?? id;
}

export function StatisticsPanel({ summary, wars, participants }: StatisticsPanelProps) {
  const maxTypeCount = Math.max(1, ...Object.values(summary.battlesByType));

  return (
    <section className="side-panel">
      <div className="section-heading">
        <Activity size={18} />
        <h2>Statistics</h2>
      </div>
      <div className="stat-grid">
        <div>
          <strong>{summary.totalBattles}</strong>
          <span>Battles</span>
        </div>
        <div>
          <strong>{summary.yearRange ? `${summary.yearRange[0]}-${summary.yearRange[1]}` : "None"}</strong>
          <span>Visible range</span>
        </div>
      </div>
      <div className="mini-section">
        <h3>Top participants</h3>
        {summary.topParticipants.slice(0, 5).map(([participantId, count]) => (
          <div className="rank-row" key={participantId}>
            <span>{lookupName(participantId, participants)}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <div className="mini-section">
        <h3>Battle types</h3>
        {Object.entries(summary.battlesByType).map(([type, count]) => (
          <div className="bar-row" key={type}>
            <span>{type}</span>
            <div className="bar-shell">
              <div className="bar-fill" style={{ width: `${(count / maxTypeCount) * 100}%` }} />
            </div>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <div className="mini-section">
        <h3>Wars represented</h3>
        {Object.entries(summary.battlesByWar).map(([warId, count]) => (
          <div className="rank-row" key={warId}>
            <span>{lookupName(warId, wars)}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
