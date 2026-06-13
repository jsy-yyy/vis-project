import { useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { buildParticipantNetwork } from "../../lib/networkAnalytics";
import { formatConflictGroupId } from "../../lib/displayLabels";
import type { ParticipantNetworkEdge, ParticipantNetworkNode } from "../../lib/networkAnalytics";
import type { Battle, Participant } from "../../types/domain";

type NetworkViewProps = {
  battles: Battle[];
  participants: Participant[];
  selectedParticipant: string | null;
  onSelectParticipant: (participantId: string | null) => void;
  onResetFilters: () => void;
};

type PositionedNode = ParticipantNetworkNode & {
  x: number;
  y: number;
  radius: number;
  labelX: number;
  labelY: number;
  textAnchor: "start" | "middle" | "end";
};

const maxVisibleNodes = 20;
const maxVisibleEdges = 60;
const viewBoxWidth = 720;
const viewBoxHeight = 500;
const centerX = viewBoxWidth / 2;
const centerY = viewBoxHeight / 2;
const layoutRadius = 180;
const detailSampleLimit = 4;

type ParticipantDetail = {
  name: string;
  eventCount: number;
  yearRange: string;
  topConflictGroups: Array<[string, number]>;
  sampleEvents: Battle[];
};

type EdgeDetail = {
  sourceName: string;
  targetName: string;
  eventCount: number;
  yearRange: string;
  topConflictGroups: Array<[string, number]>;
  sampleEvents: Battle[];
};

function getParticipantName(participantId: string, participantNames: Map<string, string>) {
  return participantNames.get(participantId) ?? participantId;
}

function truncateLabel(label: string) {
  return label.length > 18 ? `${label.slice(0, 17)}...` : label;
}

function getNodeRadius(eventCount: number, maxEventCount: number) {
  return 12 + Math.sqrt(eventCount / Math.max(1, maxEventCount)) * 15;
}

function getEdgeKey(source: string, target: string) {
  return `${source}::${target}`;
}

function formatYearRange(battles: Battle[]) {
  if (battles.length === 0) {
    return "无年份";
  }

  const years = battles.map((battle) => battle.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  return minYear === maxYear ? String(minYear) : `${minYear}-${maxYear}`;
}

function getTopEntries(values: string[], limit = 4) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function getParticipantDetail(
  participantId: string,
  battles: Battle[],
  participantNames: Map<string, string>,
): ParticipantDetail | null {
  const participantBattles = battles
    .filter((battle) => battle.participants.includes(participantId))
    .sort((left, right) => left.year - right.year || left.name.localeCompare(right.name));

  if (participantBattles.length === 0) {
    return null;
  }

  return {
    name: getParticipantName(participantId, participantNames),
    eventCount: participantBattles.length,
    yearRange: formatYearRange(participantBattles),
    topConflictGroups: getTopEntries(participantBattles.map((battle) => battle.warId)),
    sampleEvents: participantBattles.slice(0, detailSampleLimit),
  };
}

function getEdgeDetail(
  edge: ParticipantNetworkEdge,
  battles: Battle[],
  participantNames: Map<string, string>,
): EdgeDetail {
  const sharedBattles = battles
    .filter((battle) => battle.participants.includes(edge.source) && battle.participants.includes(edge.target))
    .sort((left, right) => left.year - right.year || left.name.localeCompare(right.name));

  return {
    sourceName: getParticipantName(edge.source, participantNames),
    targetName: getParticipantName(edge.target, participantNames),
    eventCount: sharedBattles.length,
    yearRange: formatYearRange(sharedBattles),
    topConflictGroups: getTopEntries(sharedBattles.map((battle) => battle.warId)),
    sampleEvents: sharedBattles.slice(0, detailSampleLimit),
  };
}

function positionNodes(nodes: ParticipantNetworkNode[], focusedParticipantId: string | null): PositionedNode[] {
  const maxEventCount = Math.max(1, ...nodes.map((node) => node.eventCount));

  if (focusedParticipantId && nodes.some((node) => node.id === focusedParticipantId)) {
    const focusedNode = nodes.find((node) => node.id === focusedParticipantId);
    const neighborNodes = nodes.filter((node) => node.id !== focusedParticipantId);

    return [
      {
        ...focusedNode!,
        x: centerX,
        y: centerY,
        radius: getNodeRadius(focusedNode!.eventCount, maxEventCount) + 4,
        labelX: centerX,
        labelY: centerY - getNodeRadius(focusedNode!.eventCount, maxEventCount) - 16,
        textAnchor: "middle",
      },
      ...neighborNodes.map((node, index) => {
        const angle = (index / Math.max(1, neighborNodes.length)) * Math.PI * 2 - Math.PI / 2;
        const radius = getNodeRadius(node.eventCount, maxEventCount);
        const x = centerX + Math.cos(angle) * layoutRadius;
        const y = centerY + Math.sin(angle) * layoutRadius;
        const labelDistance = radius + 10;
        const labelX = x + Math.cos(angle) * labelDistance;
        const labelY = y + Math.sin(angle) * labelDistance;
        const horizontalDirection = Math.cos(angle);
        const textAnchor: PositionedNode["textAnchor"] =
          horizontalDirection > 0.2 ? "start" : horizontalDirection < -0.2 ? "end" : "middle";

        return {
          ...node,
          x,
          y,
          radius,
          labelX,
          labelY,
          textAnchor,
        };
      }),
    ];
  }

  return nodes.map((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
    const radius = getNodeRadius(node.eventCount, maxEventCount);
    const x = centerX + Math.cos(angle) * layoutRadius;
    const y = centerY + Math.sin(angle) * layoutRadius;
    const labelDistance = radius + 10;
    const labelX = x + Math.cos(angle) * labelDistance;
    const labelY = y + Math.sin(angle) * labelDistance;
    const horizontalDirection = Math.cos(angle);

    return {
      ...node,
      x,
      y,
      radius,
      labelX,
      labelY,
      textAnchor: horizontalDirection > 0.2 ? "start" : horizontalDirection < -0.2 ? "end" : "middle",
    };
  });
}

export function NetworkView({
  battles,
  participants,
  selectedParticipant,
  onSelectParticipant,
  onResetFilters,
}: NetworkViewProps) {
  const [inspectedEdgeKey, setInspectedEdgeKey] = useState<string | null>(null);
  const participantNames = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant.name])),
    [participants],
  );
  const network = useMemo(
    () => buildParticipantNetwork(battles, maxVisibleNodes, { focusedParticipantId: selectedParticipant }),
    [battles, selectedParticipant],
  );
  const nodes = useMemo(() => positionNodes(network.nodes, selectedParticipant), [network.nodes, selectedParticipant]);
  const nodeLookup = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const edges = network.edges.slice(0, maxVisibleEdges);
  const maxEdgeWeight = Math.max(1, ...edges.map((edge) => edge.weight));
  const selectionVisible = selectedParticipant ? nodeLookup.has(selectedParticipant) : false;
  const selectedParticipantDetail = useMemo(
    () =>
      selectedParticipant
        ? getParticipantDetail(selectedParticipant, battles, participantNames)
        : null,
    [battles, participantNames, selectedParticipant],
  );
  const inspectedEdge = useMemo(
    () => edges.find((edge) => getEdgeKey(edge.source, edge.target) === inspectedEdgeKey) ?? null,
    [edges, inspectedEdgeKey],
  );
  const inspectedEdgeDetail = useMemo(
    () => inspectedEdge ? getEdgeDetail(inspectedEdge, battles, participantNames) : null,
    [battles, inspectedEdge, participantNames],
  );

  return (
    <section className="view-panel network-panel">
      <div className="section-heading">
        <Share2 size={18} />
        <h2>参战方共现网络</h2>
      </div>
      <div className="network-heading">
        <p>
          节点表示参战方 participant，连线表示两个 participant 在当前筛选范围内共同出现在同一冲突事件中。
        </p>
        <div className="network-legend" aria-label="参战方网络图例">
          <span><i className="node" />节点大小：事件数</span>
          <span><i className="edge" />连线宽度：共现次数</span>
          <span><i className="selected" />当前选中参战方</span>
        </div>
      </div>
      {nodes.length === 0 ? (
        <div className="empty-state empty-state-with-action">
          <p>当前筛选条件下没有可展示的参战方网络。</p>
          <button className="secondary-action-button" type="button" onClick={onResetFilters}>
            重置筛选
          </button>
        </div>
      ) : (
        <>
          <div className="network-stage">
            <svg
              className="network-svg"
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              role="img"
              aria-label="参战方共现网络"
            >
              <g className="network-edges">
                {edges.map((edge) => {
                  const source = nodeLookup.get(edge.source);
                  const target = nodeLookup.get(edge.target);

                  if (!source || !target) {
                    return null;
                  }

                  const edgeKey = getEdgeKey(edge.source, edge.target);
                  const connectedToSelection =
                    !selectionVisible || edge.source === selectedParticipant || edge.target === selectedParticipant;
                  const edgeDetail = getEdgeDetail(edge, battles, participantNames);

                  return (
                    <line
                      key={edgeKey}
                      className={[
                        connectedToSelection ? "network-edge" : "network-edge muted",
                        inspectedEdgeKey === edgeKey ? "active" : "",
                      ].join(" ")}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      strokeWidth={1 + (edge.weight / maxEdgeWeight) * 5}
                      role="button"
                      tabIndex={0}
                      aria-label={`${edgeDetail.sourceName} 与 ${edgeDetail.targetName}：${edge.weight} 次共现冲突事件`}
                      onClick={() => setInspectedEdgeKey(inspectedEdgeKey === edgeKey ? null : edgeKey)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setInspectedEdgeKey(inspectedEdgeKey === edgeKey ? null : edgeKey);
                        }
                      }}
                    >
                      <title>
                        {edgeDetail.sourceName} 与 {edgeDetail.targetName}：{edge.weight} 次共现，{" "}
                        {edgeDetail.yearRange}，示例：{" "}
                        {edgeDetail.sampleEvents.map((battle) => battle.name).join("; ") || "无"}
                      </title>
                    </line>
                  );
                })}
              </g>
              <g className="network-nodes">
                {nodes.map((node) => {
                  const selected = node.id === selectedParticipant;
                  const participantName = getParticipantName(node.id, participantNames);

                  return (
                    <g
                      key={node.id}
                      className={selected ? "network-svg-node active" : "network-svg-node"}
                      role="button"
                      tabIndex={0}
                      aria-label={`${participantName}：${node.eventCount} 条冲突事件`}
                      aria-pressed={selected}
                      onClick={() => onSelectParticipant(selected ? null : node.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectParticipant(selected ? null : node.id);
                        }
                      }}
                    >
                      <circle cx={node.x} cy={node.y} r={node.radius}>
                        <title>
                          {participantName}：{node.eventCount} 条冲突事件。点击可聚焦该参战方。
                        </title>
                      </circle>
                      <text className="network-node-count" x={node.x} y={node.y + 4} textAnchor="middle">
                        {node.eventCount}
                      </text>
                      <text
                        className="network-node-label"
                        x={node.labelX}
                        y={node.labelY}
                        textAnchor={node.textAnchor}
                      >
                        {truncateLabel(participantName)}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
          <p className="network-footnote">
            当前显示 {nodes.length} 个活跃参战方和 {edges.length} 条较强共现关系。
            共现不直接等于同盟、敌对或交战关系。
            {selectedParticipant && selectionVisible
              ? " 聚焦模式会显示选中 participant 及其最强一阶邻居。"
              : ""}
          </p>
          {(selectedParticipantDetail || inspectedEdgeDetail) ? (
            <div className="network-detail-grid">
              {selectedParticipantDetail ? (
                <article className="network-detail-card">
                  <h3>{selectedParticipantDetail.name}</h3>
                  <dl>
                    <div>
                      <dt>事件数</dt>
                      <dd>{selectedParticipantDetail.eventCount}</dd>
                    </div>
                    <div>
                      <dt>活跃年份</dt>
                      <dd>{selectedParticipantDetail.yearRange}</dd>
                    </div>
                    <div>
                      <dt>主要冲突组</dt>
                      <dd>
                        {selectedParticipantDetail.topConflictGroups
                          .map(([group, count]) => `${formatConflictGroupId(group)} (${count})`)
                          .join(", ")}
                      </dd>
                    </div>
                  </dl>
                  <ul>
                    {selectedParticipantDetail.sampleEvents.map((battle) => (
                      <li key={battle.id}>{battle.year}: {battle.name}</li>
                    ))}
                  </ul>
                  <button className="secondary-action-button compact" type="button" onClick={() => onSelectParticipant(null)}>
                    清除参战方选择
                  </button>
                </article>
              ) : null}
              {inspectedEdgeDetail ? (
                <article className="network-detail-card">
                  <h3>{inspectedEdgeDetail.sourceName} + {inspectedEdgeDetail.targetName}</h3>
                  <dl>
                    <div>
                      <dt>共现事件数</dt>
                      <dd>{inspectedEdgeDetail.eventCount}</dd>
                    </div>
                    <div>
                      <dt>共现年份</dt>
                      <dd>{inspectedEdgeDetail.yearRange}</dd>
                    </div>
                    <div>
                      <dt>主要冲突组</dt>
                      <dd>
                        {inspectedEdgeDetail.topConflictGroups
                          .map(([group, count]) => `${formatConflictGroupId(group)} (${count})`)
                          .join(", ")}
                      </dd>
                    </div>
                  </dl>
                  <ul>
                    {inspectedEdgeDetail.sampleEvents.map((battle) => (
                      <li key={battle.id}>{battle.year}: {battle.name}</li>
                    ))}
                  </ul>
                  <button className="secondary-action-button compact" type="button" onClick={() => setInspectedEdgeKey(null)}>
                    清除关系选择
                  </button>
                </article>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
