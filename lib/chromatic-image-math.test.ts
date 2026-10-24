import { describe, expect, it } from "vitest";

import {
  chromaticShiftForPointer,
  coverTransform,
  tiltForPointer,
} from "./chromatic-image-math";

describe("coverTransform", () => {
  it("is identity for a square canvas and square image", () => {
    expect(coverTransform(400, 400, 800, 800)).toEqual({
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("crops top/bottom for a canvas wider than the image", () => {
    // Canvas 800x400 (aspect 2), image 800x560 (aspect 10/7): cover scales
    // the image to 800 wide, so only 400/560 of its height is visible.
    const t = coverTransform(800, 400, 800, 560);
    expect(t.scaleX).toBe(1);
    expect(t.scaleY).toBeCloseTo(400 / 560, 10);
    expect(t.offsetY).toBeCloseTo((1 - 400 / 560) / 2, 10);
    expect(t.offsetX).toBe(0);
  });

  it("crops left/right for a canvas taller than the image", () => {
    // Canvas 400x800 (aspect 0.5), image 800x560 (aspect 10/7): cover scales
    // the image to 800 tall, so only 400/(800*10/7) of its width shows.
    const t = coverTransform(400, 800, 800, 560);
    expect(t.scaleY).toBe(1);
    expect(t.scaleX).toBeCloseTo(0.5 / (10 / 7), 10);
    expect(t.offsetX).toBeCloseTo((1 - 0.5 / (10 / 7)) / 2, 10);
    expect(t.offsetY).toBe(0);
  });

  it("maps degenerate sizes to identity, never NaN", () => {
    for (const t of [
      coverTransform(0, 400, 800, 560),
      coverTransform(400, 0, 800, 560),
      coverTransform(400, 400, 0, 560),
      coverTransform(400, 400, 800, 0),
    ]) {
      expect(t).toEqual({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
      expect(Number.isNaN(t.scaleX + t.scaleY + t.offsetX + t.offsetY)).toBe(
        false,
      );
    }
  });
});

describe("chromaticShiftForPointer", () => {
  it("is exactly zero at the center", () => {
    expect(chromaticShiftForPointer(0, 0, 0.01)).toEqual({ x: 0, y: 0 });
  });

  it("scales with the pointer offset and flips screen y into texture y", () => {
    expect(chromaticShiftForPointer(1, 1, 0.01)).toEqual({ x: 0.01, y: -0.01 });
    expect(chromaticShiftForPointer(-0.5, 0.5, 0.02)).toEqual({
      x: -0.01,
      y: -0.01,
    });
  });
});

describe("tiltForPointer", () => {
  it("is exactly zero at the center and follows the pointer at the edges", () => {
    expect(tiltForPointer(0, 0, 4)).toEqual({ rotateX: 0, rotateY: 0 });
    expect(tiltForPointer(1, -1, 4)).toEqual({ rotateX: 4, rotateY: 4 });
  });
});
