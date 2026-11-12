import { describe, expect, it } from "vitest";

import {
  CHAPTER_RIPPLE_DURATION_MS,
  CHAPTER_RIPPLE_ENERGY_FLOOR,
  CHAPTER_RIPPLE_FADE_IN_MS,
  CHAPTER_RIPPLE_FLASH_DURATION_MS,
  CHAPTER_RIPPLE_MAX_CONCURRENT,
  CHAPTER_RIPPLE_MAX_RADIUS_DESKTOP_PX,
  CHAPTER_RIPPLE_MAX_RADIUS_NARROW_PX,
  CHAPTER_RIPPLE_PEAK_ALPHA,
  CHAPTER_RIPPLE_RING_COUNT,
  CHAPTER_RIPPLE_RING_DELAY_MS,
  chapterRippleActive,
  chapterRippleEnergyAt,
  chapterRippleEnvelope,
  chapterRippleFlash,
  chapterRippleRing,
  chapterRippleSpawn,
  type ChapterRipple,
} from "./chapter-ripple";

const RIPPLE: ChapterRipple = {
  x0: 720,
  y0: 400,
  startT: 0,
  narrow: false,
};

const NARROW: ChapterRipple = { ...RIPPLE, narrow: true };

describe("chapterRippleActive", () => {
  it("is alive from spawn until the duration, dead at and after it", () => {
    expect(chapterRippleActive(0)).toBe(true);
    expect(chapterRippleActive(CHAPTER_RIPPLE_DURATION_MS - 1)).toBe(true);
    expect(chapterRippleActive(CHAPTER_RIPPLE_DURATION_MS)).toBe(false);
    expect(chapterRippleActive(CHAPTER_RIPPLE_DURATION_MS + 500)).toBe(false);
  });

  it("stays alive on a negative age — the frame clock can lag the spawn clock (rAF timestamp predates the click under slow headless rendering), so a not-yet-born ripple is pending, not dead", () => {
    expect(chapterRippleActive(-1)).toBe(true);
    expect(chapterRippleActive(-100)).toBe(true);
    const ring = chapterRippleRing(RIPPLE, -50, 0);
    expect(ring.r).toBe(0);
    expect(ring.alpha).toBe(0);
    const flash = chapterRippleFlash(RIPPLE, -50);
    expect(flash.alpha).toBe(CHAPTER_RIPPLE_PEAK_ALPHA);
  });
});

describe("chapterRippleEnvelope", () => {
  it("starts at 0 and reaches 1 after the fade-in", () => {
    expect(
      chapterRippleEnvelope(0, CHAPTER_RIPPLE_DURATION_MS),
    ).toBe(0);
    expect(
      chapterRippleEnvelope(
        CHAPTER_RIPPLE_FADE_IN_MS,
        CHAPTER_RIPPLE_DURATION_MS,
      ),
    ).toBe(1);
    expect(chapterRippleEnvelope(600, CHAPTER_RIPPLE_DURATION_MS)).toBe(1);
  });

  it("holds through the middle and fades out over the last 30%", () => {
    // Fade-out starts at 70% of 2400ms = 1680ms; midpoint of the
    // fade (2040ms) is ~0.5.
    expect(chapterRippleEnvelope(1680, CHAPTER_RIPPLE_DURATION_MS)).toBe(1);
    expect(
      chapterRippleEnvelope(2040, CHAPTER_RIPPLE_DURATION_MS),
    ).toBeCloseTo(0.5, 2);
    expect(
      chapterRippleEnvelope(
        CHAPTER_RIPPLE_DURATION_MS - 1,
        CHAPTER_RIPPLE_DURATION_MS,
      ),
    ).toBeCloseTo(0, 1);
  });

  it("is 0 outside the lifetime", () => {
    expect(chapterRippleEnvelope(-10, CHAPTER_RIPPLE_DURATION_MS)).toBe(0);
    expect(
      chapterRippleEnvelope(
        CHAPTER_RIPPLE_DURATION_MS,
        CHAPTER_RIPPLE_DURATION_MS,
      ),
    ).toBe(0);
  });
});

describe("chapterRippleRing", () => {
  it("is unborn at spawn — radius 0, alpha 0", () => {
    const ring = chapterRippleRing(RIPPLE, 0, 0);
    expect(ring.r).toBe(0);
    expect(ring.alpha).toBe(0);
  });

  it("expands ease-out cubic to the desktop max radius", () => {
    // At 1200ms (half the 2400ms life) the ease-out cubic is at
    // 1 - 0.5^3 = 0.875 of the max radius.
    const half = chapterRippleRing(RIPPLE, 1200, 0);
    expect(half.r).toBeCloseTo(
      CHAPTER_RIPPLE_MAX_RADIUS_DESKTOP_PX * 0.875,
      10,
    );
    expect(half.alpha).toBeGreaterThan(0);
    const end = chapterRippleRing(
      RIPPLE,
      CHAPTER_RIPPLE_DURATION_MS - 1,
      0,
    );
    expect(end.r).toBeCloseTo(CHAPTER_RIPPLE_MAX_RADIUS_DESKTOP_PX, 0);
  });

  it("is smaller on narrow screens", () => {
    const ring = chapterRippleRing(
      NARROW,
      CHAPTER_RIPPLE_DURATION_MS - 1,
      0,
    );
    expect(ring.r).toBeCloseTo(CHAPTER_RIPPLE_MAX_RADIUS_NARROW_PX, 0);
  });

  it("stays spaced at full expansion — stepped maxima, not a triple-stroke outline (desktop critic, iter 37)", () => {
    // With one shared max radius the ease-out cubic saturates all
    // three at the same size (~15px apart at the end). Stepped
    // maxima keep them ~40px apart desktop, ~35px narrow.
    const age = CHAPTER_RIPPLE_DURATION_MS - 1;
    const r0 = chapterRippleRing(RIPPLE, age, 0);
    const r1 = chapterRippleRing(RIPPLE, age, 1);
    const r2 = chapterRippleRing(RIPPLE, age, 2);
    expect(r0.r - r1.r).toBeCloseTo(40, 0);
    expect(r1.r - r2.r).toBeCloseTo(40, 0);
    const n0 = chapterRippleRing(NARROW, age, 0);
    const n1 = chapterRippleRing(NARROW, age, 1);
    const n2 = chapterRippleRing(NARROW, age, 2);
    expect(n0.r - n1.r).toBeCloseTo(35, 0);
    expect(n1.r - n2.r).toBeCloseTo(35, 0);
  });

  it("staggers the rings: ring 1 is unborn while ring 0 is already traveling", () => {
    // At 100ms ring 0 is alive (delay 0) but ring 1 (delay 180ms)
    // has not started.
    expect(chapterRippleRing(RIPPLE, 100, 0).alpha).toBeGreaterThan(0);
    expect(chapterRippleRing(RIPPLE, 100, 1).r).toBe(0);
    expect(chapterRippleRing(RIPPLE, 100, 1).alpha).toBe(0);
    // At 400ms ring 1 is alive and smaller than ring 0.
    const r0 = chapterRippleRing(RIPPLE, 400, 0);
    const r1 = chapterRippleRing(RIPPLE, 400, 1);
    expect(r1.r).toBeGreaterThan(0);
    expect(r1.r).toBeLessThan(r0.r);
  });

  it("two frames ~1.2s apart show wholly different rings — the motion-pair bar", () => {
    const early = chapterRippleRing(RIPPLE, 400, 0);
    const late = chapterRippleRing(RIPPLE, 1600, 0);
    expect(late.r - early.r).toBeGreaterThan(150);
    expect(late.r).toBeGreaterThan(300);
  });

  it("thins as it spreads — the stroke disperses like water", () => {
    const early = chapterRippleRing(RIPPLE, 200, 0);
    const late = chapterRippleRing(RIPPLE, 2000, 0);
    expect(late.widthCore).toBeLessThan(early.widthCore);
    expect(late.widthGlow).toBeLessThan(early.widthGlow);
    expect(late.widthCore).toBeGreaterThan(0);
  });

  it("dies at the end of its own lifetime", () => {
    for (let k = 0; k < CHAPTER_RIPPLE_RING_COUNT; k++) {
      expect(
        chapterRippleRing(RIPPLE, CHAPTER_RIPPLE_DURATION_MS, k).alpha,
      ).toBe(0);
    }
  });
});

describe("chapterRippleFlash", () => {
  it("is brightest at spawn and gone after 500ms", () => {
    expect(chapterRippleFlash(RIPPLE, 0).alpha).toBe(
      CHAPTER_RIPPLE_PEAK_ALPHA,
    );
    expect(chapterRippleFlash(RIPPLE, 250).alpha).toBeCloseTo(
      CHAPTER_RIPPLE_PEAK_ALPHA * 0.5,
      10,
    );
    expect(
      chapterRippleFlash(RIPPLE, CHAPTER_RIPPLE_FLASH_DURATION_MS).alpha,
    ).toBe(0);
    expect(
      chapterRippleFlash(RIPPLE, CHAPTER_RIPPLE_FLASH_DURATION_MS + 100)
        .alpha,
    ).toBe(0);
  });

  it("is smaller on narrow screens", () => {
    expect(chapterRippleFlash(NARROW, 0).radius).toBeLessThan(
      chapterRippleFlash(RIPPLE, 0).radius,
    );
  });
});

describe("chapterRippleEnergyAt", () => {
  it("floors dim zones at 0.75 so the rings read on their own in dark gaps", () => {
    expect(chapterRippleEnergyAt(0.25)).toBe(CHAPTER_RIPPLE_ENERGY_FLOOR);
    expect(chapterRippleEnergyAt(0.5)).toBe(CHAPTER_RIPPLE_ENERGY_FLOOR);
    expect(chapterRippleEnergyAt(0.75)).toBe(0.75);
  });

  it("leaves bright zones untouched", () => {
    expect(chapterRippleEnergyAt(0.9)).toBe(0.9);
    expect(chapterRippleEnergyAt(1)).toBe(1);
  });
});

describe("chapterRippleSpawn", () => {
  it("caps at 3 concurrent ripples, dropping the oldest", () => {
    let ripples: ChapterRipple[] = [];
    for (let i = 0; i < 5; i++) {
      ripples = chapterRippleSpawn(ripples, { ...RIPPLE, startT: i * 100 });
    }
    expect(ripples).toHaveLength(CHAPTER_RIPPLE_MAX_CONCURRENT);
    expect(ripples.map((r) => r.startT)).toEqual([200, 300, 400]);
  });

  it("does not mutate the input array", () => {
    const before: ChapterRipple[] = [{ ...RIPPLE, startT: 0 }];
    const after = chapterRippleSpawn(before, { ...RIPPLE, startT: 100 });
    expect(before).toHaveLength(1);
    expect(after).toHaveLength(2);
  });
});
