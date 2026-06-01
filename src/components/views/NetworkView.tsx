import { useMemo } from "react";
import { Share2 } from "lucide-react";
import { buildParticipantNetwork } from "../../lib/networkAnalytics";
import type { ParticipantNetworkNode } from "../../lib/networkAnalytics";
import type { Battle, Participant } from "../../types/domain";

type NetworkViewProps = {
  battles: Battle[];
  participants: Participant[];
  selectedParticipant: string | null;
  onSelectParticipant: (participantId: string | null) => void;
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

function getParticipantName(participantId: string, participantNames: Map<string, string>) {
  return participantNames.get(participantId) ?? participantId;
}

function truncateLabel(label: string) {
  return label.length > 18 ? `${label.slice(0, 17)}...` : label;
}

function getNodeRadius(eventCount: number, maxEventCount: number) {
  return 12 + Math.sqrt(eventCount / Math.max(1, maxEventCount)) * 15;
}

function positionNodes(nodes: ParticipantNetworkNode[]): PositionedNode[] {
  const maxEventCount = Math.max(1, ...nodes.map((node) => node.eventCount));

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

export function NetworkView({ battles, participants, selectedParticipant, onSelectParticipant }: NetworkViewProps) {
  const participantNames = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant.name])),
    [participants],
  );
  const network = useMemo(() => buildParticipantNetwork(battles, maxVisibleNodes), [battles]);
  const nodes = useMemo(() => positionNodes(network.nodes), [network.nodes]);
  const nodeLookup = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const edges = network.edges.slice(0, maxVisibleEdges);
  const maxEdgeWeight = Math.max(1, ...edges.map((edge) => edge.weight));
  const selectionVisible = selectedParticipant ? nodeLookup.has(selectedParticipant) : false;

  return (
    <section className="view-panel network-panel">
      <div className="section-heading">
        <Share2 size={18} />
        <h2>Participant Co-occurrence Network</h2>
      </div>
      <div className="network-heading">
        <p>
          Nodes are participants. Connections mean that two participants appear in the same conflict event within the
          current filters.
        </p>
        <div className="network-legend" aria-label="Participant network legend">
          <span><i className="node" />Node size: event count</span>
          <span><i className="edge" />Line width: co-occurrence count</span>
          <span><i className="selected" />Selected participant</span>
        </div>
      </div>
      {nodes.length === 0 ? (
        <div className="empty-state">No participant network for the current filters.</div>
      ) : (
        <>
          <div className="network-stage">
            <svg
              className="network-svg"
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              role="img"
              aria-label="Participant co-occurrence network"
            >
              <g className="network-edges">
                {edges.map((edge) => {
                  const source = nodeLookup.get(edge.source);
                  const target = nodeLookup.get(edge.target);

                  if (!source || !target) {
                    return null;
                  }

                  const connectedToSelection =
                    !selectionVisible || edge.source === selectedParticipant || edge.target === selectedParticipant;

                  return (
                    <line
                      key={`${edge.source}::${edge.target}`}
                      className={connectedToSelection ? "network-edge" : "network-edge muted"}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      strokeWidth={1 + (edge.weight / maxEdgeWeight) * 5}
                    >
                      <title>
                        {getParticipantName(edge.source, participantNames)} and{" "}
                        {getParticipantName(edge.target, participantNames)}: {edge.weight} shared events
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
                      aria-label={`${participantName}: ${node.eventCount} conflict events`}
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
                        <title>{participantName}: {node.eventCount} conflict events</title>
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
            Showing the {nodes.length} most active participants and {edges.length} strongest visible connections.
            Co-occurrence does not necessarily mean alliance or opposition.
            {selectedParticipant && !selectionVisible ? " The selected participant is outside the Top 20 nodes." : ""}
          </p>
        </>
      )}
    </section>
  );
}
