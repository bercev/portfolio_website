import { describe, expect, it } from "vitest";

import {
  ACID_SQUARES_HIGH_SPREAD_TONE_POWER,
  ACID_SQUARES_SPREAD_CEILING,
  getAcidSquaresTheme,
} from "./acid-squares-theme";

describe("getAcidSquaresTheme", () => {
  it("uses the requested light mode colors and spread", () => {
    expect(getAcidSquaresTheme(false)).toEqual({
      colors: ["#ffffff", "#000000", "#ffffff"],
      spread: 0.22,
    });
  });

  it("inverts the colors and uses the requested dark mode spread", () => {
    expect(getAcidSquaresTheme(true)).toEqual({
      colors: ["#000000", "#ffffff", "#000000"],
      spread: 0.3,
    });
  });

  it("allows and tone-maps the requested high dark spread", () => {
    expect(ACID_SQUARES_SPREAD_CEILING).toBeGreaterThanOrEqual(1.17);
    expect(ACID_SQUARES_HIGH_SPREAD_TONE_POWER).toBe(0.1);
  });

  it("replaces all three colors with a theme override", () => {
    expect(getAcidSquaresTheme(false, "#a855f7")).toEqual({
      colors: ["#a855f7", "#a855f7", "#a855f7"],
      spread: 0.22,
    });
  });
});
