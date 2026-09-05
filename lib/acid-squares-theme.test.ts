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

  it("tints only the ink stop in dark mode so the tunnel keeps its depth", () => {
    expect(getAcidSquaresTheme(true, "#a855f7")).toEqual({
      colors: ["#000000", "#a855f7", "#000000"],
      spread: 0.3,
    });
  });

  it("darkens the accent toward ink in light mode so paper stays paper", () => {
    const { colors } = getAcidSquaresTheme(false, "#00d8ff");
    expect(colors[0]).toBe("#ffffff");
    expect(colors[2]).toBe("#ffffff");
    expect(colors[1]).toBe("#075d75");
  });

  it("keeps the monochrome stops when no accent is selected", () => {
    expect(getAcidSquaresTheme(false, undefined).colors).toEqual([
      "#ffffff",
      "#000000",
      "#ffffff",
    ]);
  });
});
