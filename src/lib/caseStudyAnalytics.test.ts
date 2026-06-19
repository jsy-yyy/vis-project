import { describe, expect, it } from "vitest";
import type { Battle } from "../types/domain";
import { buildCaseStudyAnalysis } from "./caseStudyAnalytics";

const battles: Battle[] = [
  { id: "a", name: "A", warId: "w", year: 1940, latitude: 0, longitude: 0, participants: ["germany", "uk", "uk"], type: "Land" },
  { id: "b", name: "B", warId: "w", year: 1941, latitude: 0, longitude: 0, participants: ["germany", "uk"], type: "Sea" },
  { id: "c", name: "C", warId: "w", year: 1941, latitude: 0, longitude: 0, participants: ["japan", "usa"], type: "Land" },
];

describe("case study analytics", () => {
  it("computes peak years, deduplicated participants, pairs, and types", () => {
    const analysis = buildCaseStudyAnalysis(battles, {
      id: "sample",
      label: "Sample",
      range: [1940, 1941],
      primaryParticipantId: "germany",
      comparisonParticipantId: "uk",
      narrative: "sample",
    });

    expect(analysis.totalEvents).toBe(3);
    expect([analysis.peakYear, analysis.peakCount]).toEqual([1941, 2]);
    expect(analysis.topParticipants[0]).toEqual(["germany", 2]);
    expect(analysis.topPairs[0]).toEqual({ source: "germany", target: "uk", count: 2 });
    expect(analysis.topTypes[0]).toEqual(["Land", 2]);
  });
});
