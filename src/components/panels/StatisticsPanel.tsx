import { Activity } from "lucide-react";
import { getLimitedEntries } from "../../lib/appState";
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
  const topParticipants = getLimitedEntries(summary.topParticipants, 5);
  const rankedEventTypes = getLimitedEntries(
    Object.entries(summary.battlesByType).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    8,
  );
  const rankedConflictGroups = getLimitedEntries(
    Object.entries(summary.battlesByWar).sort((a, b) => b[1] - a[1] || lookupName(a[0], wars).localeCompare(lookupName(b[0], wars))),
    8,
  );

  return (
    <section className="side-panel">
      <div className="section-heading">
        <Activity size={18} />
        <h2>Statistics</h2>
      </div>
      <div className="stat-grid">
        <div>
          <strong>{summary.totalBattles}</strong>
          <span>Conflict events</span>
        </div>
        <div>
          <strong>{summary.yearRange ? `${summary.yearRange[0]}-${summary.yearRange[1]}` : "None"}</strong>
          <span>Visible range</span>
        </div>
      </div>
      <div className="mini-section">
        <h3>Top participants</h3>
        {topParticipants.visibleEntries.length === 0 ? (
          <div className="compact-empty">No participants in view.</div>
        ) : null}
        {topParticipants.visibleEntries.map(([participantId, count]) => (
          <div className="rank-row" key={participantId}>
            <span>{lookupName(participantId, participants)}</span>
            <strong>{count}</strong>
          </div>
        ))}
        {topParticipants.hiddenCount > 0 ? (
          <div className="muted-note">+{topParticipants.hiddenCount} more participants</div>
        ) : null}
      </div>
      <div className="mini-section">
        <h3>Event types</h3>
        {rankedEventTypes.visibleEntries.length === 0 ? <div className="compact-empty">No event types in view.</div> : null}
        {rankedEventTypes.visibleEntries.map(([type, count]) => (
          <div className="bar-row" key={type}>
            <span>{type}</span>
            <div className="bar-shell">
              <div className="bar-fill" style={{ width: `${(count / maxTypeCount) * 100}%` }} />
            </div>
            <strong>{count}</strong>
          </div>
        ))}
        {rankedEventTypes.hiddenCount > 0 ? (
          <div className="muted-note">+{rankedEventTypes.hiddenCount} more event types</div>
        ) : null}
      </div>
      <div className="mini-section">
        <h3>Conflict groups</h3>
        {rankedConflictGroups.visibleEntries.length === 0 ? (
          <div className="compact-empty">No conflict groups in view.</div>
        ) : null}
        {rankedConflictGroups.visibleEntries.map(([warId, count]) => (
          <div className="rank-row" key={warId}>
            <span>{lookupName(warId, wars)}</span>
            <strong>{count}</strong>
          </div>
        ))}
        {rankedConflictGroups.hiddenCount > 0 ? (
          <div className="muted-note">+{rankedConflictGroups.hiddenCount} more conflict groups</div>
        ) : null}
      </div>
    </section>
  );
}
