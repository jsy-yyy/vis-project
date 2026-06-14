import { Info } from "lucide-react";
import type { Battle, Participant, War } from "../../types/domain";

type DetailPanelProps = {
  battle: Battle | null;
  wars: War[];
  participants: Participant[];
  emptyMessage?: string | null;
};

function lookupName(id: string, rows: Array<{ id: string; name: string }>) {
  return rows.find((row) => row.id === id)?.name ?? id;
}

const actorRoleLabels: Record<string, string> = {
  participant: "参战方",
  winner: "胜方",
  loser: "败方",
  unknown: "未知角色",
};

const actorTypeLabels: Record<string, string> = {
  country: "国家",
  empire: "帝国",
  alliance: "联盟",
  faction: "派系",
  rebel_group: "叛军组织",
  civilian_group: "平民群体",
  unknown: "未知类型",
};

const actorConfidenceLabels: Record<string, string> = {
  high: "高置信度",
  medium: "中置信度",
  low: "低置信度",
};

const actorStatusLabels: Record<string, string> = {
  mapped: "已映射",
  mapped_internal: "内部冲突映射",
  ambiguous: "有歧义",
  unmapped: "未映射",
};

function shouldShowMapTarget(actor: NonNullable<Battle["actors"]>[number]) {
  return Boolean(actor.mapTarget && actor.mapTarget !== actor.name);
}

export function DetailPanel({ battle, wars, participants, emptyMessage }: DetailPanelProps) {
  return (
    <section className="side-panel detail-panel">
      <div className="section-heading">
        <Info size={18} />
        <h2>事件详情</h2>
      </div>
      {!battle ? (
        <div className="empty-state">{emptyMessage ?? "请选择一个冲突事件以查看字段详情。"}</div>
      ) : (
        <>
          <h3>{battle.name}</h3>
          <p>{battle.description}</p>
          <dl className="detail-list">
            <div>
              <dt>冲突组 conflict group</dt>
              <dd>{lookupName(battle.warId, wars)}</dd>
            </div>
            <div>
              <dt>时间</dt>
              <dd>
                {battle.startDate ?? battle.year}
                {battle.endDate ? ` 至 ${battle.endDate}` : ""}
              </dd>
            </div>
            <div>
              <dt>地点</dt>
              <dd>{battle.locationName ?? `${battle.latitude}, ${battle.longitude}`}</dd>
            </div>
            <div>
              <dt>参战方 participants</dt>
              <dd>
                {battle.participantNames?.length
                  ? battle.participantNames.join(", ")
                  : battle.participants.map((id) => lookupName(id, participants)).join(", ") || "未映射"}
              </dd>
            </div>
            {battle.rawParticipantNames?.length ? (
              <div>
                <dt>原始参战方 raw participants</dt>
                <dd>{battle.rawParticipantNames.join(", ")}</dd>
              </div>
            ) : null}
            <div>
              <dt>胜方 winner</dt>
              <dd>{battle.winnerNames?.join(", ") || "未知"}</dd>
            </div>
            <div>
              <dt>败方 loser</dt>
              <dd>{battle.loserNames?.join(", ") || "未知"}</dd>
            </div>
            {battle.actors?.length ? (
              <div>
                <dt>行动者 actors</dt>
                <dd>
                  <ul className="actor-list">
                    {battle.actors.map((actor) => (
                      <li key={`${actor.id}-${actor.role}-${actor.sourceField}-${actor.rawName}`}>
                        <div className="actor-row-heading">
                          <strong>{actor.name}</strong>
                          <span>{actorRoleLabels[actor.role]}</span>
                        </div>
                        {shouldShowMapTarget(actor) ? (
                          <small>边界映射：{actor.mapTarget}，用于地图定位和历史边界高亮。</small>
                        ) : null}
                        <div className="actor-meta">
                          <span>{actorTypeLabels[actor.type]}</span>
                          <span>{actorConfidenceLabels[actor.confidence]}</span>
                          <span>{actorStatusLabels[actor.status]}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>结果</dt>
              <dd>{battle.result ?? "未知"}</dd>
            </div>
            <div>
              <dt>类型</dt>
              <dd>{battle.type ?? "冲突事件"}</dd>
            </div>
            <div>
              <dt>来源</dt>
              <dd>{battle.source ?? "Historical Conflict Event Dataset"}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
