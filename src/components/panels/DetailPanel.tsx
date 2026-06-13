import { Info } from "lucide-react";
import { formatConflictGroupName, formatEventType, formatOutcome } from "../../lib/displayLabels";
import type { Battle, Participant, War } from "../../types/domain";

type DetailPanelProps = {
  battle: Battle | null;
  wars: War[];
  participants: Participant[];
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

function formatActor(actor: NonNullable<Battle["actors"]>[number]) {
  const target = actor.mapTarget ? ` -> ${actor.mapTarget}` : "";
  return `${actor.name}${target} (${actorRoleLabels[actor.role]}, ${actorTypeLabels[actor.type]}, ${
    actorConfidenceLabels[actor.confidence]
  }, ${actorStatusLabels[actor.status]})`;
}

export function DetailPanel({ battle, wars, participants }: DetailPanelProps) {
  return (
    <section className="side-panel detail-panel">
      <div className="section-heading">
        <Info size={18} />
        <h2>事件详情</h2>
      </div>
      {!battle ? (
        <div className="empty-state">请选择一个冲突事件以查看字段详情。</div>
      ) : (
        <>
          <h3>{battle.name}</h3>
          <p>{battle.description}</p>
          <dl className="detail-list">
            <div>
              <dt>冲突组 conflict group</dt>
              <dd>{formatConflictGroupName(lookupName(battle.warId, wars))}</dd>
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
                <dd>{battle.actors.map(formatActor).join("; ")}</dd>
              </div>
            ) : null}
            <div>
              <dt>结果</dt>
              <dd>{formatOutcome(battle.result)}</dd>
            </div>
            <div>
              <dt>类型</dt>
              <dd>{formatEventType(battle.type)}</dd>
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
