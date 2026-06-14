import type { Battle } from "../types/domain";

export type ParticipantNetworkNode = {
  id: string;
  eventCount: number;
  winnerCount: number;
  loserCount: number;
  neutralCount: number;
  side: ParticipantNetworkSide;
};

export type ParticipantNetworkSide = "winner" | "loser" | "mixed" | "neutral";
export type ParticipantNetworkRelation = "ally" | "opponent" | "cooccurrence";

export type ParticipantNetworkEdge = {
  source: string;
  target: string;
  weight: number;
  allyWeight: number;
  opponentWeight: number;
  cooccurrenceWeight: number;
  relation: ParticipantNetworkRelation;
};

export type ParticipantNetwork = {
  nodes: ParticipantNetworkNode[];
  edges: ParticipantNetworkEdge[];
};

export type ParticipantNetworkOptions = {
  focusedParticipantId?: string | null;
};

function getEdgeRelation(leftRole?: string, rightRole?: string): ParticipantNetworkRelation {
  if (!leftRole || !rightRole || leftRole === "participant" || rightRole === "participant") {
    return "cooccurrence";
  }

  if (leftRole === "winner" && rightRole === "winner") {
    return "ally";
  }

  if (leftRole === "loser" && rightRole === "loser") {
    return "ally";
  }

  if (
    (leftRole === "winner" && rightRole === "loser") ||
    (leftRole === "loser" && rightRole === "winner")
  ) {
    return "opponent";
  }

  return "cooccurrence";
}

function getParticipantRoles(battle: Battle, participantIds: string[]) {
  const roles = new Map<string, string>();
  const participantIdSet = new Set(participantIds);

  for (const actor of battle.actors ?? []) {
    if (!actor.networkEligible || !participantIdSet.has(actor.id)) {
      continue;
    }

    // Winner/loser roles are more analytically useful than the generic
    // participant role, so they replace a participant fallback when available.
    const existingRole = roles.get(actor.id);
    if (!existingRole || existingRole === "participant") {
      roles.set(actor.id, actor.role);
    }
  }

  return roles;
}

function getDominantRelation(edge: Pick<ParticipantNetworkEdge, "allyWeight" | "opponentWeight" | "cooccurrenceWeight">) {
  if (edge.opponentWeight >= edge.allyWeight && edge.opponentWeight >= edge.cooccurrenceWeight && edge.opponentWeight > 0) {
    return "opponent";
  }

  if (edge.allyWeight >= edge.cooccurrenceWeight && edge.allyWeight > 0) {
    return "ally";
  }

  return "cooccurrence";
}

function getDominantSide(winnerCount: number, loserCount: number, neutralCount: number): ParticipantNetworkSide {
  if (winnerCount > 0 && loserCount > 0) {
    return winnerCount === loserCount ? "mixed" : winnerCount > loserCount ? "winner" : "loser";
  }

  if (winnerCount > 0) {
    return "winner";
  }

  if (loserCount > 0) {
    return "loser";
  }

  return "neutral";
}

export function buildParticipantNetwork(
  battles: Battle[],
  maxNodes = 20,
  options: ParticipantNetworkOptions = {},
): ParticipantNetwork {
  const nodeCounts = new Map<string, number>();
  const nodeRoleCounts = new Map<string, { winnerCount: number; loserCount: number; neutralCount: number }>();
  const edgeCounts = new Map<string, ParticipantNetworkEdge>();

  for (const battle of battles) {
    const participantIds = Array.from(new Set(battle.participants)).sort();
    const participantRoles = getParticipantRoles(battle, participantIds);

    for (const participantId of participantIds) {
      nodeCounts.set(participantId, (nodeCounts.get(participantId) ?? 0) + 1);
      const roleCounts = nodeRoleCounts.get(participantId) ?? {
        winnerCount: 0,
        loserCount: 0,
        neutralCount: 0,
      };
      const role = participantRoles.get(participantId);

      if (role === "winner") {
        roleCounts.winnerCount += 1;
      } else if (role === "loser") {
        roleCounts.loserCount += 1;
      } else {
        roleCounts.neutralCount += 1;
      }

      nodeRoleCounts.set(participantId, roleCounts);
    }

    for (let leftIndex = 0; leftIndex < participantIds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < participantIds.length; rightIndex += 1) {
        const source = participantIds[leftIndex];
        const target = participantIds[rightIndex];
        const key = `${source}::${target}`;
        const existingEdge = edgeCounts.get(key);
        const relation = getEdgeRelation(participantRoles.get(source), participantRoles.get(target));
        const nextEdge: ParticipantNetworkEdge = existingEdge ?? {
          source,
          target,
          weight: 0,
          allyWeight: 0,
          opponentWeight: 0,
          cooccurrenceWeight: 0,
          relation: "cooccurrence",
        };

        nextEdge.weight += 1;
        if (relation === "ally") {
          nextEdge.allyWeight += 1;
        } else if (relation === "opponent") {
          nextEdge.opponentWeight += 1;
        } else {
          nextEdge.cooccurrenceWeight += 1;
        }
        nextEdge.relation = getDominantRelation(nextEdge);
        edgeCounts.set(key, nextEdge);
      }
    }
  }

  const allNodes = Array.from(nodeCounts.entries())
    .map(([id, eventCount]) => {
      const roleCounts = nodeRoleCounts.get(id) ?? {
        winnerCount: 0,
        loserCount: 0,
        neutralCount: eventCount,
      };

      return {
        id,
        eventCount,
        ...roleCounts,
        side: getDominantSide(roleCounts.winnerCount, roleCounts.loserCount, roleCounts.neutralCount),
      };
    })
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
