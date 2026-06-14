import { useEffect, useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { buildParticipantNetwork } from "../../lib/networkAnalytics";
import type {
  ParticipantNetworkEdge,
  ParticipantNetworkNode,
  ParticipantNetworkRelation,
  ParticipantNetworkSide,
} from "../../lib/networkAnalytics";
import type { Battle, Participant, War } from "../../types/domain";

type NetworkViewProps = {
  battles: Battle[];
  wars: War[];
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
const visibleLabelLimit = 10;
const heatmapRowLimit = 12;
const heatmapColumnLimit = 8;
const heatmapCellSize = 28;
const heatmapLeftMargin = 118;
const heatmapTopMargin = 78;
const heatmapRightMargin = 54;
const heatmapBottomMargin = 26;

type ParticipantDetail = {
  name: string;
  eventCount: number;
  side: ParticipantNetworkSide;
  winnerCount: number;
  loserCount: number;
  neutralCount: number;
  yearRange: string;
  topConflictGroups: Array<[string, number]>;
  sampleEvents: Battle[];
};

type EdgeDetail = {
  sourceName: string;
  targetName: string;
  eventCount: number;
  relation: ParticipantNetworkRelation;
  allyCount: number;
  opponentCount: number;
  cooccurrenceCount: number;
  yearRange: string;
  topConflictGroups: Array<[string, number]>;
  sampleEvents: Battle[];
};

type ParticipantHeatmap = {
  rows: ParticipantNetworkNode[];
  columns: Array<{ id: string; name: string; count: number }>;
  cells: Map<string, number>;
  maxCount: number;
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

function getRelationLabel(relation: ParticipantNetworkRelation) {
  if (relation === "ally") {
    return "同阵营";
  }

  if (relation === "opponent") {
    return "对立";
  }

  return "普通共现";
}

function getSideLabel(side: ParticipantNetworkSide) {
  if (side === "winner") {
    return "胜方主导";
  }

  if (side === "loser") {
    return "败方主导";
  }

  if (side === "mixed") {
    return "混合阵营";
  }

  return "未判定";
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

function getHeatmapKey(participantId: string, warId: string) {
  return `${participantId}::${warId}`;
}

function buildParticipantHeatmap(
  battles: Battle[],
  rows: ParticipantNetworkNode[],
  warNames: Map<string, string>,
): ParticipantHeatmap {
  const visibleParticipantIds = new Set(rows.map((row) => row.id));
  const warCounts = new Map<string, number>();
  const cells = new Map<string, number>();

  for (const battle of battles) {
    const visibleParticipants = battle.participants.filter((participantId) => visibleParticipantIds.has(participantId));

    if (visibleParticipants.length === 0) {
      continue;
    }

    warCounts.set(battle.warId, (warCounts.get(battle.warId) ?? 0) + visibleParticipants.length);

    for (const participantId of visibleParticipants) {
      const key = getHeatmapKey(participantId, battle.warId);
      cells.set(key, (cells.get(key) ?? 0) + 1);
    }
  }

  const columns = Array.from(warCounts.entries())
    .sort((left, right) => right[1] - left[1] || (warNames.get(left[0]) ?? left[0]).localeCompare(warNames.get(right[0]) ?? right[0]))
    .slice(0, heatmapColumnLimit)
    .map(([id, count]) => ({ id, name: warNames.get(id) ?? id, count }));
  const allowedColumnIds = new Set(columns.map((column) => column.id));
  let maxCount = 1;

  for (const [key, count] of cells.entries()) {
    const [, warId] = key.split("::");
    if (!allowedColumnIds.has(warId)) {
      cells.delete(key);
      continue;
    }
    maxCount = Math.max(maxCount, count);
  }

  return { rows, columns, cells, maxCount };
}

function getHeatmapFill(count: number, maxCount: number) {
  if (count === 0) {
    return "rgba(238, 240, 234, 0.05)";
  }

  const intensity = Math.sqrt(count / maxCount);
  return `rgba(214, 182, 106, ${0.18 + intensity * 0.74})`;
}

function getParticipantDetail(
  participantId: string,
  battles: Battle[],
  participantNames: Map<string, string>,
  warNames: Map<string, string>,
  networkNode?: ParticipantNetworkNode,
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
    side: networkNode?.side ?? "neutral",
    winnerCount: networkNode?.winnerCount ?? 0,
    loserCount: networkNode?.loserCount ?? 0,
    neutralCount: networkNode?.neutralCount ?? participantBattles.length,
    yearRange: formatYearRange(participantBattles),
    topConflictGroups: getTopEntries(participantBattles.map((battle) => warNames.get(battle.warId) ?? battle.warId)),
    sampleEvents: participantBattles.slice(0, detailSampleLimit),
  };
}

function getEdgeDetail(
  edge: ParticipantNetworkEdge,
  battles: Battle[],
  participantNames: Map<string, string>,
  warNames: Map<string, string>,
): EdgeDetail {
  const sharedBattles = battles
    .filter((battle) => battle.participants.includes(edge.source) && battle.participants.includes(edge.target))
    .sort((left, right) => left.year - right.year || left.name.localeCompare(right.name));

  return {
    sourceName: getParticipantName(edge.source, participantNames),
    targetName: getParticipantName(edge.target, participantNames),
    eventCount: sharedBattles.length,
    relation: edge.relation,
    allyCount: edge.allyWeight,
    opponentCount: edge.opponentWeight,
    cooccurrenceCount: edge.cooccurrenceWeight,
    yearRange: formatYearRange(sharedBattles),
    topConflictGroups: getTopEntries(sharedBattles.map((battle) => warNames.get(battle.warId) ?? battle.warId)),
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

  const groupCenters: Record<ParticipantNetworkSide, { x: number; y: number }> = {
    winner: { x: centerX - 175, y: centerY - 70 },
    loser: { x: centerX + 175, y: centerY - 70 },
    mixed: { x: centerX, y: centerY + 150 },
    neutral: { x: centerX, y: centerY },
  };
  const groups = new Map<ParticipantNetworkSide, ParticipantNetworkNode[]>();

  for (const node of nodes) {
    groups.set(node.side, [...(groups.get(node.side) ?? []), node]);
  }

  return nodes.map((node) => {
    const group = groups.get(node.side) ?? [node];
    const groupIndex = group.findIndex((item) => item.id === node.id);
    const groupCenter = groupCenters[node.side];
    const groupRadius = Math.min(126, 38 + group.length * 12);
    const angle = group.length === 1 ? -Math.PI / 2 : (groupIndex / group.length) * Math.PI * 2 - Math.PI / 2;
    const radius = getNodeRadius(node.eventCount, maxEventCount);
    const x = groupCenter.x + Math.cos(angle) * groupRadius;
    const y = groupCenter.y + Math.sin(angle) * groupRadius;
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
  wars,
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
  const warNames = useMemo(
    () => new Map(wars.map((war) => [war.id, war.name])),
    [wars],
  );
  const network = useMemo(
    () => buildParticipantNetwork(battles, maxVisibleNodes, { focusedParticipantId: selectedParticipant }),
    [battles, selectedParticipant],
  );
  const nodes = useMemo(() => positionNodes(network.nodes, selectedParticipant), [network.nodes, selectedParticipant]);
  const heatmapRows = useMemo(
    () => network.nodes.slice(0, heatmapRowLimit),
    [network.nodes],
  );
  const participantHeatmap = useMemo(
    () => buildParticipantHeatmap(battles, heatmapRows, warNames),
    [battles, heatmapRows, warNames],
  );
  const visibleLabelNodeIds = useMemo(
    () => new Set(network.nodes.slice(0, visibleLabelLimit).map((node) => node.id)),
    [network.nodes],
  );
  const nodeLookup = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const edges = network.edges.slice(0, maxVisibleEdges);
  const maxEdgeWeight = Math.max(1, ...edges.map((edge) => edge.weight));
  const selectionVisible = selectedParticipant ? nodeLookup.has(selectedParticipant) : false;
  const selectedParticipantName = selectedParticipant ? getParticipantName(selectedParticipant, participantNames) : null;
  const focusedNodeIds = useMemo(() => {
    if (!selectionVisible || !selectedParticipant) {
      return new Set(nodes.map((node) => node.id));
    }

    const ids = new Set<string>([selectedParticipant]);
    for (const edge of edges) {
      if (edge.source === selectedParticipant) {
        ids.add(edge.target);
      }
      if (edge.target === selectedParticipant) {
        ids.add(edge.source);
      }
    }

    return ids;
  }, [edges, nodes, selectedParticipant, selectionVisible]);
  const selectedParticipantDetail = useMemo(
    () =>
      selectedParticipant
        ? getParticipantDetail(selectedParticipant, battles, participantNames, warNames, network.nodes.find((node) => node.id === selectedParticipant))
        : null,
    [battles, network.nodes, participantNames, selectedParticipant, warNames],
  );
  const inspectedEdge = useMemo(
    () => edges.find((edge) => getEdgeKey(edge.source, edge.target) === inspectedEdgeKey) ?? null,
    [edges, inspectedEdgeKey],
  );
  const inspectedEdgeDetail = useMemo(
    () => inspectedEdge ? getEdgeDetail(inspectedEdge, battles, participantNames, warNames) : null,
    [battles, inspectedEdge, participantNames, warNames],
  );

  useEffect(() => {
    if (!inspectedEdgeKey) {
      return;
    }

    if (!edges.some((edge) => getEdgeKey(edge.source, edge.target) === inspectedEdgeKey)) {
      setInspectedEdgeKey(null);
    }
  }, [edges, inspectedEdgeKey]);

  return (
    <section className="view-panel network-panel">
      <div className="section-heading">
        <Share2 size={18} />
        <h2>参战方共现网络</h2>
      </div>
      <div className="network-heading">
        <p>
          节点表示参战方 participant，颜色表示当前筛选范围内的主导阵营，连线表示两个 participant 的事件关系。
        </p>
        <div className="network-legend" aria-label="参战方网络图例">
          <span><i className="node-scale" />节点大小：事件数</span>
          <span><i className="node winner" />胜方主导</span>
          <span><i className="node loser" />败方主导</span>
          <span><i className="node mixed" />混合阵营</span>
          <span><i className="node neutral" />未判定</span>
          <span><i className="edge width" />边宽：相关事件数</span>
          <span><i className="edge ally" />同阵营</span>
          <span><i className="edge opponent" />对立</span>
          <span><i className="edge cooccurrence" />普通共现</span>
          <span><i className="selected" />当前选中参战方</span>
        </div>
      </div>
      {nodes.length === 0 ? (
        <div className="empty-state empty-state-with-action">
          <p>
            {selectedParticipantName
              ? `${selectedParticipantName} 在当前 conflict group 和年份范围内没有可展示的网络事件。`
              : "当前筛选条件下没有可展示的参战方网络。"}
          </p>
          {selectedParticipantName ? (
            <button className="secondary-action-button" type="button" onClick={() => onSelectParticipant(null)}>
              清除参战方筛选
            </button>
          ) : null}
          <button className="secondary-action-button" type="button" onClick={onResetFilters}>
            重置筛选
          </button>
        </div>
      ) : (
        <>
          <div className="network-visual-grid">
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
                    const edgeDetail = getEdgeDetail(edge, battles, participantNames, warNames);
                    const edgeOpacity = connectedToSelection
                      ? 0.28 + (edge.weight / maxEdgeWeight) * 0.62
                      : 0.08;

                    return (
                      <line
                        key={edgeKey}
                        className={[
                          connectedToSelection ? `network-edge ${edge.relation}` : `network-edge ${edge.relation} muted`,
                          inspectedEdgeKey === edgeKey ? "active" : "",
                        ].join(" ")}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        strokeWidth={1 + (edge.weight / maxEdgeWeight) * 5}
                        style={{ opacity: inspectedEdgeKey === edgeKey ? 1 : edgeOpacity }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${edgeDetail.sourceName} 与 ${edgeDetail.targetName}：${getRelationLabel(edge.relation)}，${edge.weight} 次相关事件`}
                        onClick={() => setInspectedEdgeKey(inspectedEdgeKey === edgeKey ? null : edgeKey)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setInspectedEdgeKey(inspectedEdgeKey === edgeKey ? null : edgeKey);
                          }
                        }}
                      >
                        <title>
                          {edgeDetail.sourceName} 与 {edgeDetail.targetName}：{getRelationLabel(edge.relation)}，{" "}
                          {edge.weight} 次相关事件，{" "}
                          {edgeDetail.yearRange}，示例：{" "}
                          {edgeDetail.sampleEvents.map((battle) => battle.name).join("; ") || "无"}
                        </title>
                      </line>
                    );
                  })}
                </g>
                <g className="network-nodes">
                  {nodes.map((node, index) => {
                    const selected = node.id === selectedParticipant;
                    const participantName = getParticipantName(node.id, participantNames);
                    const muted = selectionVisible && !focusedNodeIds.has(node.id);
                    const inspected =
                      inspectedEdge && (inspectedEdge.source === node.id || inspectedEdge.target === node.id);
                    const showLabel =
                      visibleLabelNodeIds.has(node.id) || selected || Boolean(inspected) || (selectionVisible && index < 12);

                    return (
                      <g
                        key={node.id}
                        className={[
                          "network-svg-node",
                          node.side,
                          selected ? "active" : "",
                          muted ? "muted" : "",
                          inspected ? "inspected" : "",
                        ].join(" ")}
                        role="button"
                        tabIndex={0}
                        aria-label={`${participantName}：${getSideLabel(node.side)}，${node.eventCount} 条冲突事件`}
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
                            {participantName}：{getSideLabel(node.side)}，{node.eventCount} 条冲突事件。
                            胜方 {node.winnerCount} / 败方 {node.loserCount} / 未判定 {node.neutralCount}。
                          </title>
                        </circle>
                        <text className="network-node-count" x={node.x} y={node.y + 4} textAnchor="middle">
                          {node.eventCount}
                        </text>
                        {showLabel ? (
                          <text
                            className="network-node-label"
                            x={node.labelX}
                            y={node.labelY}
                            textAnchor={node.textAnchor}
                          >
                            {truncateLabel(participantName)}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
            {participantHeatmap.rows.length > 0 && participantHeatmap.columns.length > 0 ? (
              <div className="network-heatmap-panel">
                <div className="network-heatmap-heading">
                  <h3>参战方-冲突组事件热力图</h3>
                  <span>颜色越深表示事件数越多</span>
                </div>
                <svg
                  className="participant-heatmap-svg"
                  viewBox={`0 0 ${
                    heatmapLeftMargin + participantHeatmap.columns.length * heatmapCellSize + heatmapRightMargin
                  } ${heatmapTopMargin + participantHeatmap.rows.length * heatmapCellSize + heatmapBottomMargin}`}
                  role="img"
                  aria-label="参战方和冲突组事件数热力图"
                >
                  {participantHeatmap.columns.map((column, columnIndex) => (
                    <text
                      key={column.id}
                      className="participant-heatmap-axis x-axis"
                      x={heatmapLeftMargin + columnIndex * heatmapCellSize + heatmapCellSize / 2}
                      y={heatmapTopMargin - 8}
                      textAnchor="start"
                      transform={`rotate(-38 ${heatmapLeftMargin + columnIndex * heatmapCellSize + heatmapCellSize / 2} ${
                        heatmapTopMargin - 8
                      })`}
                    >
                      {truncateLabel(column.name)}
                    </text>
                  ))}
                  {participantHeatmap.rows.map((row, rowIndex) => {
                    const participantName = getParticipantName(row.id, participantNames);

                    return (
                      <text
                        key={row.id}
                        className="participant-heatmap-axis y-axis"
                        x={heatmapLeftMargin - 8}
                        y={heatmapTopMargin + rowIndex * heatmapCellSize + heatmapCellSize * 0.68}
                        textAnchor="end"
                      >
                        {truncateLabel(participantName)}
                      </text>
                    );
                  })}
                  {participantHeatmap.rows.map((row, rowIndex) =>
                    participantHeatmap.columns.map((column, columnIndex) => {
                      const participantName = getParticipantName(row.id, participantNames);
                      const count = participantHeatmap.cells.get(getHeatmapKey(row.id, column.id)) ?? 0;

                      return (
                        <g
                          key={`${row.id}-${column.id}`}
                          role="button"
                          tabIndex={0}
                          aria-label={`${participantName} 在 ${column.name} 中有 ${count} 条事件`}
                          onClick={() => onSelectParticipant(row.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSelectParticipant(row.id);
                            }
                          }}
                        >
                          <rect
                            className="participant-heatmap-rect"
                            x={heatmapLeftMargin + columnIndex * heatmapCellSize}
                            y={heatmapTopMargin + rowIndex * heatmapCellSize}
                            width={heatmapCellSize - 2}
                            height={heatmapCellSize - 2}
                            rx={3}
                            fill={getHeatmapFill(count, participantHeatmap.maxCount)}
                          >
                            <title>{`${participantName} / ${column.name}: ${count} 条事件`}</title>
                          </rect>
                          {count > 0 ? (
                            <text
                              className="participant-heatmap-value"
                              x={heatmapLeftMargin + columnIndex * heatmapCellSize + heatmapCellSize / 2 - 1}
                              y={heatmapTopMargin + rowIndex * heatmapCellSize + heatmapCellSize * 0.66}
                              textAnchor="middle"
                            >
                              {count}
                            </text>
                          ) : null}
                        </g>
                      );
                    }),
                  )}
                  <defs>
                    <linearGradient id="participant-heatmap-scale" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="rgba(214, 182, 106, 0.12)" />
                      <stop offset="100%" stopColor="rgba(214, 182, 106, 0.92)" />
                    </linearGradient>
                  </defs>
                  <rect
                    className="participant-heatmap-scale"
                    x={heatmapLeftMargin}
                    y={heatmapTopMargin + participantHeatmap.rows.length * heatmapCellSize + 10}
                    width={heatmapCellSize * Math.min(5, participantHeatmap.columns.length)}
                    height={8}
                    fill="url(#participant-heatmap-scale)"
                  />
                  <text
                    className="participant-heatmap-scale-label"
                    x={heatmapLeftMargin}
                    y={heatmapTopMargin + participantHeatmap.rows.length * heatmapCellSize + 26}
                  >
                    0
                  </text>
                  <text
                    className="participant-heatmap-scale-label"
                    x={heatmapLeftMargin + heatmapCellSize * Math.min(5, participantHeatmap.columns.length)}
                    y={heatmapTopMargin + participantHeatmap.rows.length * heatmapCellSize + 26}
                    textAnchor="end"
                  >
                    {participantHeatmap.maxCount}
                  </text>
                </svg>
              </div>
            ) : null}
          </div>
          <p className="network-footnote">
            当前显示 {nodes.length} 个活跃参战方和 {edges.length} 条较强共现关系。
            节点颜色与边类别优先使用 winner/loser 字段判断；缺少阵营信息时保留为未判定或普通共现。
            {selectedParticipant && selectionVisible
              ? ` 已聚焦 ${selectedParticipantName} 及其最强一阶邻居。`
              : ""}
            {selectedParticipant && !selectionVisible && nodes.length > 0
              ? ` ${selectedParticipantName} 当前不在可见网络中，请调整 conflict group 或年份范围。`
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
                      <dt>主导阵营</dt>
                      <dd>{getSideLabel(selectedParticipantDetail.side)}</dd>
                    </div>
                    <div>
                      <dt>阵营构成</dt>
                      <dd>
                        胜方 {selectedParticipantDetail.winnerCount} / 败方 {selectedParticipantDetail.loserCount} / 未判定{" "}
                        {selectedParticipantDetail.neutralCount}
                      </dd>
                    </div>
                    <div>
                      <dt>活跃年份</dt>
                      <dd>{selectedParticipantDetail.yearRange}</dd>
                    </div>
                    <div>
                      <dt>主要冲突组</dt>
                      <dd>
                        {selectedParticipantDetail.topConflictGroups
                          .map(([group, count]) => `${group} (${count})`)
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
                      <dt>主要关系</dt>
                      <dd>{getRelationLabel(inspectedEdgeDetail.relation)}</dd>
                    </div>
                    <div>
                      <dt>相关事件数</dt>
                      <dd>{inspectedEdgeDetail.eventCount}</dd>
                    </div>
                    <div>
                      <dt>关系构成</dt>
                      <dd>
                        同阵营 {inspectedEdgeDetail.allyCount} / 对立 {inspectedEdgeDetail.opponentCount} / 普通共现{" "}
                        {inspectedEdgeDetail.cooccurrenceCount}
                      </dd>
                    </div>
                    <div>
                      <dt>共现年份</dt>
                      <dd>{inspectedEdgeDetail.yearRange}</dd>
                    </div>
                    <div>
                      <dt>主要冲突组</dt>
                      <dd>
                        {inspectedEdgeDetail.topConflictGroups
                          .map(([group, count]) => `${group} (${count})`)
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
