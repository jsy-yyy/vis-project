export function collapseRepeatedWarSuffix(value) {
  return value.replace(/\bwar(?:\s+war)+\b/gi, "War").replace(/\s+/g, " ").trim();
}
