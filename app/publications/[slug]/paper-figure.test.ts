import { describe, expect, it } from "vitest";

import {
  FIG_MEASURE_DRAW_MS,
  FIG_MEASURE_OFFSET_PX,
  FIG_MEASURE_SIDE_DELAY_MS,
  FIG_MEASURE_TOP_DELAY_MS,
  PAPER_FIGURE_LIFT_SHADOW_ALPHA,
  PAPER_FIGURE_RAISED_ROTATE_DEG,
  PAPER_FIGURE_RAISED_SCALE,
  PAPER_FIGURE_RAISED_Y_PX,
  PAPER_FIGURE_SETTLE_SCROLL_PX,
  paperFigureSettle,
  paperFigureShadow,
} from "./paper-figure";

describe("paperFigureSettle", () => {
  it("settles inside one short scroll: the plate is still in view", () => {
    // The plate sits ~390px down at load on both widths; a settle
    // longer than that would finish with the plate off-screen.
    expect(PAPER_FIGURE_SETTLE_SCROLL_PX).toBeGreaterThan(0);
    expect(PAPER_FIGURE_SETTLE_SCROLL_PX).toBeLessThanOrEqual(300);
  });

  it("starts raised: enlarged, lifted, and tilted off the drawing", () => {
    const settled = paperFigureSettle(0);
    expect(settled.scale).toBe(PAPER_FIGURE_RAISED_SCALE);
    expect(settled.scale).toBeGreaterThan(1);
    expect(settled.y).toBe(PAPER_FIGURE_RAISED_Y_PX);
    expect(settled.rotate).toBe(PAPER_FIGURE_RAISED_ROTATE_DEG);
    expect(settled.rotate).toBeLessThan(0);
    expect(settled.lift).toBe(1);
  });

  it("ends settled flat: scale 1, no offset, straight, no lift", () => {
    const settled = paperFigureSettle(1);
    expect(settled.scale).toBe(1);
    expect(settled.y).toBe(0);
    expect(settled.rotate).toBe(0);
    expect(settled.lift).toBe(0);
  });

  it("eases monotonically between the raised and settled states", () => {
    const samples = [0, 0.25, 0.5, 0.75, 1].map(paperFigureSettle);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].scale).toBeLessThan(samples[i - 1].scale);
      expect(samples[i].y).toBeLessThan(samples[i - 1].y);
      expect(samples[i].rotate).toBeGreaterThan(samples[i - 1].rotate);
      expect(samples[i].lift).toBeLessThan(samples[i - 1].lift);
    }
    expect(samples[2].scale).toBeCloseTo(
      (PAPER_FIGURE_RAISED_SCALE + 1) / 2,
      10,
    );
    expect(samples[2].y).toBeCloseTo(PAPER_FIGURE_RAISED_Y_PX / 2, 10);
    expect(samples[2].rotate).toBeCloseTo(
      PAPER_FIGURE_RAISED_ROTATE_DEG / 2,
      10,
    );
  });

  it("clamps out-of-range progress to the end states", () => {
    expect(paperFigureSettle(-0.5)).toEqual(paperFigureSettle(0));
    expect(paperFigureSettle(1.5)).toEqual(paperFigureSettle(1));
    expect(paperFigureSettle(Number.NaN)).toEqual(paperFigureSettle(0));
  });
});

describe("paperFigureShadow", () => {
  it("is a flat transparent shadow when settled", () => {
    expect(paperFigureShadow(0)).toBe("0 0px 0px 0px rgba(0, 0, 0, 0)");
  });

  it("is a lifted paper shadow at full raise", () => {
    const shadow = paperFigureShadow(1);
    expect(shadow).toContain("40px");
    expect(shadow).toContain("80px");
    expect(shadow).toContain(
      `rgba(0, 0, 0, ${PAPER_FIGURE_LIFT_SHADOW_ALPHA.toFixed(3)})`,
    );
  });

  it("clamps lift to the end states", () => {
    expect(paperFigureShadow(-1)).toBe(paperFigureShadow(0));
    expect(paperFigureShadow(2)).toBe(paperFigureShadow(1));
  });
});

describe("figMeasure timing", () => {
  it("draws the top line first, then the sides, inside ~1.2s of load", () => {
    expect(FIG_MEASURE_TOP_DELAY_MS).toBeGreaterThanOrEqual(0);
    expect(FIG_MEASURE_SIDE_DELAY_MS).toBeGreaterThan(
      FIG_MEASURE_TOP_DELAY_MS,
    );
    expect(FIG_MEASURE_DRAW_MS).toBeGreaterThan(0);
    expect(FIG_MEASURE_TOP_DELAY_MS + FIG_MEASURE_DRAW_MS).toBeLessThanOrEqual(
      1000,
    );
    expect(
      FIG_MEASURE_SIDE_DELAY_MS + FIG_MEASURE_DRAW_MS,
    ).toBeLessThanOrEqual(1200);
  });

  it("sits outside the plate but inside the sheet's narrow padding", () => {
    // Plate padding is 20px at 390px; the frame must clear it.
    expect(FIG_MEASURE_OFFSET_PX).toBeGreaterThan(0);
    expect(FIG_MEASURE_OFFSET_PX).toBeLessThan(20);
  });
});
