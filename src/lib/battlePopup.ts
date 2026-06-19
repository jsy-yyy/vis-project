import type { Battle } from "../types/domain";

export type PopupSide = {
  name: string;
  role: "winner" | "loser";
  flag: FlagAsset | null;
  fallbackCode: string;
};

export type FlagAsset = {
  id: string;
  src: string;
  isoCode?: string;
  label: string;
};

export type BattlePopupModel = {
  title: string;
  type: string;
  meta: string;
  result: string | null;
  winner: PopupSide | null;
  loser: PopupSide | null;
  hasReliableSides: boolean;
};

type FlagRule = {
  keys: string[];
  from?: number;
  to?: number;
  flag: FlagAsset;
};

const flagAssets = {
  austriaHungary: { id: "austria-hungary", src: "/flags/austria-hungary.svg", label: "Austria-Hungary flag" },
  chinaPrC: { id: "china-prc", src: "/flags/china-prc.svg", label: "People's Republic of China flag" },
  chinaQing: { id: "china-qing", src: "/flags/china-qing.svg", label: "Qing China flag" },
  chinaRoc: { id: "china-roc", src: "/flags/china-roc.svg", label: "Republic of China flag" },
  france: { id: "france", src: "/flags/france.svg", label: "France flag" },
  germanyEmpire: { id: "germany-empire", src: "/flags/germany-empire.svg", label: "German Empire flag" },
  germanyModern: { id: "germany-modern", src: "/flags/germany-modern.svg", label: "Germany flag" },
  italy: { id: "italy", src: "/flags/italy.svg", label: "Italy flag" },
  italyKingdom: { id: "italy-kingdom", src: "/flags/italy-kingdom.svg", label: "Kingdom of Italy flag" },
  japan: { id: "japan", src: "/flags/japan.svg", label: "Japan flag" },
  ottoman: { id: "ottoman", src: "/flags/ottoman.svg", label: "Ottoman Empire flag" },
  prussia: { id: "prussia", src: "/flags/prussia.svg", label: "Prussia flag" },
  russia: { id: "russia", src: "/flags/russia.svg", label: "Russia flag" },
  turkey: { id: "turkey", src: "/flags/turkey.svg", label: "Turkey flag" },
  uk: { id: "united-kingdom", src: "/flags/united-kingdom.svg", label: "United Kingdom flag" },
  usa: { id: "united-states", src: "/flags/united-states.svg", label: "United States flag" },
  ussr: { id: "ussr", src: "/flags/ussr.svg", label: "Soviet Union flag" },
  freeFrance: { id: "free-france", src: "/flags/free-france.svg", label: "Free France flag" },
  orangeFreeState: {
    id: "orange-free-state",
    src: "/flags/orange-free-state.svg",
    label: "Orange Free State flag",
  },
  southVietnam: { id: "south-vietnam", src: "/flags/south-vietnam.svg", label: "South Vietnam flag" },
  transvaal: { id: "transvaal", src: "/flags/transvaal.svg", label: "South African Republic flag" },
  yugoslaviaKingdom: {
    id: "yugoslavia-kingdom",
    src: "/flags/yugoslavia-kingdom.svg",
    label: "Kingdom of Yugoslavia flag",
  },
  yugoslaviaSocialist: {
    id: "yugoslavia-socialist",
    src: "/flags/yugoslavia-socialist.svg",
    label: "Socialist Yugoslavia flag",
  },
} satisfies Record<string, FlagAsset>;

function createIsoFlag(id: string, isoCode: string, label: string): FlagAsset {
  return { id, isoCode, src: `/flags/iso/${isoCode}.svg`, label };
}

const explicitHistoricalFlags = new Map<string, FlagAsset>([
  ["ussr", flagAssets.ussr],
  ["soviet", flagAssets.ussr],
  ["soviets", flagAssets.ussr],
  ["ottoman", flagAssets.ottoman],
  ["ottoman empire", flagAssets.ottoman],
  ["austria hungary", flagAssets.austriaHungary],
  ["austro hungarian", flagAssets.austriaHungary],
]);

const flagRules: FlagRule[] = [
  { keys: ["austria hungary", "austro hungarian"], from: 1867, to: 1918, flag: flagAssets.austriaHungary },
  { keys: ["china", "chinese"], to: 1911, flag: flagAssets.chinaQing },
  { keys: ["china", "chinese"], from: 1912, to: 1948, flag: flagAssets.chinaRoc },
  { keys: ["china", "chinese"], from: 1949, flag: flagAssets.chinaPrC },
  { keys: ["france", "french"], flag: flagAssets.france },
  { keys: ["germany prussia", "prussia"], to: 1918, flag: flagAssets.prussia },
  { keys: ["german empire", "germany", "german", "germans"], to: 1948, flag: flagAssets.germanyEmpire },
  { keys: ["germany", "german", "germans", "german federal republic", "german democratic republic"], from: 1949, flag: flagAssets.germanyModern },
  { keys: ["italy", "italian", "italians", "kingdom of italy", "italy sardinia"], to: 1946, flag: flagAssets.italyKingdom },
  { keys: ["italy", "italian", "italians"], from: 1946, flag: flagAssets.italy },
  { keys: ["japan", "japanese"], flag: flagAssets.japan },
  { keys: ["ottoman", "ottoman empire", "turkey", "turkish", "turks", "turkey ottoman empire"], to: 1922, flag: flagAssets.ottoman },
  { keys: ["turkey", "turkish", "turks"], from: 1923, flag: flagAssets.turkey },
  { keys: ["russia", "russian", "russians", "russia soviet union"], to: 1917, flag: flagAssets.russia },
  { keys: ["russia", "russian", "russians", "ussr", "soviet", "soviets", "russia soviet union"], from: 1922, to: 1991, flag: flagAssets.ussr },
  { keys: ["russia", "russian", "russians"], from: 1991, flag: flagAssets.russia },
  { keys: ["united kingdom", "british", "britain"], flag: flagAssets.uk },
  { keys: ["united states", "united states of america", "america", "american", "americans", "usa"], flag: flagAssets.usa },
  { keys: ["free france"], from: 1940, to: 1944, flag: flagAssets.freeFrance },
  { keys: ["vichy france"], from: 1940, to: 1944, flag: flagAssets.france },
  { keys: ["transvaal"], from: 1852, to: 1902, flag: flagAssets.transvaal },
  { keys: ["orange free state"], from: 1854, to: 1902, flag: flagAssets.orangeFreeState },
  { keys: ["north vietnam"], from: 1945, to: 1976, flag: createIsoFlag("north-vietnam", "vn", "North Vietnam flag") },
  { keys: ["south vietnam"], from: 1948, to: 1975, flag: flagAssets.southVietnam },
  { keys: ["yugoslavia"], to: 1945, flag: flagAssets.yugoslaviaKingdom },
  { keys: ["yugoslavia"], from: 1946, to: 1992, flag: flagAssets.yugoslaviaSocialist },
  { keys: ["czechoslovakia"], from: 1918, to: 1992, flag: createIsoFlag("czechoslovakia", "cz", "Czechoslovakia flag") },
  { keys: ["korea"], to: 1945, flag: createIsoFlag("korea", "kr", "Korean flag") },
  { keys: ["afghanistan"], flag: createIsoFlag("afghanistan", "af", "Afghanistan flag") },
  { keys: ["algeria"], flag: createIsoFlag("algeria", "dz", "Algeria flag") },
  { keys: ["argentina"], flag: createIsoFlag("argentina", "ar", "Argentina flag") },
  { keys: ["australia"], flag: createIsoFlag("australia", "au", "Australia flag") },
  { keys: ["austria"], flag: createIsoFlag("austria", "at", "Austria flag") },
  { keys: ["belgium"], flag: createIsoFlag("belgium", "be", "Belgium flag") },
  { keys: ["benin"], flag: createIsoFlag("benin", "bj", "Benin flag") },
  { keys: ["bolivia"], flag: createIsoFlag("bolivia", "bo", "Bolivia flag") },
  { keys: ["bulgaria"], flag: createIsoFlag("bulgaria", "bg", "Bulgaria flag") },
  { keys: ["canada"], flag: createIsoFlag("canada", "ca", "Canada flag") },
  { keys: ["chad"], flag: createIsoFlag("chad", "td", "Chad flag") },
  { keys: ["croatia"], flag: createIsoFlag("croatia", "hr", "Croatia flag") },
  { keys: ["cuba"], flag: createIsoFlag("cuba", "cu", "Cuba flag") },
  { keys: ["egypt"], flag: createIsoFlag("egypt", "eg", "Egypt flag") },
  { keys: ["eritrea"], flag: createIsoFlag("eritrea", "er", "Eritrea flag") },
  { keys: ["estonia"], flag: createIsoFlag("estonia", "ee", "Estonia flag") },
  { keys: ["ethiopia"], flag: createIsoFlag("ethiopia", "et", "Ethiopia flag") },
  { keys: ["finland"], flag: createIsoFlag("finland", "fi", "Finland flag") },
  { keys: ["greece"], flag: createIsoFlag("greece", "gr", "Greece flag") },
  { keys: ["honduras"], flag: createIsoFlag("honduras", "hn", "Honduras flag") },
  { keys: ["hungary"], flag: createIsoFlag("hungary", "hu", "Hungary flag") },
  { keys: ["india"], flag: createIsoFlag("india", "in", "India flag") },
  { keys: ["indonesia"], flag: createIsoFlag("indonesia", "id", "Indonesia flag") },
  { keys: ["iran"], flag: createIsoFlag("iran", "ir", "Iran flag") },
  { keys: ["iraq"], flag: createIsoFlag("iraq", "iq", "Iraq flag") },
  { keys: ["ireland", "irish free state"], flag: createIsoFlag("ireland", "ie", "Ireland flag") },
  { keys: ["israel"], flag: createIsoFlag("israel", "il", "Israel flag") },
  { keys: ["jordan", "arab legion"], flag: createIsoFlag("jordan", "jo", "Jordan flag") },
  { keys: ["lebanon"], flag: createIsoFlag("lebanon", "lb", "Lebanon flag") },
  { keys: ["libya"], flag: createIsoFlag("libya", "ly", "Libya flag") },
  { keys: ["madagascar"], flag: createIsoFlag("madagascar", "mg", "Madagascar flag") },
  { keys: ["mexico"], flag: createIsoFlag("mexico", "mx", "Mexico flag") },
  { keys: ["morocco"], flag: createIsoFlag("morocco", "ma", "Morocco flag") },
  { keys: ["netherlands"], flag: createIsoFlag("netherlands", "nl", "Netherlands flag") },
  { keys: ["new zealand"], flag: createIsoFlag("new-zealand", "nz", "New Zealand flag") },
  { keys: ["nicaragua"], flag: createIsoFlag("nicaragua", "ni", "Nicaragua flag") },
  { keys: ["nigeria"], flag: createIsoFlag("nigeria", "ng", "Nigeria flag") },
  { keys: ["north korea"], from: 1948, flag: createIsoFlag("north-korea", "kp", "North Korea flag") },
  { keys: ["norway"], flag: createIsoFlag("norway", "no", "Norway flag") },
  { keys: ["pakistan"], flag: createIsoFlag("pakistan", "pk", "Pakistan flag") },
  { keys: ["paraguay"], flag: createIsoFlag("paraguay", "py", "Paraguay flag") },
  { keys: ["philippines"], flag: createIsoFlag("philippines", "ph", "Philippines flag") },
  { keys: ["poland"], flag: createIsoFlag("poland", "pl", "Poland flag") },
  { keys: ["portugal"], flag: createIsoFlag("portugal", "pt", "Portugal flag") },
  { keys: ["romania", "rumania"], flag: createIsoFlag("romania", "ro", "Romania flag") },
  { keys: ["saudi arabia"], flag: createIsoFlag("saudi-arabia", "sa", "Saudi Arabia flag") },
  { keys: ["serbia"], flag: createIsoFlag("serbia", "rs", "Serbia flag") },
  { keys: ["somalia"], flag: createIsoFlag("somalia", "so", "Somalia flag") },
  { keys: ["south africa"], flag: createIsoFlag("south-africa", "za", "South Africa flag") },
  { keys: ["south korea"], from: 1948, flag: createIsoFlag("south-korea", "kr", "South Korea flag") },
  { keys: ["spain"], flag: createIsoFlag("spain", "es", "Spain flag") },
  { keys: ["sudan"], flag: createIsoFlag("sudan", "sd", "Sudan flag") },
  { keys: ["syria"], flag: createIsoFlag("syria", "sy", "Syria flag") },
  { keys: ["tunisia"], flag: createIsoFlag("tunisia", "tn", "Tunisia flag") },
  { keys: ["vietnam"], from: 1976, flag: createIsoFlag("vietnam", "vn", "Vietnam flag") },
];

const neutralFlagFallbacks = new Map<string, FlagAsset>([
  ["russia", flagAssets.russia],
  ["russian", flagAssets.russia],
  ["russians", flagAssets.russia],
  ["turkey", flagAssets.turkey],
  ["turkish", flagAssets.turkey],
  ["turks", flagAssets.turkey],
]);

export function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeFlagKey(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getFlagKeys(value: string) {
  const rawKey = normalizeFlagKey(value);
  const strippedKey = normalizeFlagKey(value.replace(/\([^)]*\)/g, " "));
  return Array.from(new Set([rawKey, strippedKey].filter(Boolean)));
}

function isYearInRule(year: number, rule: FlagRule) {
  return (rule.from === undefined || year >= rule.from) && (rule.to === undefined || year <= rule.to);
}

export function resolveHistoricalFlag(name: string, year: number): FlagAsset | null {
  const keys = getFlagKeys(name);
  const explicitFlag = keys.map((key) => explicitHistoricalFlags.get(key)).find(Boolean);
  if (explicitFlag) {
    return explicitFlag;
  }

  const rule = flagRules.find(
    (item) => isYearInRule(year, item) && keys.some((key) => item.keys.includes(key)),
  );
  if (rule) {
    return rule.flag;
  }

  return keys.map((key) => neutralFlagFallbacks.get(key)).find(Boolean) ?? null;
}

export function resolveDominantHistoricalFlag(name: string, years: number[]): FlagAsset | null {
  const candidates = new Map<string, { flag: FlagAsset; count: number; latestYear: number }>();

  for (const year of years) {
    const flag = resolveHistoricalFlag(name, year);
    if (!flag) {
      continue;
    }

    const current = candidates.get(flag.id);
    candidates.set(flag.id, {
      flag,
      count: (current?.count ?? 0) + 1,
      latestYear: Math.max(current?.latestYear ?? year, year),
    });
  }

  return Array.from(candidates.values())
    .sort((left, right) => right.count - left.count || right.latestYear - left.latestYear)[0]?.flag ?? null;
}

function getSideActor(battle: Battle, role: "winner" | "loser") {
  return battle.actors?.find(
    (actor) =>
      actor.role === role &&
      actor.status !== "ambiguous" &&
      actor.status !== "unmapped" &&
      ["country", "empire", "alliance"].includes(actor.type),
  );
}

function getFallbackCode(name: string) {
  const words = name
    .replace(/\([^)]*\)/g, " ")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function getPopupSide(battle: Battle, role: "winner" | "loser"): PopupSide | null {
  const actor = getSideActor(battle, role);
  const names = role === "winner" ? battle.winnerNames : battle.loserNames;
  const name = actor ? actor.mapTarget || actor.name : names?.[0];
  if (!name) {
    return null;
  }

  return {
    name,
    role,
    flag: resolveHistoricalFlag(actor?.name || actor?.rawName || name, battle.year),
    fallbackCode: getFallbackCode(name),
  };
}

export function getBattlePopupModel(battle: Battle): BattlePopupModel {
  const winner = getPopupSide(battle, "winner");
  const loser = getPopupSide(battle, "loser");
  const time = battle.endDate ? `${battle.startDate ?? battle.year} 至 ${battle.endDate}` : battle.startDate ?? String(battle.year);
  const meta = [time, battle.locationName].filter(Boolean).join(" · ");

  return {
    title: battle.name,
    type: battle.type ?? "冲突事件",
    meta,
    result: battle.result ?? null,
    winner,
    loser,
    hasReliableSides: Boolean(winner && loser),
  };
}

function getSideHtml(side: PopupSide, label: string) {
  const visual = side.flag
    ? `<img class="battle-popup-flag" src="${escapeHtml(side.flag.src)}" alt="${escapeHtml(side.flag.label)}" />`
    : `<span class="battle-popup-flag-fallback" aria-hidden="true">${escapeHtml(side.fallbackCode)}</span>`;

  return `
    <div class="battle-popup-side ${side.role}">
      ${visual}
      <strong>${escapeHtml(side.name)}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

export function getBattlePopupHtml(battle: Battle) {
  const model = getBattlePopupModel(battle);

  const sidesHtml = model.hasReliableSides && model.winner && model.loser
    ? `
      <div class="battle-popup-matchup">
        ${getSideHtml(model.winner, "Winner")}
        <div class="battle-popup-vs">VS</div>
        ${getSideHtml(model.loser, "Loser")}
      </div>
    `
    : `
      <div class="battle-popup-insufficient">
        <strong>阵营数据不足</strong>
        <span>缺少可靠胜败方或国家映射，未生成对阵条。</span>
      </div>
    `;

  const resultHtml = model.result
    ? `<p class="battle-popup-result">${escapeHtml(model.result)}</p>`
    : "";

  return `
    <article class="battle-popup-card">
      <header class="battle-popup-header">
        <div>
          <strong>${escapeHtml(model.title)}</strong>
          <span>${escapeHtml(model.meta)}</span>
        </div>
        <em>${escapeHtml(model.type)}</em>
      </header>
      ${sidesHtml}
      ${resultHtml}
    </article>
  `;
}
