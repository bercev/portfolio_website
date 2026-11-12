import { describe, expect, it } from "vitest";

import {
  PLUCK_DAMP_BASE,
  PLUCK_DAMP_HIGH,
  PLUCK_MAX_MODES,
  PLUCK_MAX_MODE_HZ,
  PLUCK_MAX_SWAY,
  PLUCK_REST_ENERGY,
  PLUCK_WAVE_SPEED_PX_S,
  pluckCreateModes,
  pluckEnergy,
  pluckModeCount,
  pluckSettle,
  pluckSoften,
  pluckStepMode,
  pluckSumAt,
  pluckSwingPx,
  pluckTriangleModes,
} from "./plucked-string";

describe("pluckModeCount", () => {
  it("stays in the simulatable band: at least 4, at most 24 modes", () => {
    // A long desktop string rings low, so more modes fit under 22 Hz.
    expect(pluckModeCount(360, 1)).toBeGreaterThanOrEqual(4);
    expect(pluckModeCount(360, 1)).toBeLessThanOrEqual(PLUCK_MAX_MODES);
    // A short string rings high, so the cap bites.
    expect(pluckModeCount(100, 1)).toBeLessThanOrEqual(PLUCK_MAX_MODES);
    expect(pluckModeCount(100, 1)).toBeGreaterThanOrEqual(4);
  });

  it("rings lower on a longer string, as a real string does", () => {
    expect(pluckModeCount(720, 1)).toBeGreaterThanOrEqual(
      pluckModeCount(360, 1),
    );
  });

  it("matches the wave-speed model: f0 = 1500 / (2 * length)", () => {
    // length 360 → f0 ≈ 2.08 Hz → floor(22 / 2.08) = 10 modes.
    expect(pluckModeCount(360, 1)).toBe(
      Math.min(
        PLUCK_MAX_MODES,
        Math.floor(PLUCK_MAX_MODE_HZ / (PLUCK_WAVE_SPEED_PX_S / (2 * 360))),
      ),
    );
  });
});

describe("pluckStepMode", () => {
  it("rings and decays: energy falls over a second, never grows", () => {
    const [mode] = pluckCreateModes(360, 1);
    mode.q = 10;
    const before = pluckEnergy([mode]);
    for (let i = 0; i < 60; i++) pluckStepMode(mode, 1 / 60);
    const after = pluckEnergy([mode]);
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
    // Damping base 0.9/s: after 1s the amplitude is ~e^-0.9 ≈ 0.41 of
    // the start, so the energy is ~0.16 of the start.
    expect(after / before).toBeLessThan(0.25);
    expect(after / before).toBeGreaterThan(0.05);
  });

  it("a settled mode stays settled", () => {
    const [mode] = pluckCreateModes(360, 1);
    pluckStepMode(mode, 1 / 60);
    expect(mode.q).toBe(0);
    expect(mode.v).toBe(0);
  });

  it("is stable at a slow headless frame rate (dt clamped by the caller)", () => {
    const modes = pluckCreateModes(360, 1);
    pluckTriangleModes(modes, 360, 180, 20);
    for (let i = 0; i < 120; i++) {
      for (const mode of modes) pluckStepMode(mode, 1 / 30);
    }
    expect(Number.isFinite(pluckEnergy(modes))).toBe(true);
    expect(pluckEnergy(modes)).toBeLessThan(1e6);
  });
});

describe("pluckTriangleModes", () => {
  it("peaks at the apex and vanishes at the pinned ends", () => {
    const modes = pluckCreateModes(360, 1);
    pluckTriangleModes(modes, 360, 180, 20);
    const basis = (x: number) =>
      Float64Array.from(modes, (_m, i) =>
        Math.sin(((i + 1) * Math.PI * x) / 360),
      );
    const atApex = pluckSumAt(modes, basis(180));
    const atQuarter = pluckSumAt(modes, basis(90));
    const atEnd = pluckSumAt(modes, basis(0));
    // The truncated series rounds the V's corner (the reference's
    // own comment), so the apex reads a touch under the full height.
    expect(atApex).toBeGreaterThan(18);
    expect(atApex).toBeLessThanOrEqual(20);
    expect(atQuarter).toBeCloseTo(10, 0);
    expect(atEnd).toBe(0);
  });

  it("a grab at the midpoint pulls the string into a symmetric V", () => {
    const modes = pluckCreateModes(360, 1);
    pluckTriangleModes(modes, 360, 180, 20);
    const basis = (x: number) =>
      Float64Array.from(modes, (_m, i) =>
        Math.sin(((i + 1) * Math.PI * x) / 360),
      );
    expect(pluckSumAt(modes, basis(90))).toBeCloseTo(
      pluckSumAt(modes, basis(270)),
      0,
    );
  });
});

describe("pluckSoften", () => {
  it("grows like x near zero and never past the ceiling", () => {
    expect(pluckSoften(0, 20)).toBe(0);
    expect(pluckSoften(1, 20)).toBeCloseTo(1, 1);
    expect(pluckSoften(1000, 20)).toBeLessThanOrEqual(20);
    expect(pluckSoften(-1000, 20)).toBeGreaterThanOrEqual(-20);
  });
});

describe("pluckEnergy / pluckSettle", () => {
  it("is zero at rest and settles a ringing string", () => {
    const modes = pluckCreateModes(360, 1);
    expect(pluckEnergy(modes)).toBe(0);
    pluckTriangleModes(modes, 360, 180, 20);
    expect(pluckEnergy(modes)).toBeGreaterThan(PLUCK_REST_ENERGY);
    pluckSettle(modes);
    expect(pluckEnergy(modes)).toBe(0);
  });
});

describe("pluckSwingPx", () => {
  it("caps the swing at 0.6 of the font size", () => {
    expect(pluckSwingPx(36)).toBeCloseTo(36 * PLUCK_MAX_SWAY, 6);
    expect(pluckSwingPx(28)).toBeCloseTo(28 * PLUCK_MAX_SWAY, 6);
  });
});

describe("pluckCreateModes", () => {
  it("carries a ringing string across a resize instead of snapping flat", () => {
    const before = pluckCreateModes(360, 1);
    pluckTriangleModes(before, 360, 180, 20);
    const after = pluckCreateModes(380, 1, before);
    expect(after[0].q).toBe(before[0].q);
    expect(after.length).toBe(pluckModeCount(380, 1));
  });

  it("keeps the damping light on the fundamental so the ring lasts", () => {
    const [mode] = pluckCreateModes(360, 1);
    // gamma = base + high * n^2: the fundamental (n = 1) damps at
    // 0.9 + 0.012.
    expect(mode.gamma).toBeCloseTo(PLUCK_DAMP_BASE + PLUCK_DAMP_HIGH, 6);
    // Higher modes damp much faster — a pluck rounds off into a sway.
    const modes = pluckCreateModes(360, 1);
    expect(modes[modes.length - 1].gamma).toBeGreaterThan(
      modes[0].gamma * 2,
    );
  });
});
