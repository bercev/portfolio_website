import { describe, expect, it } from "vitest";

import { sheetDrawDelay, sheetLabels } from "./project-sheet-frame";

describe("sheetLabels", () => {
  it("numbers sheets from 01 with the total", () => {
    expect(sheetLabels(0, 2)).toEqual({
      fig: "FIG. 01",
      sheet: "SHEET 01 / 02",
      plate: "PLATE 01",
    });
    expect(sheetLabels(1, 2)).toEqual({
      fig: "FIG. 02",
      sheet: "SHEET 02 / 02",
      plate: "PLATE 02",
    });
  });

  it("never renders a zero total", () => {
    expect(sheetLabels(0, 0)).toEqual({
      fig: "FIG. 01",
      sheet: "SHEET 01 / 01",
      plate: "PLATE 01",
    });
  });
});

describe("sheetDrawDelay", () => {
  it("starts after the 0.65s dither dissolve, staggered per row", () => {
    expect(sheetDrawDelay(0)).toBe(0.7);
    expect(sheetDrawDelay(1)).toBeCloseTo(0.73, 10);
  });
});
