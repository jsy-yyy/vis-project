import type { Battle } from "../types/domain";

export type ParticipantNetworkNode = {
  id: string;
  eventCount: number;
};

export type ParticipantNetworkEdge = {
  source: string;
  target: string;
  weight: number;
};

export type ParticipantNetwork = {
  nodes: ParticipantNetworkNode[];
  edges: ParticipantNetworkEdge[];
};

export function buildParticipantNetwork(battles: Battle[], maxNodes = 20): ParticipantNetwork {
  const nodeCounts = new Map<string, number>();
  const edgeCounts = new Map<string, ParticipantNetworkEdge>();

  for (const battle of battles) {
    const participantIds = Array.from(new Set(battle.participants)).sort();

    for (const participantId of participantIds) {
      nodeCounts.set(participantId, (nodeCounts.get(participantId) ?? 0) + 1);
    }

    for (let leftIndex = 0; leftIndex < participantIds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < participantIds.length; rightIndex += 1) {
        const source = participantIds[leftIndex];
        const target = participantIds[rightIndex];
        const key = `${source}::${target}`;
        const existingEdge = edgeCounts.get(key);

        edgeCounts.set(key, {
          source,
          target,
          weight: (existingEdge?.weight ?? 0) + 1,
        });
      }
    }
  }

  const nodes = Array.from(nodeCounts.entries())
    .map(([id, eventCount]) => ({ id, eventCount }))
    .sort((left, right) => right.eventCount - left.eventCount || left.id.localeCompare(right.id))
    .slice(0, maxNodes);
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = Array.from(edgeCounts.values())
    .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
    .sort(
      (left, right) =>
        right.weight - left.weight ||
        left.source.localeCompare(right.source) ||
        left.target.localeCompare(right.target),
    );

  return { nodes, edges };
}
