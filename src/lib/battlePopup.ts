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
} satisfies Record<string, FlagAsset>;

const flagRules: FlagRule[] = [
  { keys: ["austria hungary", "austro hungarian"], from: 1867, to: 1918, flag: flagAssets.austriaHungary },
  { keys: ["china", "chinese"], to: 1911, flag: flagAssets.chinaQing },
  { keys: ["china", "chinese"], from: 1912, to: 1948, flag: flagAssets.chinaRoc },
  { keys: ["china", "chinese"], from: 1949, flag: flagAssets.chinaPrC },
  { keys: ["france", "french"], flag: flagAssets.france },
  { keys: ["germany prussia", "prussia"], to: 1918, flag: flagAssets.prussia },
  { keys: ["german empire", "germany", "german", "germans"], to: 1918, flag: flagAssets.germanyEmpire },
  { keys: ["germany", "german", "germans", "german federal republic", "german democratic republic"], from: 1949, flag: flagAssets.germanyModern },
  { keys: ["italy", "italian", "italians", "kingdom of italy", "italy sardinia"], to: 1946, flag: flagAssets.italyKingdom },
  { keys: ["italy", "italian", "italians"], from: 1946, flag: flagAssets.italy },
  { keys: ["japan", "japanese"], flag: flagAssets.japan },
  { keys: ["ottoman", "ottoman empire", "turkey ottoman empire"], to: 1922, flag: flagAssets.ottoman },
  { keys: ["turkey", "turkish", "turks"], from: 1923, flag: flagAssets.turkey },
  { keys: ["russia", "russian", "russians", "russia soviet union"], to: 1917, flag: flagAssets.russia },
  { keys: ["ussr", "soviet", "soviets", "russia soviet union"], from: 1922, to: 1991, flag: flagAssets.ussr },
  { keys: ["russia", "russian", "russians"], from: 1991, flag: flagAssets.russia },
  { keys: ["united kingdom", "british", "britain"], flag: flagAssets.uk },
  { keys: ["united states", "united states of america", "america", "american", "americans", "usa"], flag: flagAssets.usa },
];

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
  const rule = flagRules.find(
    (item) => isYearInRule(year, item) && keys.some((key) => item.keys.includes(key)),
  );
  return rule?.flag ?? null;
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
