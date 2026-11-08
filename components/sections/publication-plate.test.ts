import { describe, expect, it } from "vitest";

import { plateLabels, stampDelay } from "./publication-plate";

describe("plateLabels", () => {
  it("numbers plates from 01 with the total", () => {
    expect(plateLabels(0, 2)).toEqual({
      fig: "FIG. 01",
      plate: "PLATE 01 / 02",
    });
    expect(plateLabels(1, 2)).toEqual({
      fig: "FIG. 02",
      plate: "PLATE 02 / 02",
    });
  });

  it("never renders a zero total", () => {
    expect(plateLabels(0, 0)).toEqual({
      fig: "FIG. 01",
      plate: "PLATE 01 / 01",
    });
  });
});

describe("stampDelay", () => {
  it("starts after the 0.65s dither dissolve, staggered per row", () => {
    expect(stampDelay(0)).toBe(0.7);
    expect(stampDelay(1)).toBeCloseTo(0.73, 10);
  });
});
