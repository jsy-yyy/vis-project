import { describe, expect, it } from "vitest";
import { collapseRepeatedWarSuffix } from "./war-name-normalization.mjs";

describe("war name normalization", () => {
  it("collapses repeated War suffixes", () => {
    expect(collapseRepeatedWarSuffix("Gulf War War")).toBe("Gulf War");
    expect(collapseRepeatedWarSuffix("Example war war war")).toBe("Example War");
  });

  it("keeps normal conflict group names unchanged", () => {
    expect(collapseRepeatedWarSuffix("World War II")).toBe("World War II");
    expect(collapseRepeatedWarSuffix("Iran-Iraq War")).toBe("Iran-Iraq War");
  });
});
