import { Activity } from "lucide-react";
import { getLimitedEntries } from "../../lib/appState";
import type { BattleSummary, Participant } from "../../types/domain";

type StatisticsPanelProps = {
  summary: BattleSummary;
  participants: Participant[];
  selectedParticipant: string | null;
  onParticipantSelect: (participantId: string | null) => void;
};

function lookupName(id: string, rows: Array<{ id: string; name: string }>) {
  return rows.find((row) => row.id === id)?.name ?? id;
}

export function StatisticsPanel({
  summary,
  participants,
  selectedParticipant,
  onParticipantSelect,
}: StatisticsPanelProps) {
  const maxTypeCount = Math.max(1, ...Object.values(summary.battlesByType));
  const topParticipants = getLimitedEntries(summary.topParticipants, 5);
  const rankedEventTypes = getLimitedEntries(
    Object.entries(summary.battlesByType).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    8,
  );
  return (
    <section className="side-panel">
      <div className="section-heading">
        <Activity size={18} />
        <h2>统计概览</h2>
      </div>
      <div className="stat-grid">
        <div>
          <strong>{summary.totalBattles}</strong>
          <span>冲突事件</span>
        </div>
        <div>
          <strong>{summary.yearRange ? `${summary.yearRange[0]}-${summary.yearRange[1]}` : "无"}</strong>
          <span>当前年份范围</span>
        </div>
      </div>
      <div className="mini-section">
        <h3>活跃参战方 participant</h3>
        {topParticipants.visibleEntries.length === 0 ? (
          <div className="compact-empty">当前筛选下暂无参战方。</div>
        ) : null}
        {topParticipants.visibleEntries.map(([participantId, count]) => (
          <button
            className={participantId === selectedParticipant ? "rank-row interactive active" : "rank-row interactive"}
            key={participantId}
            type="button"
            aria-pressed={participantId === selectedParticipant}
            onClick={() => onParticipantSelect(participantId === selectedParticipant ? null : participantId)}
          >
            <span>{lookupName(participantId, participants)}</span>
            <strong>{count}</strong>
          </button>
        ))}
        {topParticipants.hiddenCount > 0 ? (
          <div className="muted-note">还有 {topParticipants.hiddenCount} 个参战方</div>
        ) : null}
      </div>
      <div className="mini-section">
        <h3>事件类型</h3>
        {rankedEventTypes.visibleEntries.length === 0 ? (
          <div className="compact-empty">当前筛选下暂无事件类型。</div>
        ) : null}
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
          <div className="muted-note">还有 {rankedEventTypes.hiddenCount} 种事件类型</div>
        ) : null}
      </div>
    </section>
  );
}
