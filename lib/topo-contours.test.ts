import { describe, expect, it } from "vitest";

import { buildTopoPaths, TOPO_VIEWBOX } from "./topo-contours";

const SEED = 0x746f706f;

describe("topo contours", () => {
  it("is deterministic for a seed", () => {
    expect(buildTopoPaths(SEED)).toEqual(buildTopoPaths(SEED));
  });

  it("changes with the seed", () => {
    expect(buildTopoPaths(SEED)).not.toEqual(buildTopoPaths(SEED + 1));
  });

  it("emits 10 levels with every fifth an index line", () => {
    const levels = buildTopoPaths(SEED);
    expect(levels).toHaveLength(10);
    expect(levels.map((l) => l.index)).toEqual([
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  it("emits non-empty paths whose segments stay inside the viewBox", () => {
    for (const { d } of buildTopoPaths(SEED)) {
      expect(d.length).toBeGreaterThan(0);
      expect(d.startsWith("M")).toBe(true);
      const nums = d.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
      expect(nums.length % 4).toBe(0);
      for (let k = 0; k < nums.length; k += 2) {
        expect(nums[k]).toBeGreaterThanOrEqual(0);
        expect(nums[k]).toBeLessThanOrEqual(TOPO_VIEWBOX.w);
        expect(nums[k + 1]).toBeGreaterThanOrEqual(0);
        expect(nums[k + 1]).toBeLessThanOrEqual(TOPO_VIEWBOX.h);
      }
    }
  });

  it("still draws rings at the highest level (seeded hills close)", () => {
    // The Gaussian bumps put closed rings at the top of the field, so the
    // highest level must have segments — a flat or degenerate field would
    // not.
    const levels = buildTopoPaths(SEED);
    const top = levels[9].d;
    expect((top.match(/M/g) ?? []).length).toBeGreaterThan(10);
  });
});
