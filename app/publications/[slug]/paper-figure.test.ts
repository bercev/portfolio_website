import { describe, expect, it } from "vitest";

import {
  PAPER_FIGURE_GLOW_ALPHA_PCT,
  PAPER_FIGURE_GLOW_BLUR_PX,
  PAPER_FIGURE_GLOW_SCALE,
  PAPER_FIGURE_GLOW_SPREAD_PX,
  PAPER_FIGURE_GLOW_Y_PX,
  PAPER_FIGURE_SETTLE_SCROLL_PX,
  figCaptionText,
  paperFigureGlow,
  paperFigureSettle,
} from "./paper-figure";

describe("paperFigureSettle", () => {
  it("settles inside one short scroll: the figure is still in view", () => {
    // The figure sits ~390px down at load on both widths; a settle
    // longer than that would finish with the figure off-screen.
    expect(PAPER_FIGURE_SETTLE_SCROLL_PX).toBeGreaterThan(0);
    expect(PAPER_FIGURE_SETTLE_SCROLL_PX).toBeLessThanOrEqual(300);
  });

  it("starts haloed: slightly enlarged, lifted, and glowing", () => {
    const settled = paperFigureSettle(0);
    expect(settled.scale).toBe(PAPER_FIGURE_GLOW_SCALE);
    expect(settled.scale).toBeGreaterThan(1);
    expect(settled.y).toBe(PAPER_FIGURE_GLOW_Y_PX);
    expect(settled.glow).toBe(1);
  });

  it("ends settled: scale 1, no offset, no glow", () => {
    const settled = paperFigureSettle(1);
    expect(settled.scale).toBe(1);
    expect(settled.y).toBe(0);
    expect(settled.glow).toBe(0);
  });

  it("eases monotonically between the haloed and settled states", () => {
    const samples = [0, 0.25, 0.5, 0.75, 1].map(paperFigureSettle);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].scale).toBeLessThan(samples[i - 1].scale);
      expect(samples[i].y).toBeLessThan(samples[i - 1].y);
      expect(samples[i].glow).toBeLessThan(samples[i - 1].glow);
    }
    expect(samples[2].scale).toBeCloseTo(
      (PAPER_FIGURE_GLOW_SCALE + 1) / 2,
      10,
    );
    expect(samples[2].y).toBeCloseTo(PAPER_FIGURE_GLOW_Y_PX / 2, 10);
  });

  it("clamps out-of-range progress to the end states", () => {
    expect(paperFigureSettle(-0.5)).toEqual(paperFigureSettle(0));
    expect(paperFigureSettle(1.5)).toEqual(paperFigureSettle(1));
    expect(paperFigureSettle(Number.NaN)).toEqual(paperFigureSettle(0));
  });
});

describe("paperFigureGlow", () => {
  it("is a flat transparent shadow when settled", () => {
    expect(paperFigureGlow(0)).toBe("0 0px 0px 0px rgba(0, 0, 0, 0)");
  });

  it("is an accent halo at full glow", () => {
    const glow = paperFigureGlow(1);
    expect(glow).toContain(`${PAPER_FIGURE_GLOW_BLUR_PX}px`);
    expect(glow).toContain(`${PAPER_FIGURE_GLOW_SPREAD_PX}px`);
    expect(glow).toContain("var(--accent-neon)");
    expect(glow).toContain(`${PAPER_FIGURE_GLOW_ALPHA_PCT}%`);
  });

  it("clamps glow to the end states", () => {
    expect(paperFigureGlow(-1)).toBe(paperFigureGlow(0));
    expect(paperFigureGlow(2)).toBe(paperFigureGlow(1));
  });
});

describe("figCaptionText", () => {
  it("names the first page with its real pixel dims", () => {
    expect(figCaptionText(817, 867)).toBe("First page · 817 × 867");
    expect(figCaptionText(795, 870)).toBe("First page · 795 × 870");
  });

  it("rounds fractional dims and never prints NaN or a negative", () => {
    expect(figCaptionText(817.6, 866.4)).toBe("First page · 818 × 866");
    expect(figCaptionText(Number.NaN, 0)).toBe("First page");
    expect(figCaptionText(-12, Infinity)).toBe("First page");
  });
});
