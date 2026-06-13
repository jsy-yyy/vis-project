const conflictGroupNameLabels: Record<string, string> = {
  "World War I": "第一次世界大战",
  "World War II": "第二次世界大战",
  "2nd Anglo-Boer War": "第二次英布战争",
  "Vietnam War": "越南战争",
  "Korean War": "朝鲜战争",
  "Sino-Japanese War": "中日战争",
  "Russian Civil War": "俄国内战",
  "Spanish Civil War": "西班牙内战",
  "Mexican Revolution": "墨西哥革命",
  "Iran-Iraq War": "两伊战争",
  "3rd Chinese Revolutionary Civil War": "第三次中国革命内战",
  "French Colonial Wars in North Africa": "法国北非殖民战争",
  "Chaco War": "查科战争",
  "Israeli War of Independence": "以色列独立战争",
  "German Colonial Wars in Africa": "德国非洲殖民战争",
  "Russo-Japanese War": "日俄战争",
  "Spanish-American War": "美西战争",
  "2nd Chinese Revolutionary Civil War": "第二次中国革命内战",
  "Greek Civil War": "希腊内战",
  "Afghan Civil War": "阿富汗内战",
  "Civil War": "内战",
  "2nd Cuban War of Independence": "第二次古巴独立战争",
  "Philippine-American War": "美菲战争",
  "Wars of the Mad Mullah": "马德毛拉战争",
  "1st Chinese Revolutionary Civil War": "第一次中国革命内战",
  "Italo-Turkish War": "意土战争",
  "2nd Italo-Ethiopian War": "第二次意埃战争",
  "Western Sahara Wars": "西撒哈拉战争",
  "Philippines War of Independence": "菲律宾独立战争",
  "French Indo-China War": "法属印度支那战争",
  "Biafran War": "比夫拉战争",
  "Unclassified conflict": "未分类冲突",
};

const conflictGroupIdLabels: Record<string, string> = {
  "world-war-i": "第一次世界大战",
  "world-war-ii": "第二次世界大战",
  "2nd-anglo-boer-war": "第二次英布战争",
  "vietnam-war": "越南战争",
  "korean-war": "朝鲜战争",
  "sino-japanese-war": "中日战争",
  "russian-civil-war": "俄国内战",
  "spanish-civil-war": "西班牙内战",
  "mexican-revolution": "墨西哥革命",
  "iran-iraq-war": "两伊战争",
  "3rd-chinese-revolutionary-civil-war": "第三次中国革命内战",
  "french-colonial-wars-in-north-africa": "法国北非殖民战争",
  "chaco-war": "查科战争",
  "israeli-war-of-independence": "以色列独立战争",
  "german-colonial-wars-in-africa": "德国非洲殖民战争",
  "russo-japanese-war": "日俄战争",
  "spanish-american-war": "美西战争",
  "2nd-chinese-revolutionary-civil-war": "第二次中国革命内战",
  "greek-civil-war": "希腊内战",
  "afghan-civil-war": "阿富汗内战",
  "civil-war": "内战",
  "2nd-cuban-war-of-independence": "第二次古巴独立战争",
  "philippine-american-war": "美菲战争",
  "wars-of-the-mad-mullah": "马德毛拉战争",
  "1st-chinese-revolutionary-civil-war": "第一次中国革命内战",
  "italo-turkish-war": "意土战争",
  "2nd-italo-ethiopian-war": "第二次意埃战争",
  "western-sahara-wars": "西撒哈拉战争",
  "philippines-war-of-independence": "菲律宾独立战争",
  "french-indo-china-war": "法属印度支那战争",
  "biafran-war": "比夫拉战争",
  unknown: "未分类冲突",
};

const eventTypeLabels: Record<string, string> = {
  Land: "陆战",
  Sea: "海战",
  Air: "空战",
  Massacre: "屠杀事件",
  "Land and Sea": "陆海作战",
  "Land and Air": "陆空作战",
  "Sea and Air": "海空作战",
  "Air and Sea": "空海作战",
  "Land, Sea and Air": "陆海空作战",
  "Conflict event": "冲突事件",
  unknown: "未知类型",
};

export function formatConflictGroupName(name?: string | null) {
  if (!name) {
    return "未分类冲突";
  }

  // HCED 中的冲突组名称是原始数据字段；未收录译名时保留原文，避免误译专有名词。
  return conflictGroupNameLabels[name] ?? name;
}

export function formatConflictGroupId(id?: string | null) {
  if (!id) {
    return "未分类冲突";
  }

  return conflictGroupIdLabels[id] ?? id;
}

export function formatEventType(type?: string | null) {
  if (!type) {
    return "冲突事件";
  }

  return eventTypeLabels[type] ?? type;
}

export function formatOutcome(outcome?: string | null) {
  if (!outcome) {
    return "结果未知";
  }

  if (outcome === "Draw") {
    return "平局";
  }

  const victoryMatch = outcome.match(/^(.+?) over (.+)$/);
  if (victoryMatch) {
    return `${victoryMatch[1]} 战胜 ${victoryMatch[2]}`;
  }

  const indecisiveMatch = outcome.match(/^(.+?) indecisive$/);
  if (indecisiveMatch) {
    return `${indecisiveMatch[1]}：结果不明`;
  }

  return outcome;
}
