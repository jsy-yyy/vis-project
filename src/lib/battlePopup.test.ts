import { describe, expect, it } from "vitest";
import type { Battle } from "../types/domain";
import {
  escapeHtml,
  getBattlePopupHtml,
  getBattlePopupModel,
  resolveHistoricalFlag,
} from "./battlePopup";

const mechili = {
  id: "Mechili1941",
  name: "Mechili",
  warId: "world-war-ii",
  year: 1941,
  latitude: 32.1590255,
  longitude: 22.280574,
  locationName: "Mechili; Libya",
  type: "Land",
  participants: ["italy", "united-kingdom"],
  actors: [
    {
      id: "united-kingdom",
      rawName: "United Kingdom",
      name: "United Kingdom",
      role: "winner",
      type: "country",
      confidence: "medium",
      mapTarget: "United Kingdom",
      networkEligible: true,
      sourceField: "Winner",
      status: "mapped",
    },
    {
      id: "italy",
      rawName: "Italy",
      name: "Italy",
      role: "loser",
      type: "country",
      confidence: "medium",
      mapTarget: "Italy",
      networkEligible: true,
      sourceField: "Loser",
      status: "mapped",
    },
  ],
  winnerNames: ["United Kingdom"],
  loserNames: ["Italy"],
  result: "United Kingdom over Italy",
} satisfies Battle;

describe("battle popup model", () => {
  it("builds a wiki-style winner versus loser model with flags", () => {
    const model = getBattlePopupModel(mechili);

    expect(model.title).toBe("Mechili");
    expect(model.meta).toBe("1941 · Mechili; Libya");
    expect(model.winner).toMatchObject({
      name: "United Kingdom",
      flag: { id: "united-kingdom" },
    });
    expect(model.loser).toMatchObject({
      name: "Italy",
      flag: { id: "italy-kingdom" },
    });
  });

  it("resolves historical flags by country and year", () => {
    expect(resolveHistoricalFlag("Russia (Soviet Union)", 1916)?.id).toBe("russia");
    expect(resolveHistoricalFlag("Russia (Soviet Union)", 1942)?.id).toBe("ussr");
    expect(resolveHistoricalFlag("Turkey (Ottoman Empire)", 1915)?.id).toBe("ottoman");
    expect(resolveHistoricalFlag("Turkey", 1930)?.id).toBe("turkey");
    expect(resolveHistoricalFlag("Germany", 1914)?.id).toBe("germany-empire");
    expect(resolveHistoricalFlag("Germany", 1941)).toBeNull();
    expect(resolveHistoricalFlag("Germany", 1950)?.id).toBe("germany-modern");
  });

  it("uses actor names for flag lookup even when display names use map targets", () => {
    const model = getBattlePopupModel({
      ...mechili,
      id: "EasternFront1942",
      name: "Eastern Front sample",
      year: 1942,
      actors: [
        {
          ...mechili.actors[0],
          id: "russia-soviet-union",
          rawName: "Russia (Soviet Union)",
          name: "Russia (Soviet Union)",
          mapTarget: "Russia",
        },
        mechili.actors[1],
      ],
      winnerNames: ["Russia (Soviet Union)"],
    });

    expect(model.winner).toMatchObject({
      name: "Russia",
      flag: { id: "ussr" },
    });
  });

  it("does not show a matchup when winner or loser data is missing", () => {
    const html = getBattlePopupHtml({
      ...mechili,
      id: "Handan1945",
      name: "Handan",
      winnerNames: [],
      loserNames: [],
      actors: [],
      result: undefined,
    });

    expect(html).toContain("阵营数据不足");
    expect(html).not.toContain("battle-popup-vs");
  });

  it("escapes popup text before inserting HTML", () => {
    expect(escapeHtml("<img src=x onerror=alert(1)>")).toBe("&lt;img src=x onerror=alert(1)&gt;");

    const html = getBattlePopupHtml({
      ...mechili,
      name: "<Mechili>",
      locationName: "A & B",
    });

    expect(html).toContain("&lt;Mechili&gt;");
    expect(html).toContain("A &amp; B");
  });
});
