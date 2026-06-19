import { describe, expect, it } from "vitest";
import type { Battle } from "../types/domain";
import {
  escapeHtml,
  getBattlePopupHtml,
  getBattlePopupModel,
  resolveDominantHistoricalFlag,
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
    expect(resolveHistoricalFlag("Turkey", 1915)?.id).toBe("ottoman");
    expect(resolveHistoricalFlag("Turkey", 1930)?.id).toBe("turkey");
    expect(resolveHistoricalFlag("Germany", 1914)?.id).toBe("germany-empire");
    expect(resolveHistoricalFlag("Germany", 1941)?.id).toBe("germany-empire");
    expect(resolveHistoricalFlag("Germany", 1950)?.id).toBe("germany-modern");
    expect(resolveHistoricalFlag("Russia", 1941)?.id).toBe("ussr");
    expect(resolveHistoricalFlag("Russia", 1992)?.id).toBe("russia");
    expect(resolveHistoricalFlag("USSR", 1918)?.id).toBe("ussr");
    expect(resolveHistoricalFlag("Ottoman Empire", 1974)?.id).toBe("ottoman");
    expect(resolveHistoricalFlag("Austria-Hungary", 1921)?.id).toBe("austria-hungary");
    expect(resolveHistoricalFlag("Spain", 1930)).toMatchObject({
      id: "spain",
      isoCode: "es",
      src: "/flags/iso/es.svg",
    });
    expect(resolveHistoricalFlag("Serbia", 1913)).toMatchObject({
      id: "serbia",
      src: "/flags/iso/rs.svg",
    });
    expect(resolveHistoricalFlag("Bulgaria", 1913)).toMatchObject({
      id: "bulgaria",
      src: "/flags/iso/bg.svg",
    });
    expect(resolveHistoricalFlag("Greece", 1913)).toMatchObject({
      id: "greece",
      src: "/flags/iso/gr.svg",
    });
    expect(resolveHistoricalFlag("Transvaal", 1900)?.id).toBe("transvaal");
    expect(resolveHistoricalFlag("Orange Free State", 1900)?.id).toBe("orange-free-state");
    expect(resolveHistoricalFlag("North Vietnam", 1968)).toMatchObject({ id: "north-vietnam", isoCode: "vn" });
    expect(resolveHistoricalFlag("South Vietnam", 1968)?.id).toBe("south-vietnam");
  });

  it("chooses the most common historical flag in a filtered participant range", () => {
    expect(resolveDominantHistoricalFlag("Yugoslavia", [1941, 1942, 1946, 1960, 1991])?.id)
      .toBe("yugoslavia-socialist");
    expect(resolveDominantHistoricalFlag("Germany", [1914, 1916, 1941, 1944])?.id)
      .toBe("germany-empire");
    expect(resolveDominantHistoricalFlag("Tibet", [1904])).toBeNull();
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
