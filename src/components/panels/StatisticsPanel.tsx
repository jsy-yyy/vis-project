import { Activity } from "lucide-react";
import { getLimitedEntries } from "../../lib/appState";
import { getCompactTypeBreakdown } from "../../lib/battleAnalytics";
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
  const topParticipants = getLimitedEntries(summary.topParticipants, 5);
  const maxParticipantCount = Math.max(
    1,
    ...topParticipants.visibleEntries.map(([, count]) => count),
  );
  const compactEventTypes = getCompactTypeBreakdown(summary.battlesByType);
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
        <h3>活跃参战方</h3>
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
            <span className="rank-row-label">{lookupName(participantId, participants)}</span>
            <span className="rank-row-bar" aria-hidden="true">
              <i style={{ width: `${(count / maxParticipantCount) * 100}%` }} />
            </span>
            <strong>{count}</strong>
          </button>
        ))}
        {topParticipants.hiddenCount > 0 ? (
          <div className="muted-note">还有 {topParticipants.hiddenCount} 个参战方</div>
        ) : null}
      </div>
      <div className="mini-section">
        <h3>事件类型构成</h3>
        {compactEventTypes.length === 0 ? (
          <div className="compact-empty">当前筛选下暂无事件类型。</div>
        ) : (
          <>
            <div className="type-share-bar" aria-label="事件类型百分比构成">
              {compactEventTypes.map((entry, index) => (
                <span
                  key={entry.type}
                  className={`segment-${index % 6}`}
                  style={{ width: `${entry.percentage}%` }}
                  title={`${entry.type}: ${entry.count} 条（${entry.percentage.toFixed(1)}%）`}
                />
              ))}
            </div>
            <div className="type-share-legend">
              {compactEventTypes.map((entry, index) => (
                <div key={entry.type}>
                  <i className={`segment-${index % 6}`} />
                  <span>{entry.type}</span>
                  <strong>{entry.count}</strong>
                  <small>{entry.percentage.toFixed(1)}%</small>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
