export function collapseRepeatedWarSuffix(value) {
  return value.replace(/\bwar(?:\s+war)+\b/gi, "War").replace(/\s+/g, " ").trim();
}

export function normalizeKnownWarTypo(value) {
  return value.replace(/\bWord War II\b/gi, "World War II");
}
