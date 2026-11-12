import { describe, expect, it } from "vitest";

import {
  CORPUS_GAUGE_COLUMNS,
  CORPUS_GAUGE_FIGURE,
  CORPUS_GAUGE_FILL,
  CORPUS_GAUGE_MAX_WAVE,
  CORPUS_GAUGE_REST_EPSILON,
  corpusGaugeAdvanceBubbles,
  corpusGaugeDisturb,
  corpusGaugeFlatPolygon,
  corpusGaugeLevelY,
  corpusGaugeMaxHeight,
  corpusGaugeSettle,
  corpusGaugeSlosh,
  corpusGaugeSpawnBubble,
  corpusGaugeStep,
  corpusGaugeSurfacePolygon,
  createCorpusGaugeState,
} from "./corpus-gauge";

describe("corpusGaugeFill", () => {
  it("pours from empty to the full corpus and settles flat", () => {
    const state = createCorpusGaugeState();
    state.target = CORPUS_GAUGE_FILL;
    let energy = 0;
    for (let i = 0; i < 120 * 4; i++) energy = corpusGaugeStep(state);
    expect(state.level).toBeCloseTo(100, 1);
    expect(energy).toBeLessThan(CORPUS_GAUGE_REST_EPSILON);
    corpusGaugeSettle(state);
    expect(state.level).toBe(100);
    expect(corpusGaugeMaxHeight(state)).toBe(0);
  });

  it("overshoots on the pour, like a poured glass", () => {
    const state = createCorpusGaugeState();
    state.target = CORPUS_GAUGE_FILL;
    let peak = 0;
    for (let i = 0; i < 120 * 2; i++) {
      corpusGaugeStep(state);
      peak = Math.max(peak, state.level);
    }
    expect(peak).toBeGreaterThan(100);
  });

  it("pins the verbatim figure", () => {
    expect(CORPUS_GAUGE_FIGURE).toBe("1M+ tweets");
    expect(CORPUS_GAUGE_FILL).toBe(100);
  });
});

describe("corpusGaugeSlosh", () => {
  it("a sideways drag tilts the surface — one side up, one side down", () => {
    const state = createCorpusGaugeState();
    state.target = CORPUS_GAUGE_FILL;
    for (let i = 0; i < 120 * 4; i++) corpusGaugeStep(state);
    corpusGaugeSettle(state);
    corpusGaugeSlosh(state, 12);
    // The tilt grows over the first steps as the speeds move the
    // columns — one step is only ~0.4px of travel.
    for (let i = 0; i < 8; i++) corpusGaugeStep(state);
    const left = state.heights.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const right = state.heights.slice(-5).reduce((a, b) => a + b, 0) / 5;
    expect(Math.sign(left)).not.toBe(Math.sign(right));
    expect(Math.abs(left - right)).toBeGreaterThan(1);
  });

  it("the level never moves under a slosh — the figure stays verbatim", () => {
    const state = createCorpusGaugeState();
    state.target = CORPUS_GAUGE_FILL;
    for (let i = 0; i < 120 * 4; i++) corpusGaugeStep(state);
    corpusGaugeSettle(state);
    corpusGaugeSlosh(state, 40);
    for (let i = 0; i < 120; i++) corpusGaugeStep(state);
    expect(state.level).toBeCloseTo(100, 6);
    expect(state.target).toBe(100);
  });

  it("a slosh decays back to a flat surface", () => {
    const state = createCorpusGaugeState();
    state.target = CORPUS_GAUGE_FILL;
    for (let i = 0; i < 120 * 4; i++) corpusGaugeStep(state);
    corpusGaugeSettle(state);
    corpusGaugeSlosh(state, 20);
    let energy = 0;
    // The tilt mode is the slowest surface mode (ζ≈0.13 at the
    // fix1 damping, ζω≈0.55/s), so the tail needs ~14s to fall
    // under epsilon.
    for (let i = 0; i < 120 * 14; i++) energy = corpusGaugeStep(state);
    expect(energy).toBeLessThan(CORPUS_GAUGE_REST_EPSILON);
    corpusGaugeSettle(state);
    expect(corpusGaugeMaxHeight(state)).toBe(0);
  });
});

describe("corpusGaugeDisturb", () => {
  it("a drop pushes the columns around it and nowhere else", () => {
    const state = createCorpusGaugeState();
    corpusGaugeDisturb(state, 0.5, 260, 2.5);
    const mid = state.speeds[Math.floor(CORPUS_GAUGE_COLUMNS / 2)];
    expect(mid).toBeGreaterThan(100);
    expect(state.speeds[0]).toBe(0);
    expect(state.speeds[CORPUS_GAUGE_COLUMNS - 1]).toBe(0);
  });

  it("the wave never exceeds its ceiling", () => {
    const state = createCorpusGaugeState();
    corpusGaugeDisturb(state, 0.5, 5000, 3);
    for (let i = 0; i < 120; i++) corpusGaugeStep(state);
    expect(corpusGaugeMaxHeight(state)).toBeLessThanOrEqual(
      CORPUS_GAUGE_MAX_WAVE,
    );
  });
});

describe("corpusGaugeBubbles", () => {
  it("bubbles rise and pop at the surface, dimpling it", () => {
    const state = createCorpusGaugeState();
    state.level = 100;
    state.target = 100;
    expect(
      corpusGaugeSpawnBubble(state, 0.5, 150, 3, 80, 0),
    ).toBe(true);
    const height = 170;
    let alive = 1;
    for (let i = 0; i < 120 * 3 && alive > 0; i++) {
      alive = corpusGaugeAdvanceBubbles(state, height, 1 / 120);
      corpusGaugeStep(state);
    }
    expect(alive).toBe(0);
    expect(state.bubbles[0]?.alive).toBe(false);
  });

  it("bubbles pop at the headroom surface", () => {
    const state = createCorpusGaugeState();
    state.level = 100;
    state.target = 100;
    expect(corpusGaugeSpawnBubble(state, 0.5, 20, 3, 80, 0)).toBe(true);
    // y=20 is below the 14px surface: still rising, not popped.
    expect(corpusGaugeAdvanceBubbles(state, 170, 1 / 120, 14)).toBe(1);
    let alive = 1;
    for (let i = 0; i < 120 && alive > 0; i++) {
      alive = corpusGaugeAdvanceBubbles(state, 170, 1 / 120, 14);
      corpusGaugeStep(state);
    }
    expect(alive).toBe(0);
    expect(state.bubbles[0]?.alive).toBe(false);
  });

  it("the pool caps at ten — a full pool refuses a new bubble", () => {
    const state = createCorpusGaugeState();
    for (let i = 0; i < 10; i++) {
      expect(
        corpusGaugeSpawnBubble(state, i / 10, 150, 2, 80, i),
      ).toBe(true);
    }
    expect(corpusGaugeSpawnBubble(state, 0.5, 150, 2, 80, 0)).toBe(false);
  });
});

describe("corpusGaugePolygons", () => {
  it("the surface polygon spans every column and closes at the floor", () => {
    const heights = new Array(CORPUS_GAUGE_COLUMNS).fill(0);
    const poly = corpusGaugeSurfacePolygon(heights, 40, 400, 170);
    expect(poly.startsWith("polygon(0.0px 40.0px,")).toBe(true);
    expect(poly.endsWith("400px 210px,0px 210px)")).toBe(true);
    expect(poly.split(",").length).toBe(CORPUS_GAUGE_COLUMNS + 2);
  });

  it("the flat polygon is a level fill at the level", () => {
    expect(corpusGaugeFlatPolygon(100)).toBe(
      "polygon(0% calc(0% + 0px - 0px),100% calc(0% + 0px - 0px),100% 100%,0% 100%)",
    );
    expect(corpusGaugeFlatPolygon(0)).toContain("calc(100% + 0px - 0px)");
  });

  it("headroom lifts the flat top off the rim at full fill", () => {
    expect(corpusGaugeFlatPolygon(100, 0, 14)).toContain(
      "calc(0% + 14px - 0px)",
    );
    expect(corpusGaugeFlatPolygon(50, 0, 14)).toContain(
      "calc(50% + 7px - 0px)",
    );
  });

  it("levelY maps 0 to the floor and 100 to the rim", () => {
    expect(corpusGaugeLevelY(0, 170)).toBe(170);
    expect(corpusGaugeLevelY(100, 170)).toBe(0);
    expect(corpusGaugeLevelY(50, 170)).toBe(85);
  });

  it("headroom holds the settled surface below the rim", () => {
    expect(corpusGaugeLevelY(100, 170, 14)).toBe(14);
    expect(corpusGaugeLevelY(0, 170, 14)).toBe(170);
    expect(corpusGaugeLevelY(50, 170, 14)).toBe(92);
  });
});
