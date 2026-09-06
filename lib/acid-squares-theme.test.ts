import { describe, expect, it } from "vitest";

import {
  ACID_SQUARES_HIGH_SPREAD_TONE_POWER,
  ACID_SQUARES_SPREAD_CEILING,
  getAcidSquaresTheme,
} from "./acid-squares-theme";

describe("getAcidSquaresTheme", () => {
  it("uses ink-on-paper wash stops in light mode", () => {
    expect(getAcidSquaresTheme(false)).toEqual({
      colors: ["#ffffff", "#000000", "#30383e"],
      spread: 0.48,
      inkOnPaper: true,
    });
  });

  it("uses caustic glow stops in dark mode", () => {
    expect(getAcidSquaresTheme(true)).toEqual({
      colors: ["#000000", "#ffffff", "#eff8fb"],
      spread: 0.42,
      inkOnPaper: false,
    });
  });

  it("allows and tone-maps the requested high dark spread", () => {
    expect(ACID_SQUARES_SPREAD_CEILING).toBeGreaterThanOrEqual(1.17);
    expect(ACID_SQUARES_HIGH_SPREAD_TONE_POWER).toBe(0.1);
  });

  it("tints only the ink stop in dark mode so the wash keeps its depth", () => {
    expect(getAcidSquaresTheme(true, "#a855f7")).toEqual({
      colors: ["#000000", "#a855f7", "#bc95f6"],
      spread: 0.42,
      inkOnPaper: false,
    });
  });

  it("darkens the accent toward ink in light mode so paper stays paper", () => {
    const { colors, inkOnPaper } = getAcidSquaresTheme(false, "#00d8ff");
    expect(colors[0]).toBe("#ffffff");
    expect(colors[1]).toBe("#075d75");
    expect(colors[2]).toBe("#35748a");
    expect(inkOnPaper).toBe(true);
  });

  it("keeps the monochrome ink body when no accent is selected", () => {
    expect(getAcidSquaresTheme(false, undefined).colors[1]).toBe("#000000");
    expect(getAcidSquaresTheme(true, undefined).colors[1]).toBe("#ffffff");
  });
});
