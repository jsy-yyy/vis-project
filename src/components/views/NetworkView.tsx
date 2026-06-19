import { useEffect, useMemo, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { Grid3X3, Maximize2, RotateCcw, Search, Share2, Waypoints, X, ZoomIn, ZoomOut } from "lucide-react";
import { resolveDominantHistoricalFlag } from "../../lib/battlePopup";
import { buildParticipantNetwork } from "../../lib/networkAnalytics";
import type {
  ParticipantNetworkEdge,
  ParticipantNetworkNode,
  ParticipantNetworkRelation,
  ParticipantNetworkSide,
} from "../../lib/networkAnalytics";
import type { Battle, Participant } from "../../types/domain";

type NetworkViewProps = {
  battles: Battle[];
  participants: Participant[];
  selectedParticipant: string | null;
  highlightedParticipantIds: string[];
  onSelectParticipant: (participantId: string | null) => void;
  onSelectBattle: (battleId: string) => void;
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
  sampleEvents: Battle[];
};

type ParticipantHeatmap = {
  rows: ParticipantNetworkNode[];
  columns: Array<{ id: string; name: string; count: number }>;
  cells: Map<string, number>;
  maxCount: number;
};

type NetworkViewport = {
  x: number;
  y: number;
  scale: number;
};

type NetworkTooltip = {
  x: number;
  y: number;
  title: string;
  lines: string[];
};

const defaultViewport: NetworkViewport = { x: 0, y: 0, scale: 1 };
const minViewportScale = 0.65;
const maxViewportScale = 2.6;
const viewportVisibilityMargin = 56;

function clampViewport(viewport: NetworkViewport): NetworkViewport {
  const scaledWidth = viewBoxWidth * viewport.scale;
  const scaledHeight = viewBoxHeight * viewport.scale;
  const minX = viewportVisibilityMargin - scaledWidth;
  const maxX = viewBoxWidth - viewportVisibilityMargin;
  const minY = viewportVisibilityMargin - scaledHeight;
  const maxY = viewBoxHeight - viewportVisibilityMargin;

  return {
    ...viewport,
    x: Math.min(maxX, Math.max(minX, viewport.x)),
    y: Math.min(maxY, Math.max(minY, viewport.y)),
  };
}

function getFitViewport(nodes: PositionedNode[]): NetworkViewport {
  if (nodes.length === 0) {
    return defaultViewport;
  }

  const minX = Math.min(...nodes.map((node) => node.x - node.radius - 52));
  const maxX = Math.max(...nodes.map((node) => node.x + node.radius + 52));
  const minY = Math.min(...nodes.map((node) => node.y - node.radius - 38));
  const maxY = Math.max(...nodes.map((node) => node.y + node.radius + 38));
  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);
  const scale = Math.min(
    1.35,
    Math.max(minViewportScale, Math.min((viewBoxWidth - 64) / contentWidth, (viewBoxHeight - 64) / contentHeight)),
  );

  return clampViewport({
    scale,
    x: viewBoxWidth / 2 - ((minX + maxX) / 2) * scale,
    y: viewBoxHeight / 2 - ((minY + maxY) / 2) * scale,
  });
}

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

function getHeatmapKey(participantId: string, periodId: string) {
  return `${participantId}::${periodId}`;
}

function buildParticipantHeatmap(
  battles: Battle[],
  rows: ParticipantNetworkNode[],
): ParticipantHeatmap {
  const visibleParticipantIds = new Set(rows.map((row) => row.id));
  const cells = new Map<string, number>();
  const years = battles.map((battle) => battle.year);

  if (years.length === 0) {
    return { rows, columns: [], cells, maxCount: 1 };
  }

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const periodWidth = Math.max(1, Math.ceil((maxYear - minYear + 1) / heatmapColumnLimit));
  const columns = Array.from(
    { length: Math.ceil((maxYear - minYear + 1) / periodWidth) },
    (_, index) => {
      const start = minYear + index * periodWidth;
      const end = Math.min(maxYear, start + periodWidth - 1);
      return {
        id: `${start}-${end}`,
        name: start === end ? String(start) : `${start}-${end}`,
        count: 0,
        start,
        end,
      };
    },
  );

  for (const battle of battles) {
    const visibleParticipants = battle.participants.filter((participantId) => visibleParticipantIds.has(participantId));

    if (visibleParticipants.length === 0) {
      continue;
    }

    const column = columns.find((period) => battle.year >= period.start && battle.year <= period.end);
    if (!column) {
      continue;
    }
    column.count += visibleParticipants.length;

    for (const participantId of visibleParticipants) {
      const key = getHeatmapKey(participantId, column.id);
      cells.set(key, (cells.get(key) ?? 0) + 1);
    }
  }

  let maxCount = 1;
  for (const count of cells.values()) {
    maxCount = Math.max(maxCount, count);
  }

  return {
    rows,
    columns: columns.map(({ id, name, count }) => ({ id, name, count })),
    cells,
    maxCount,
  };
}

function getHeatmapFill(count: number, maxCount: number) {
  if (count === 0) {
    return "rgba(241, 245, 244, 0.045)";
  }

  const intensity = Math.sqrt(count / maxCount);
  return `rgba(94, 211, 198, ${0.14 + intensity * 0.78})`;
}

function getParticipantDetail(
  participantId: string,
  battles: Battle[],
  participantNames: Map<string, string>,
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
    relation: edge.relation,
    allyCount: edge.allyWeight,
    opponentCount: edge.opponentWeight,
    cooccurrenceCount: edge.cooccurrenceWeight,
    yearRange: formatYearRange(sharedBattles),
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
  participants,
  selectedParticipant,
  highlightedParticipantIds,
  onSelectParticipant,
  onSelectBattle,
  onResetFilters,
}: NetworkViewProps) {
  const [inspectedEdgeKey, setInspectedEdgeKey] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"network" | "matrix">("network");
  const [viewport, setViewport] = useState<NetworkViewport>(defaultViewport);
  const [tooltip, setTooltip] = useState<NetworkTooltip | null>(null);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantOptionsOpen, setParticipantOptionsOpen] = useState(false);
  const [activeParticipantOption, setActiveParticipantOption] = useState(0);
  const networkStageRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  const participantNames = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant.name])),
    [participants],
  );
  const network = useMemo(
    () => buildParticipantNetwork(battles, maxVisibleNodes, { focusedParticipantId: selectedParticipant }),
    [battles, selectedParticipant],
  );
  const nodes = useMemo(() => positionNodes(network.nodes, selectedParticipant), [network.nodes, selectedParticipant]);
  const fitViewport = useMemo(() => getFitViewport(nodes), [nodes]);
  const heatmapRows = useMemo(
    () => network.nodes.slice(0, heatmapRowLimit),
    [network.nodes],
  );
  const participantHeatmap = useMemo(
    () => buildParticipantHeatmap(battles, heatmapRows),
    [battles, heatmapRows],
  );
  const visibleLabelNodeIds = useMemo(
    () => new Set(network.nodes.slice(0, visibleLabelLimit).map((node) => node.id)),
    [network.nodes],
  );
  const nodeLookup = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const participantFlags = useMemo(
    () =>
      new Map(
        network.nodes.map((node) => {
          const participantName = getParticipantName(node.id, participantNames);
          const participantYears = battles
            .filter((battle) => battle.participants.includes(node.id))
            .map((battle) => battle.year);
          return [node.id, resolveDominantHistoricalFlag(participantName, participantYears)] as const;
        }),
      ),
    [battles, network.nodes, participantNames],
  );
  const edges = network.edges.slice(0, maxVisibleEdges);
  const maxEdgeWeight = Math.max(1, ...edges.map((edge) => edge.weight));
  const selectionVisible = selectedParticipant ? nodeLookup.has(selectedParticipant) : false;
  const highlightedParticipantIdSet = useMemo(
    () => new Set(highlightedParticipantIds),
    [highlightedParticipantIds],
  );
  const highlightedParticipantKey = highlightedParticipantIds.slice().sort().join("|");
  const selectedParticipantName = selectedParticipant ? getParticipantName(selectedParticipant, participantNames) : null;
  const visibleParticipantOptions = useMemo(() => {
    const query = participantSearch.trim().toLowerCase();
    return participants
      .filter((participant) =>
        !query ||
        participant.name.toLowerCase().includes(query) ||
        participant.id.toLowerCase().includes(query))
      .slice(0, 12);
  }, [participantSearch, participants]);
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
        ? getParticipantDetail(
            selectedParticipant,
            battles,
            participantNames,
            network.nodes.find((node) => node.id === selectedParticipant),
          )
        : null,
    [battles, network.nodes, participantNames, selectedParticipant],
  );
  const inspectedEdge = useMemo(
    () => edges.find((edge) => getEdgeKey(edge.source, edge.target) === inspectedEdgeKey) ?? null,
    [edges, inspectedEdgeKey],
  );
  const inspectedEdgeDetail = useMemo(
    () => inspectedEdge ? getEdgeDetail(inspectedEdge, battles, participantNames) : null,
    [battles, inspectedEdge, participantNames],
  );

  useEffect(() => {
    if (!inspectedEdgeKey) {
      return;
    }

    if (!edges.some((edge) => getEdgeKey(edge.source, edge.target) === inspectedEdgeKey)) {
      setInspectedEdgeKey(null);
    }
  }, [edges, inspectedEdgeKey]);

  useEffect(() => {
    setViewport(fitViewport);
    setTooltip(null);
  }, [activeView, battles, fitViewport]);

  useEffect(() => {
    setViewport(fitViewport);
  }, [fitViewport, highlightedParticipantKey, selectedParticipant]);

  useEffect(() => {
    setParticipantSearch(selectedParticipantName ?? "");
    setParticipantOptionsOpen(false);
  }, [selectedParticipantName]);

  function selectParticipantOption(participantId: string | null) {
    onSelectParticipant(participantId);
    setParticipantOptionsOpen(false);
    setActiveParticipantOption(0);
  }

  function handleParticipantSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setParticipantOptionsOpen(true);
      setActiveParticipantOption((index) => Math.min(index + 1, visibleParticipantOptions.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveParticipantOption((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && participantOptionsOpen && visibleParticipantOptions.length > 0) {
      event.preventDefault();
      selectParticipantOption(visibleParticipantOptions[activeParticipantOption]?.id ?? null);
    }
    if (event.key === "Escape") {
      setParticipantOptionsOpen(false);
      setParticipantSearch(selectedParticipantName ?? "");
    }
  }

  function showTooltip(
    event: ReactPointerEvent<SVGElement>,
    title: string,
    lines: string[],
  ) {
    const bounds = networkStageRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    setTooltip({
      x: Math.min(Math.max(event.clientX - bounds.left + 12, 12), bounds.width - 260),
      y: Math.min(Math.max(event.clientY - bounds.top + 12, 12), bounds.height - 120),
      title,
      lines,
    });
  }

  function zoomViewport(factor: number, focalPoint = { x: centerX, y: centerY }) {
    setViewport((current) => {
      const scale = Math.min(maxViewportScale, Math.max(minViewportScale, current.scale * factor));
      const ratio = scale / current.scale;

      return clampViewport({
        scale,
        x: focalPoint.x - (focalPoint.x - current.x) * ratio,
        y: focalPoint.y - (focalPoint.y - current.y) * ratio,
      });
    });
  }

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const focalPoint = {
      x: ((event.clientX - bounds.left) / bounds.width) * viewBoxWidth,
      y: ((event.clientY - bounds.top) / bounds.height) * viewBoxHeight,
    };
    zoomViewport(event.deltaY < 0 ? 1.12 : 0.89, focalPoint);
  }

  function handlePanStart(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    panStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: viewport.x,
      y: viewport.y,
    };
  }

  function handlePanMove(event: ReactPointerEvent<SVGSVGElement>) {
    const panStart = panStartRef.current;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!panStart || bounds.width === 0 || bounds.height === 0) {
      return;
    }

    setViewport((current) => clampViewport({
      ...current,
      x: panStart.x + ((event.clientX - panStart.clientX) / bounds.width) * viewBoxWidth,
      y: panStart.y + ((event.clientY - panStart.clientY) / bounds.height) * viewBoxHeight,
    }));
  }

  function handlePanEnd(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panStartRef.current = null;
  }

  return (
    <section id="network-view" className="view-panel network-panel">
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
      <div className="participant-combobox">
        <label htmlFor="participant-network-search">聚焦参战方</label>
        <div className="participant-combobox-control">
          <Search size={16} />
          <input
            id="participant-network-search"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={participantOptionsOpen}
            aria-controls="participant-network-options"
            aria-activedescendant={
              participantOptionsOpen && visibleParticipantOptions[activeParticipantOption]
                ? `participant-option-${visibleParticipantOptions[activeParticipantOption].id}`
                : undefined
            }
            value={participantSearch}
            placeholder="搜索国家或历史政权"
            onFocus={() => setParticipantOptionsOpen(true)}
            onChange={(event) => {
              setParticipantSearch(event.target.value);
              setParticipantOptionsOpen(true);
              setActiveParticipantOption(0);
            }}
            onKeyDown={handleParticipantSearchKeyDown}
          />
          {selectedParticipant || participantSearch ? (
            <button
              type="button"
              title="清除参战方选择"
              onClick={() => {
                setParticipantSearch("");
                selectParticipantOption(null);
              }}
            >
              <X size={15} />
            </button>
          ) : null}
        </div>
        {participantOptionsOpen ? (
          <ul id="participant-network-options" className="participant-combobox-options" role="listbox">
            {visibleParticipantOptions.length > 0 ? visibleParticipantOptions.map((participant, index) => (
              <li
                id={`participant-option-${participant.id}`}
                key={participant.id}
                role="option"
                aria-selected={participant.id === selectedParticipant}
                className={index === activeParticipantOption ? "active" : ""}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectParticipantOption(participant.id)}
              >
                <span>{participant.name}</span>
                <small>{participant.id}</small>
              </li>
            )) : (
              <li className="empty" aria-disabled="true">没有匹配的参战方</li>
            )}
          </ul>
        ) : null}
      </div>
      {nodes.length === 0 ? (
        <div className="empty-state empty-state-with-action">
          <p>
            {selectedParticipantName
              ? `${selectedParticipantName} 在当前年份范围内没有可展示的网络事件。`
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
          <div className="network-view-switcher" role="tablist" aria-label="关系视图模式">
            <button
              className={activeView === "network" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeView === "network"}
              onClick={() => setActiveView("network")}
            >
              <Waypoints size={16} />
              关系网络
            </button>
            <button
              className={activeView === "matrix" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeView === "matrix"}
              onClick={() => setActiveView("matrix")}
            >
              <Grid3X3 size={16} />
              事件矩阵
            </button>
          </div>
          <div className="network-visual-grid network-single-view">
            {activeView === "network" ? <div ref={networkStageRef} className="network-stage">
              <div className="network-toolbar" aria-label="网络画布控制">
                <button type="button" onClick={() => zoomViewport(1.2)} title="放大网络">
                  <ZoomIn size={17} />
                </button>
                <button type="button" onClick={() => zoomViewport(0.84)} title="缩小网络">
                  <ZoomOut size={17} />
                </button>
                <button type="button" onClick={() => setViewport(fitViewport)} title="适配当前网络内容">
                  <Maximize2 size={17} />
                </button>
                <button type="button" onClick={() => setViewport(defaultViewport)} title="重置网络视图">
                  <RotateCcw size={17} />
                </button>
                <output>{Math.round(viewport.scale * 100)}%</output>
              </div>
              <svg
                className="network-svg"
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                role="img"
                aria-label="参战方共现网络"
                onWheel={handleWheel}
                onPointerDown={handlePanStart}
                onPointerMove={handlePanMove}
                onPointerUp={handlePanEnd}
                onPointerCancel={handlePanEnd}
              >
                <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
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
                    const edgeOpacity = connectedToSelection
                      ? 0.28 + (edge.weight / maxEdgeWeight) * 0.62
                      : 0.08;
                    const highlightedByEvent =
                      highlightedParticipantIdSet.has(edge.source) && highlightedParticipantIdSet.has(edge.target);

                    return (
                      <line
                        key={edgeKey}
                        className={[
                          connectedToSelection ? `network-edge ${edge.relation}` : `network-edge ${edge.relation} muted`,
                          inspectedEdgeKey === edgeKey ? "active" : "",
                          highlightedByEvent ? "event-highlighted" : "",
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
                        onPointerEnter={(event) =>
                          showTooltip(event, `${edgeDetail.sourceName} + ${edgeDetail.targetName}`, [
                            `${getRelationLabel(edge.relation)} · ${edge.weight} 次相关事件`,
                            `同阵营 ${edgeDetail.allyCount} / 对立 ${edgeDetail.opponentCount} / 普通共现 ${edgeDetail.cooccurrenceCount}`,
                            `年份 ${edgeDetail.yearRange}`,
                          ])
                        }
                        onPointerMove={(event) =>
                          showTooltip(event, `${edgeDetail.sourceName} + ${edgeDetail.targetName}`, [
                            `${getRelationLabel(edge.relation)} · ${edge.weight} 次相关事件`,
                            `同阵营 ${edgeDetail.allyCount} / 对立 ${edgeDetail.opponentCount} / 普通共现 ${edgeDetail.cooccurrenceCount}`,
                            `年份 ${edgeDetail.yearRange}`,
                          ])
                        }
                        onPointerLeave={() => setTooltip(null)}
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
                    const participantFlag = participantFlags.get(node.id);
                    const muted = selectionVisible && !focusedNodeIds.has(node.id);
                    const inspected =
                      inspectedEdge && (inspectedEdge.source === node.id || inspectedEdge.target === node.id);
                    const highlightedByEvent = highlightedParticipantIdSet.has(node.id);
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
                          highlightedByEvent ? "event-highlighted" : "",
                        ].join(" ")}
                        role="button"
                        tabIndex={0}
                        aria-label={`${participantName}：${getSideLabel(node.side)}，${node.eventCount} 条冲突事件`}
                        aria-pressed={selected}
                        onClick={() => onSelectParticipant(selected ? null : node.id)}
                        onPointerEnter={(event) =>
                          showTooltip(event, participantName, [
                            `${getSideLabel(node.side)} · ${node.eventCount} 条事件`,
                            `胜方 ${node.winnerCount} / 败方 ${node.loserCount} / 未判定 ${node.neutralCount}`,
                            highlightedByEvent ? "属于当前选中事件" : "点击可筛选此参战方",
                          ])
                        }
                        onPointerMove={(event) =>
                          showTooltip(event, participantName, [
                            `${getSideLabel(node.side)} · ${node.eventCount} 条事件`,
                            `胜方 ${node.winnerCount} / 败方 ${node.loserCount} / 未判定 ${node.neutralCount}`,
                            highlightedByEvent ? "属于当前选中事件" : "点击可筛选此参战方",
                          ])
                        }
                        onPointerLeave={() => setTooltip(null)}
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
                        {participantFlag ? (
                          <foreignObject
                            className="network-node-flag"
                            x={node.x - node.radius + 4}
                            y={node.y - node.radius + 4}
                            width={Math.max(1, node.radius * 2 - 8)}
                            height={Math.max(1, node.radius * 2 - 8)}
                          >
                            <div className="network-node-flag-shell">
                              {participantFlag.src ? (
                                <img src={participantFlag.src} alt="" />
                              ) : (
                                <span
                                  className={`country-flag flag-iso-${participantFlag.isoCode ?? ""}`}
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </foreignObject>
                        ) : null}
                        {participantFlag ? (
                          <rect
                            className="network-node-count-badge"
                            x={node.x - Math.max(11, String(node.eventCount).length * 4 + 4)}
                            y={node.y + node.radius * 0.22}
                            width={Math.max(22, String(node.eventCount).length * 8 + 8)}
                            height={14}
                            rx={7}
                          />
                        ) : null}
                        <text
                          className={participantFlag ? "network-node-count with-flag" : "network-node-count"}
                          x={node.x}
                          y={participantFlag ? node.y + node.radius * 0.22 + 10 : node.y + 4}
                          textAnchor="middle"
                        >
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
                </g>
              </svg>
              {tooltip ? (
                <div className="network-tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="status">
                  <strong>{tooltip.title}</strong>
                  {tooltip.lines.map((line) => <span key={line}>{line}</span>)}
                </div>
              ) : null}
            </div> : null}
            {activeView === "matrix" && participantHeatmap.rows.length > 0 && participantHeatmap.columns.length > 0 ? (
              <div className="network-heatmap-panel">
                <div className="network-heatmap-heading">
                  <h3>参战方-年份阶段事件热力图</h3>
                  <span>颜色越深表示事件数越多</span>
                </div>
                <svg
                  className="participant-heatmap-svg"
                  viewBox={`0 0 ${
                    heatmapLeftMargin + participantHeatmap.columns.length * heatmapCellSize + heatmapRightMargin
                  } ${heatmapTopMargin + participantHeatmap.rows.length * heatmapCellSize + heatmapBottomMargin}`}
                  role="img"
                  aria-label="参战方和年份阶段事件数热力图"
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
                      <stop offset="0%" stopColor="rgba(94, 211, 198, 0.1)" />
                      <stop offset="100%" stopColor="rgba(94, 211, 198, 0.94)" />
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
            边宽按相关事件数相对缩放，越粗表示两个参战方共同出现或处于关联阵营的事件越多。
            节点颜色与边类别优先使用 winner/loser 字段判断；缺少阵营信息时保留为未判定或普通共现。
            {selectedParticipant && selectionVisible
              ? ` 已聚焦 ${selectedParticipantName} 及其最强一阶邻居。`
              : ""}
            {selectedParticipant && !selectionVisible && nodes.length > 0
              ? ` ${selectedParticipantName} 当前不在可见网络中，请调整年份范围。`
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
                  </dl>
                  <ul className="network-sample-events">
                    {selectedParticipantDetail.sampleEvents.map((battle) => (
                      <li key={battle.id}>
                        <button type="button" onClick={() => onSelectBattle(battle.id)}>
                          {battle.year}: {battle.name}
                        </button>
                      </li>
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
                  </dl>
                  <ul className="network-sample-events">
                    {inspectedEdgeDetail.sampleEvents.map((battle) => (
                      <li key={battle.id}>
                        <button type="button" onClick={() => onSelectBattle(battle.id)}>
                          {battle.year}: {battle.name}
                        </button>
                      </li>
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
