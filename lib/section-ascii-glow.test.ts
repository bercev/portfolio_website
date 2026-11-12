import { describe, expect, it } from "vitest";

import {
  ASCII_GLOW_CELL_PX,
  ASCII_GLOW_CELL_PX_NARROW,
  ASCII_GLOW_CHARS,
  ASCII_GLOW_DENSITY,
  ASCII_GLOW_LIGHT_ALPHA_SCALE,
  ASCII_GLOW_LIGHT_DEEPEN,
  ASCII_GLOW_PEAK_ALPHA,
  ASCII_GLOW_SCRAMBLE_MS,
  ASCII_GLOW_SCRAMBLE_RADIUS_PX,
  asciiGlowAlpha,
  asciiGlowCellPresent,
  asciiGlowCellSize,
  asciiGlowField,
  asciiGlowGlyphIndex,
  asciiGlowHash,
  asciiGlowLightColor,
  asciiGlowPeakU,
  asciiGlowScrambleCells,
  asciiGlowScrambleGlyphIndex,
  asciiGlowScrambleLive,
  asciiGlowSectionSeed,
} from "./section-ascii-glow";

describe("asciiGlowCellSize", () => {
  it("uses the narrow cell below the breakpoint and the regular cell above", () => {
    expect(asciiGlowCellSize(400)).toBe(ASCII_GLOW_CELL_PX_NARROW);
    expect(asciiGlowCellSize(559)).toBe(ASCII_GLOW_CELL_PX_NARROW);
    expect(asciiGlowCellSize(560)).toBe(ASCII_GLOW_CELL_PX);
    expect(asciiGlowCellSize(1440)).toBe(ASCII_GLOW_CELL_PX);
  });
});

describe("asciiGlowHash", () => {
  it("is deterministic and in [0, 1)", () => {
    expect(asciiGlowHash(3, 7, 0)).toBe(asciiGlowHash(3, 7, 0));
    expect(asciiGlowHash(3, 7, 0)).toBeGreaterThanOrEqual(0);
    expect(asciiGlowHash(3, 7, 0)).toBeLessThan(1);
    expect(asciiGlowHash(3, 7, 1)).not.toBe(asciiGlowHash(3, 7, 0));
  });
});

describe("asciiGlowPeakU", () => {
  it("sways around 0.30 and never leaves the left half", () => {
    for (let t = 0; t < 9000; t += 250) {
      const peak = asciiGlowPeakU(t / 1000);
      expect(peak).toBeGreaterThanOrEqual(0.25);
      expect(peak).toBeLessThanOrEqual(0.35);
    }
    expect(asciiGlowPeakU(0)).toBeCloseTo(0.3, 10);
  });
});

describe("asciiGlowField", () => {
  it("stays in [0, 1] everywhere", () => {
    for (let u = 0; u <= 1; u += 0.1) {
      for (let v = 0; v <= 1; v += 0.1) {
        const value = asciiGlowField(u, v, 1.2);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("is brightest near the peak and fades to the right edge", () => {
    const mid = asciiGlowField(0.3, 0.5, 0);
    const right = asciiGlowField(1, 0.5, 0);
    const left = asciiGlowField(0, 0.5, 0);
    expect(mid).toBeGreaterThan(0.9);
    expect(right).toBeLessThan(0.1);
    expect(left).toBeGreaterThan(right);
  });

  it("drifts with the flow clock", () => {
    const at0 = asciiGlowField(0.35, 0.5, 0);
    const atQuarter = asciiGlowField(0.35, 0.5, 2.25);
    expect(atQuarter).not.toBeCloseTo(at0, 6);
    expect(asciiGlowField(0.35, 0.5, 9)).toBeCloseTo(at0, 10);
  });
});

describe("asciiGlowGlyphIndex", () => {
  it("is deterministic, in range, and monotonic in the field value", () => {
    expect(asciiGlowGlyphIndex(0.5, 0.5)).toBe(
      asciiGlowGlyphIndex(0.5, 0.5),
    );
    for (let v = 0; v <= 1; v += 0.05) {
      const index = asciiGlowGlyphIndex(v, 0.5);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(ASCII_GLOW_CHARS.length);
    }
    expect(asciiGlowGlyphIndex(0, 0.5)).toBeLessThanOrEqual(
      asciiGlowGlyphIndex(1, 0.5),
    );
    expect(asciiGlowGlyphIndex(0, 0.5)).toBe(0);
    expect(asciiGlowGlyphIndex(1, 0.5)).toBe(ASCII_GLOW_CHARS.length - 1);
  });
});

describe("asciiGlowCellPresent", () => {
  it("is denser where the field is brighter", () => {
    let dark = 0;
    let bright = 0;
    for (let i = 0; i < 1000; i++) {
      const h = asciiGlowHash(i, 0, 99);
      if (asciiGlowCellPresent(0.05, h)) dark += 1;
      if (asciiGlowCellPresent(0.95, h)) bright += 1;
    }
    expect(bright).toBeGreaterThan(dark);
    expect(bright / 1000).toBeCloseTo(ASCII_GLOW_DENSITY * (0.35 + 0.65 * 0.95), 1);
  });
});

describe("asciiGlowAlpha", () => {
  it("stays faint: peak 0.20, never above it", () => {
    expect(asciiGlowAlpha(0)).toBeGreaterThan(0);
    expect(asciiGlowAlpha(1)).toBe(ASCII_GLOW_PEAK_ALPHA);
    expect(asciiGlowAlpha(2)).toBe(ASCII_GLOW_PEAK_ALPHA);
    expect(asciiGlowAlpha(0.5)).toBeGreaterThan(asciiGlowAlpha(0));
  });

  it("scales up on light backgrounds so the wash reads on white", () => {
    expect(asciiGlowAlpha(1, true)).toBe(
      ASCII_GLOW_PEAK_ALPHA * ASCII_GLOW_LIGHT_ALPHA_SCALE,
    );
    expect(asciiGlowAlpha(0.5, true)).toBeGreaterThan(
      asciiGlowAlpha(0.5, false),
    );
    expect(asciiGlowAlpha(0, true)).toBeGreaterThan(asciiGlowAlpha(0, false));
  });
});

describe("asciiGlowLightColor", () => {
  it("deepens the accent hue-preserving (each channel scaled equally)", () => {
    const accent = { r: 2, g: 132, b: 199 };
    const deep = asciiGlowLightColor(accent);
    expect(deep.r).toBe(Math.round(2 * ASCII_GLOW_LIGHT_DEEPEN));
    expect(deep.g).toBe(Math.round(132 * ASCII_GLOW_LIGHT_DEEPEN));
    expect(deep.b).toBe(Math.round(199 * ASCII_GLOW_LIGHT_DEEPEN));
    // Hue preserved: channel ratios unchanged. The g/r ratio cannot be
    // checked on the real accent — r rounds 1.1 -> 1, so 73/1 = 73
    // against 132/2 = 66 is rounding noise, not a hue shift (the
    // per-channel assertions above already pin the equal scaling).
    // Check the ratios on a mid-range accent where no channel rounds
    // near zero.
    const mid = asciiGlowLightColor({ r: 100, g: 180, b: 220 });
    expect(mid.g / mid.r).toBeCloseTo(180 / 100, 1);
    expect(mid.b / mid.g).toBeCloseTo(220 / 180, 1);
    // Amber stays amber: goldenHour accent deepens, it does not go blue.
    const amber = asciiGlowLightColor({ r: 217, g: 119, b: 6 });
    expect(amber.r).toBeGreaterThan(amber.b);
    expect(amber.g).toBeGreaterThan(amber.b);
  });
});

describe("asciiGlowScrambleCells", () => {
  it("returns only cells within the radius, clamped to the grid", () => {
    const keys = asciiGlowScrambleCells(100, 50, 80, 10, 14);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const [cx, cy] = key.split(",").map(Number);
      expect(cx).toBeGreaterThanOrEqual(0);
      expect(cx).toBeLessThan(80);
      expect(cy).toBeGreaterThanOrEqual(0);
      expect(cy).toBeLessThan(10);
      const dx = (cx + 0.5) * 14 - 100;
      const dy = (cy + 0.5) * 14 - 50;
      expect(dx * dx + dy * dy).toBeLessThanOrEqual(
        ASCII_GLOW_SCRAMBLE_RADIUS_PX ** 2,
      );
    }
    // A corner point still finds cells (clamped, not empty).
    expect(asciiGlowScrambleCells(0, 0, 80, 10, 14).length).toBeGreaterThan(0);
  });
});

describe("asciiGlowScrambleGlyphIndex", () => {
  it("re-picks across time steps and stays in range", () => {
    const seen = new Set<number>();
    for (let t = 0; t < 2000; t += 50) {
      const index = asciiGlowScrambleGlyphIndex(5, 3, t);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(ASCII_GLOW_CHARS.length);
      seen.add(index);
    }
    expect(seen.size).toBeGreaterThan(1);
    // Same step, same glyph — the flicker is stepped, not random per frame.
    expect(asciiGlowScrambleGlyphIndex(5, 3, 120)).toBe(
      asciiGlowScrambleGlyphIndex(5, 3, 149),
    );
  });
});

describe("asciiGlowSectionSeed", () => {
  it("is deterministic, in 0..63, and differs across the six headings", () => {
    const ids = [
      "about-heading",
      "publications-heading",
      "experience-heading",
      "projects-heading",
      "skills-heading",
      "contact-heading",
    ];
    const seeds = ids.map((id) => asciiGlowSectionSeed(id));
    for (const seed of seeds) {
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(63);
      expect(Number.isInteger(seed)).toBe(true);
    }
    expect(asciiGlowSectionSeed("about-heading")).toBe(
      asciiGlowSectionSeed("about-heading"),
    );
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
});

describe("asciiGlowPeakU with a seed", () => {
  it("offsets the drift phase so sections do not sway in sync", () => {
    expect(asciiGlowPeakU(0, 4)).toBeCloseTo(0.35, 10);
    expect(asciiGlowPeakU(0, 0)).toBeCloseTo(0.3, 10);
    expect(asciiGlowField(0.35, 0.5, 0, 4)).not.toBe(
      asciiGlowField(0.35, 0.5, 0, 0),
    );
  });
});

describe("asciiGlowScrambleLive", () => {
  it("is live until the trail lifetime expires", () => {
    expect(asciiGlowScrambleLive(1000 + ASCII_GLOW_SCRAMBLE_MS, 1000)).toBe(
      true,
    );
    expect(
      asciiGlowScrambleLive(
        1000 + ASCII_GLOW_SCRAMBLE_MS,
        1000 + ASCII_GLOW_SCRAMBLE_MS,
      ),
    ).toBe(false);
  });
});
