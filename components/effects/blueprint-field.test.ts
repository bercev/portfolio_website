import { describe, expect, it } from "vitest";

import {
  BLUEPRINT_PROFILES,
  blueprintColumn,
  calmGradientStops,
  getBlueprintProfile,
  lerpBlueprintProfile,
} from "./blueprint-field";

describe("getBlueprintProfile", () => {
  it("returns the hero profile for unknown and null chapters", () => {
    expect(getBlueprintProfile(null)).toEqual(BLUEPRINT_PROFILES.hero);
    expect(getBlueprintProfile("nope")).toEqual(BLUEPRINT_PROFILES.hero);
  });

  it("returns the named chapter profile", () => {
    expect(getBlueprintProfile("projects")).toEqual(
      BLUEPRINT_PROFILES.projects,
    );
    expect(BLUEPRINT_PROFILES.projects.angle).toBe(5);
  });

  it("keeps the fine grid in the hero and rules sections major-only", () => {
    expect(BLUEPRINT_PROFILES.hero.majorOnly).toBe(false);
    for (const name of [
      "about",
      "publications",
      "experience",
      "projects",
      "skills",
      "contact",
      "epilogue",
      "notfound",
    ]) {
      expect(BLUEPRINT_PROFILES[name].majorOnly).toBe(true);
    }
  });

  it("returns the missing-sheet profile for the 404 chapter", () => {
    expect(getBlueprintProfile("notfound")).toEqual(
      BLUEPRINT_PROFILES.notfound,
    );
    expect(BLUEPRINT_PROFILES.notfound.angle).toBe(-3);
  });
});

describe("lerpBlueprintProfile", () => {
  it("interpolates every field at the midpoint", () => {
    const mid = lerpBlueprintProfile(
      BLUEPRINT_PROFILES.hero,
      BLUEPRINT_PROFILES.projects,
      0.5,
    );
    expect(mid.angle).toBeCloseTo(2.5);
    expect(mid.cell).toBeCloseTo(24);
    expect(mid.veil).toBeCloseTo(0.22);
    expect(mid.dotRadius).toBeCloseTo(1.7);
  });

  it("flips majorOnly at the lerp midpoint", () => {
    expect(
      lerpBlueprintProfile(
        BLUEPRINT_PROFILES.hero,
        BLUEPRINT_PROFILES.projects,
        0.25,
      ).majorOnly,
    ).toBe(false);
    expect(
      lerpBlueprintProfile(
        BLUEPRINT_PROFILES.hero,
        BLUEPRINT_PROFILES.projects,
        0.5,
      ).majorOnly,
    ).toBe(true);
    expect(
      lerpBlueprintProfile(
        BLUEPRINT_PROFILES.hero,
        BLUEPRINT_PROFILES.projects,
        0.75,
      ).majorOnly,
    ).toBe(true);
  });

  it("is exact at the endpoints", () => {
    expect(
      lerpBlueprintProfile(
        BLUEPRINT_PROFILES.about,
        BLUEPRINT_PROFILES.skills,
        0,
      ),
    ).toEqual(BLUEPRINT_PROFILES.about);
    expect(
      lerpBlueprintProfile(
        BLUEPRINT_PROFILES.about,
        BLUEPRINT_PROFILES.skills,
        1,
      ),
    ).toEqual(BLUEPRINT_PROFILES.skills);
  });
});

describe("blueprintColumn", () => {
  it("passes a marked sheet's border box through untouched", () => {
    // Paper sheet at 1440px: 46rem + padding ≈ 326..1114.
    expect(blueprintColumn({ left: 326, right: 1114 }, 1440, 1200)).toEqual({
      colL: 326,
      colR: 1114,
    });
  });

  it("falls back to the centered content-max column without a rect", () => {
    expect(blueprintColumn(null, 1440, 1200)).toEqual({
      colL: 120,
      colR: 1320,
    });
    expect(blueprintColumn(null, 390, 1200)).toEqual({
      colL: 19.5,
      colR: 370.5,
    });
  });

  it("returns a degenerate column for a non-positive width", () => {
    expect(blueprintColumn(null, 0, 1200)).toEqual({ colL: 0, colR: 0 });
    expect(blueprintColumn(null, -20, 1200)).toEqual({ colL: 0, colR: 0 });
  });
});

describe("calmGradientStops", () => {
  it("matches the settled desktop geometry", () => {
    const stops = calmGradientStops(120, 1320, 1440);
    expect(stops).toHaveLength(6);
    expect(stops[0]).toBe(0);
    expect(stops[1]).toBe(0);
    expect(stops[2]).toBeCloseTo(120 / 1440, 10);
    expect(stops[3]).toBeCloseTo(1320 / 1440, 10);
    expect(stops[4]).toBe(1);
    expect(stops[5]).toBe(1);
  });

  it("clamps the collapsed-viewport geometry that threw offset 16", () => {
    // 1×1 transient viewport during a full-page screenshot: the column
    // keeps its min-content width while W is 1, so colR / W is 16.
    const stops = calmGradientStops(0, 16, 1);
    expect(stops).toEqual([0, 0, 0, 1, 1, 1]);
  });

  it("stays in [0, 1] and non-decreasing for degenerate geometry", () => {
    for (const [colL, colR, width] of [
      [-500, 200, 1440],
      [1500, 900, 1440],
      [0, 0, 0],
      [100, 50, -20],
    ] as const) {
      const stops = calmGradientStops(colL, colR, width);
      expect(stops).toHaveLength(6);
      for (let i = 0; i < stops.length; i += 1) {
        expect(stops[i]).toBeGreaterThanOrEqual(0);
        expect(stops[i]).toBeLessThanOrEqual(1);
        if (i > 0) expect(stops[i]).toBeGreaterThanOrEqual(stops[i - 1]);
      }
    }
  });
});
