import { describe, expect, it } from "vitest";

import {
  PREVIEW_SWEEP_BAND_LEFT_END_PCT,
  PREVIEW_SWEEP_BAND_LEFT_START_PCT,
  PREVIEW_SWEEP_CLIP_END_PCT,
  PREVIEW_SWEEP_SHEEN_MS,
  PREVIEW_SWEEP_WIPE_MS,
  previewSweepBandLeft,
  previewSweepClip,
} from "./hover-preview-sweep";

describe("sweep timing", () => {
  it("the sheen outlasts the wipe so it trails the wipe edge instead of outrunning it", () => {
    expect(PREVIEW_SWEEP_SHEEN_MS).toBeGreaterThan(PREVIEW_SWEEP_WIPE_MS);
  });
});

describe("previewSweepClip", () => {
  it("starts fully clipped (right edge at 100%)", () => {
    expect(previewSweepClip(0)).toBe("inset(0% 100% 0% 0%)");
  });

  it("ends at the expanded inset so the offset shadow survives", () => {
    expect(previewSweepClip(1)).toBe(
      `inset(${PREVIEW_SWEEP_CLIP_END_PCT}% ${PREVIEW_SWEEP_CLIP_END_PCT}% ${PREVIEW_SWEEP_CLIP_END_PCT}% ${PREVIEW_SWEEP_CLIP_END_PCT}%)`,
    );
  });

  it("is halfway open at progress 0.5", () => {
    expect(previewSweepClip(0.5)).toBe("inset(-2.5% 47.5% -2.5% -2.5%)");
  });

  it("clamps out-of-range progress", () => {
    expect(previewSweepClip(-1)).toBe(previewSweepClip(0));
    expect(previewSweepClip(2)).toBe(previewSweepClip(1));
    expect(previewSweepClip(Number.NaN)).toBe(previewSweepClip(0));
  });

  it("opens monotonically", () => {
    const rights = [0, 0.25, 0.5, 0.75, 1].map((p) =>
      Number.parseFloat(previewSweepClip(p).split(" ")[1]),
    );
    for (let i = 1; i < rights.length; i++) {
      expect(rights[i]).toBeLessThan(rights[i - 1]);
    }
  });
});

describe("previewSweepBandLeft", () => {
  it("starts off the left edge and ends off the right edge", () => {
    expect(previewSweepBandLeft(0)).toBe(
      `${PREVIEW_SWEEP_BAND_LEFT_START_PCT}%`,
    );
    expect(previewSweepBandLeft(1)).toBe(
      `${PREVIEW_SWEEP_BAND_LEFT_END_PCT}%`,
    );
  });

  it("is mid-card at progress 0.5", () => {
    expect(previewSweepBandLeft(0.5)).toBe("42.5%");
  });

  it("travels monotonically left to right", () => {
    const lefts = [0, 0.25, 0.5, 0.75, 1].map((p) =>
      Number.parseFloat(previewSweepBandLeft(p)),
    );
    for (let i = 1; i < lefts.length; i++) {
      expect(lefts[i]).toBeGreaterThan(lefts[i - 1]);
    }
  });

  it("clamps out-of-range progress", () => {
    expect(previewSweepBandLeft(-1)).toBe(previewSweepBandLeft(0));
    expect(previewSweepBandLeft(2)).toBe(previewSweepBandLeft(1));
  });
});
