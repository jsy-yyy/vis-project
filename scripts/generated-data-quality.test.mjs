import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("generated HCED data quality", () => {
  const csv = readFileSync(resolve("public/data/hced/conflict_events.csv"), "utf8");

  it("keeps the expected event count", () => {
    expect(csv.trimEnd().split(/\r?\n/)).toHaveLength(1921);
  });

  it("does not expose the known World War II typo", () => {
    expect(csv).not.toContain(",Word War II,");
    expect(csv).toContain(",World War II,");
  });

  it("uses one Romania identity while retaining the historical map target", () => {
    expect(csv).not.toContain('""id"":""rumania""');
    expect(csv).not.toContain('""name"":""Rumania""');
    expect(csv).toContain('""id"":""romania""');
    expect(csv).toContain('""mapTarget"":""Rumania""');
  });
});
