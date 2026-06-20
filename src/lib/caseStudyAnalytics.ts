import type { Battle, YearRange } from "../types/domain";

export type CaseStudyDefinition = {
  id: string;
  label: string;
  range: YearRange;
  primaryParticipantId: string;
  comparisonParticipantId: string;
  narrative: string;
};

export type CaseStudyAnalysis = CaseStudyDefinition & {
  totalEvents: number;
  peakYear: number;
  peakCount: number;
  peakShare: number;
  topParticipants: Array<[string, number]>;
  topPairs: Array<{ source: string; target: string; count: number }>;
  topPairShare: number;
  topTypes: Array<[string, number]>;
  topTypeShare: number;
  comparison?: {
    label: string;
    eventCountDifference: number;
    eventCountPercentDifference: number | null;
    peakCountDifference: number;
  };
};

export const caseStudyDefinitions: CaseStudyDefinition[] = [
  {
    id: "world-war-ii",
    label: "World War II",
    range: [1939, 1945],
    primaryParticipantId: "germany",
    comparisonParticipantId: "united-kingdom",
    narrative: "观察 1944 年事件峰值，以及欧洲与亚太两个战区中同时增强的对抗关系。",
  },
  {
    id: "world-war-i",
    label: "World War I",
    range: [1914, 1918],
    primaryParticipantId: "germany",
    comparisonParticipantId: "united-kingdom",
    narrative: "对照法国—比利时空间集中区与奥斯曼相关区域，比较全球关系网络的结构差异。",
  },
];

function rankCounts(counts: Map<string, number>) {
  return Array.from(counts.entries()).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );
}

export function buildCaseStudyAnalysis(
  battles: Battle[],
  definition: CaseStudyDefinition,
): CaseStudyAnalysis {
  const scopedBattles = battles.filter(
    (battle) => battle.year >= definition.range[0] && battle.year <= definition.range[1],
  );
  const yearlyCounts = new Map<number, number>();
  const participantCounts = new Map<string, number>();
  const pairCounts = new Map<string, { source: string; target: string; count: number }>();
  const typeCounts = new Map<string, number>();

  for (const battle of scopedBattles) {
    yearlyCounts.set(battle.year, (yearlyCounts.get(battle.year) ?? 0) + 1);
    typeCounts.set(battle.type ?? "Unknown", (typeCounts.get(battle.type ?? "Unknown") ?? 0) + 1);

    const participantIds = Array.from(new Set(battle.participants)).sort();
    for (const participantId of participantIds) {
      participantCounts.set(participantId, (participantCounts.get(participantId) ?? 0) + 1);
    }

    for (let left = 0; left < participantIds.length; left += 1) {
      for (let right = left + 1; right < participantIds.length; right += 1) {
        const source = participantIds[left];
        const target = participantIds[right];
        const key = `${source}::${target}`;
        const current = pairCounts.get(key);
        pairCounts.set(key, { source, target, count: (current?.count ?? 0) + 1 });
      }
    }
  }

  const peak = Array.from(yearlyCounts.entries()).sort(
    (left, right) => right[1] - left[1] || left[0] - right[0],
  )[0] ?? [definition.range[0], 0];

  return {
    ...definition,
    totalEvents: scopedBattles.length,
    peakYear: peak[0],
    peakCount: peak[1],
    peakShare: scopedBattles.length > 0 ? peak[1] / scopedBattles.length : 0,
    topParticipants: rankCounts(participantCounts).slice(0, 5),
    topPairs: Array.from(pairCounts.values())
      .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source))
      .slice(0, 5),
    topTypes: rankCounts(typeCounts).slice(0, 5),
    topPairShare: scopedBattles.length > 0
      ? (Array.from(pairCounts.values()).sort(
          (left, right) => right.count - left.count || left.source.localeCompare(right.source),
        )[0]?.count ?? 0) / scopedBattles.length
      : 0,
    topTypeShare: scopedBattles.length > 0
      ? (rankCounts(typeCounts)[0]?.[1] ?? 0) / scopedBattles.length
      : 0,
  };
}

export function addCaseStudyComparisons(analyses: CaseStudyAnalysis[]): CaseStudyAnalysis[] {
  return analyses.map((analysis) => {
    const comparison = analyses.find((candidate) => candidate.id !== analysis.id);

    if (!comparison) {
      return analysis;
    }

    return {
      ...analysis,
      comparison: {
        label: comparison.label,
        eventCountDifference: analysis.totalEvents - comparison.totalEvents,
        eventCountPercentDifference:
          comparison.totalEvents > 0
            ? (analysis.totalEvents - comparison.totalEvents) / comparison.totalEvents
            : null,
        peakCountDifference: analysis.peakCount - comparison.peakCount,
      },
    };
  });
}
