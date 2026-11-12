import { describe, expect, it } from "vitest";

import {
  CLICK_PULSE_DURATION_MS,
  CLICK_PULSE_ENERGY_FLOOR,
  CLICK_PULSE_FADE_IN_MS,
  CLICK_PULSE_MAX_CONCURRENT,
  CLICK_PULSE_TAIL_COUNT,
  clickPulseActive,
  clickPulseEnergyAt,
  clickPulseEnvelope,
  clickPulseHead,
  clickPulseSpawn,
  clickPulseTail,
  type ClickPulse,
} from "./click-pulse";

const PULSE: ClickPulse = {
  x0: 700,
  y0: 300,
  slope: 0.2,
  startT: 0,
  narrow: false,
};

const NARROW: ClickPulse = { ...PULSE, narrow: true };

describe("clickPulseActive", () => {
  it("is alive from spawn until the duration, dead at and after it", () => {
    expect(clickPulseActive(0)).toBe(true);
    expect(clickPulseActive(CLICK_PULSE_DURATION_MS - 1)).toBe(true);
    expect(clickPulseActive(CLICK_PULSE_DURATION_MS)).toBe(false);
    expect(clickPulseActive(CLICK_PULSE_DURATION_MS + 500)).toBe(false);
  });

  it("stays alive on a negative age — the frame clock can lag the pointerdown clock (rAF timestamp predates the click under slow headless rendering), so a not-yet-born pulse is pending, not dead", () => {
    expect(clickPulseActive(-1)).toBe(true);
    expect(clickPulseActive(-100)).toBe(true);
    expect(clickPulseEnvelope(-50)).toBe(0);
    const h = clickPulseHead(PULSE, -50);
    expect(h.x).toBe(700);
    expect(h.y).toBe(300);
    expect(h.alpha).toBe(0);
  });
});

describe("clickPulseEnvelope", () => {
  it("starts at 0 and reaches 1 after the fade-in", () => {
    expect(clickPulseEnvelope(0)).toBe(0);
    expect(clickPulseEnvelope(CLICK_PULSE_FADE_IN_MS)).toBe(1);
    expect(clickPulseEnvelope(600)).toBe(1);
  });

  it("holds through the middle and fades out over the last 35%", () => {
    // Fade-out starts at 65% of 1800ms = 1170ms; midpoint of the
    // fade (1485ms) is ~0.5.
    expect(clickPulseEnvelope(1170)).toBe(1);
    expect(clickPulseEnvelope(1485)).toBeCloseTo(0.5, 2);
    expect(clickPulseEnvelope(CLICK_PULSE_DURATION_MS - 1)).toBeCloseTo(0, 1);
  });

  it("is 0 outside the lifetime", () => {
    expect(clickPulseEnvelope(-10)).toBe(0);
    expect(clickPulseEnvelope(CLICK_PULSE_DURATION_MS)).toBe(0);
  });
});

describe("clickPulseHead", () => {
  it("is born at the click point", () => {
    const h = clickPulseHead(PULSE, 0);
    expect(h.x).toBe(700);
    expect(h.y).toBe(300);
    expect(h.alpha).toBe(0);
  });

  it("travels +x at 420px/s desktop, following the frozen slope", () => {
    const h = clickPulseHead(PULSE, 1000);
    expect(h.x).toBeCloseTo(700 + 420, 10);
    expect(h.y).toBeCloseTo(300 + 0.2 * 420, 10);
    expect(h.alpha).toBe(1);
  });

  it("travels +x at 300px/s on narrow screens", () => {
    const h = clickPulseHead(NARROW, 1000);
    expect(h.x).toBeCloseTo(700 + 300, 10);
    expect(h.y).toBeCloseTo(300 + 0.2 * 300, 10);
  });

  it("covers ~756px over its lifetime — two frames 1s apart show it in wholly different places", () => {
    const early = clickPulseHead(PULSE, 200);
    const late = clickPulseHead(PULSE, 1200);
    expect(late.x - early.x).toBeCloseTo(420, 10);
    expect(late.x - early.x).toBeGreaterThan(300);
  });
});

describe("clickPulseTail", () => {
  it("is empty at spawn — the tail grows behind the head, it is not pre-drawn", () => {
    for (let k = 1; k <= CLICK_PULSE_TAIL_COUNT; k++) {
      expect(clickPulseTail(PULSE, 0, k).alpha).toBe(0);
    }
  });

  it("grows in as the head passes each spacing, trailing behind the head", () => {
    // At 500ms the head has traveled 210px: ghosts 1–7 (30–210px
    // behind) exist, ghost 8 (240px behind) does not yet.
    const head = clickPulseHead(PULSE, 500);
    for (let k = 1; k <= 7; k++) {
      const g = clickPulseTail(PULSE, 500, k);
      expect(g.alpha).toBeGreaterThan(0);
      expect(g.x).toBeCloseTo(head.x - k * 30, 10);
      expect(g.y).toBeCloseTo(head.y - 0.2 * k * 30, 10);
    }
    expect(clickPulseTail(PULSE, 500, 8).alpha).toBe(0);
  });

  it("fades with distance from the head", () => {
    const near = clickPulseTail(PULSE, 1000, 1);
    const far = clickPulseTail(PULSE, 1000, 8);
    expect(near.alpha).toBeGreaterThan(far.alpha);
    expect(far.alpha).toBeGreaterThan(0);
  });

  it("dies with the head envelope", () => {
    expect(clickPulseTail(PULSE, CLICK_PULSE_DURATION_MS, 1).alpha).toBe(0);
  });
});

describe("clickPulseEnergyAt", () => {
  it("floors dim zones at 0.75 so the head reads on its own in dark gaps", () => {
    expect(clickPulseEnergyAt(0.25)).toBe(CLICK_PULSE_ENERGY_FLOOR);
    expect(clickPulseEnergyAt(0.5)).toBe(CLICK_PULSE_ENERGY_FLOOR);
    expect(clickPulseEnergyAt(0.75)).toBe(0.75);
  });

  it("leaves bright zones untouched", () => {
    expect(clickPulseEnergyAt(0.9)).toBe(0.9);
    expect(clickPulseEnergyAt(1)).toBe(1);
  });
});

describe("clickPulseSpawn", () => {
  it("caps at 4 concurrent pulses, dropping the oldest", () => {
    let pulses: ClickPulse[] = [];
    for (let i = 0; i < 6; i++) {
      pulses = clickPulseSpawn(pulses, { ...PULSE, startT: i * 100 });
    }
    expect(pulses).toHaveLength(CLICK_PULSE_MAX_CONCURRENT);
    expect(pulses.map((p) => p.startT)).toEqual([200, 300, 400, 500]);
  });

  it("does not mutate the input array", () => {
    const before: ClickPulse[] = [{ ...PULSE, startT: 0 }];
    const after = clickPulseSpawn(before, { ...PULSE, startT: 100 });
    expect(before).toHaveLength(1);
    expect(after).toHaveLength(2);
  });
});
