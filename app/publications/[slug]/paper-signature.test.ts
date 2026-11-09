import { describe, expect, it } from "vitest";

import { SIGNATURE_STROKES, signatureDrawDuration } from "./paper-signature";

describe("SIGNATURE_STROKES", () => {
  it("draws the name scrawl first, then the underline flourish", () => {
    expect(SIGNATURE_STROKES).toHaveLength(2);
    expect(SIGNATURE_STROKES[0].duration).toBe(1.15);
    expect(SIGNATURE_STROKES[1].delay).toBe(0.95);
  });

  it("keeps the whole draw under 1.6s", () => {
    expect(signatureDrawDuration()).toBeLessThanOrEqual(1.6);
    expect(signatureDrawDuration()).toBeCloseTo(1.45, 10);
  });

  it("uses absolute move-to path data only (no font, no text)", () => {
    for (const stroke of SIGNATURE_STROKES) {
      expect(stroke.d.startsWith("M ")).toBe(true);
      expect(stroke.d).toMatch(/^[MC0-9 .-]+$/);
    }
  });
});
