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

export type ParticipantNetworkOptions = {
  focusedParticipantId?: string | null;
};

export function buildParticipantNetwork(
  battles: Battle[],
  maxNodes = 20,
  options: ParticipantNetworkOptions = {},
): ParticipantNetwork {
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

  const allNodes = Array.from(nodeCounts.entries())
    .map(([id, eventCount]) => ({ id, eventCount }))
    .sort((left, right) => right.eventCount - left.eventCount || left.id.localeCompare(right.id));

  let nodes = allNodes.slice(0, maxNodes);

  if (options.focusedParticipantId && nodeCounts.has(options.focusedParticipantId)) {
    const focusedParticipantId = options.focusedParticipantId;

    // In focus mode the selected participant is the anchor. We keep only its
    // strongest one-hop neighbors so the network answers "who co-occurs with this actor?"
    // instead of hiding the actor when it is outside the global Top N list.
    const neighborScores = Array.from(edgeCounts.values())
      .filter((edge) => edge.source === focusedParticipantId || edge.target === focusedParticipantId)
      .map((edge) => {
        const neighborId = edge.source === focusedParticipantId ? edge.target : edge.source;
        return {
          id: neighborId,
          weight: edge.weight,
          eventCount: nodeCounts.get(neighborId) ?? 0,
        };
      })
      .sort(
        (left, right) =>
          right.weight - left.weight ||
          right.eventCount - left.eventCount ||
          left.id.localeCompare(right.id),
      );

    const visibleIds = new Set<string>([focusedParticipantId]);
    for (const neighbor of neighborScores) {
      if (visibleIds.size >= maxNodes) {
        break;
      }
      visibleIds.add(neighbor.id);
    }

    nodes = allNodes
      .filter((node) => visibleIds.has(node.id))
      .sort((left, right) => {
        if (left.id === focusedParticipantId) {
          return -1;
        }
        if (right.id === focusedParticipantId) {
          return 1;
        }

        const leftNeighbor = neighborScores.find((neighbor) => neighbor.id === left.id);
        const rightNeighbor = neighborScores.find((neighbor) => neighbor.id === right.id);

        return (
          (rightNeighbor?.weight ?? 0) - (leftNeighbor?.weight ?? 0) ||
          right.eventCount - left.eventCount ||
          left.id.localeCompare(right.id)
        );
      });
  }

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
