import { describe, expect, it } from "vitest";

import {
  FOIL_BAND_END_PCT,
  FOIL_BAND_START_PCT,
  FOIL_BAND_TRAVEL_PCT,
  FOIL_BAND_WIDTH_PCT,
  FOIL_HUE_AMPLITUDE_DEG,
  FOIL_HUE_CYCLE_MS,
  FOIL_PEAK_ALPHA,
  FOIL_SWEEP_MS,
  foilBandLeftAt,
  foilHueAt,
} from "./project-foil";

describe("foilBandLeftAt", () => {
  it("starts one band width off the left edge and ends past the right", () => {
    expect(foilBandLeftAt(0)).toBe(FOIL_BAND_START_PCT);
    expect(foilBandLeftAt(1)).toBe(FOIL_BAND_END_PCT);
    expect(FOIL_BAND_START_PCT).toBe(-FOIL_BAND_WIDTH_PCT);
    expect(FOIL_BAND_END_PCT).toBe(
      FOIL_BAND_START_PCT + FOIL_BAND_TRAVEL_PCT,
    );
  });

  it("travels linearly, so the band is trackable across the whole row", () => {
    expect(foilBandLeftAt(0.25)).toBe(-45 + 0.25 * 153);
    expect(foilBandLeftAt(0.5)).toBe(-45 + 0.5 * 153);
    expect(foilBandLeftAt(0.75)).toBe(-45 + 0.75 * 153);
  });

  it("clamps progress outside 0..1", () => {
    expect(foilBandLeftAt(-0.5)).toBe(FOIL_BAND_START_PCT);
    expect(foilBandLeftAt(1.5)).toBe(FOIL_BAND_END_PCT);
  });
});

describe("foilHueAt", () => {
  it("oscillates between -amplitude and +amplitude, seamlessly", () => {
    expect(foilHueAt(0)).toBe(-FOIL_HUE_AMPLITUDE_DEG);
    expect(foilHueAt(FOIL_HUE_CYCLE_MS / 4)).toBe(0);
    expect(foilHueAt(FOIL_HUE_CYCLE_MS / 2)).toBe(FOIL_HUE_AMPLITUDE_DEG);
    expect(foilHueAt((3 * FOIL_HUE_CYCLE_MS) / 4)).toBe(0);
    expect(foilHueAt(FOIL_HUE_CYCLE_MS)).toBe(-FOIL_HUE_AMPLITUDE_DEG);
  });

  it("wraps negative and over-cycle elapsed times", () => {
    expect(foilHueAt(-FOIL_HUE_CYCLE_MS / 2)).toBe(FOIL_HUE_AMPLITUDE_DEG);
    expect(foilHueAt(FOIL_HUE_CYCLE_MS + FOIL_HUE_CYCLE_MS / 4)).toBe(0);
  });

  it("stays inside the cool FROST family", () => {
    expect(FOIL_HUE_AMPLITUDE_DEG).toBeLessThanOrEqual(45);
  });
});

describe("foil constants", () => {
  it("sweeps slowly and tints without obscuring", () => {
    // A sub-second sweep outruns headless stills (iter-26 sign); a
    // 2.8s linear traverse is trackable at both widths.
    expect(FOIL_SWEEP_MS).toBeGreaterThanOrEqual(2000);
    expect(FOIL_PEAK_ALPHA).toBeGreaterThan(0.2);
    expect(FOIL_PEAK_ALPHA).toBeLessThanOrEqual(0.75);
    expect(FOIL_BAND_WIDTH_PCT).toBeGreaterThan(0);
    expect(FOIL_BAND_WIDTH_PCT).toBeLessThan(100);
  });
});
