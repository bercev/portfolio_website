import { describe, expect, it } from "vitest";

import { THEME_PALETTES, THEME_SWATCH_ROWS, isThemePalette } from "./theme-palette";

describe("theme palettes", () => {
  it("provides five distinct selectable palettes", () => {
    expect(Object.keys(THEME_PALETTES)).toHaveLength(5);
    expect(new Set(Object.values(THEME_PALETTES).map((palette) => palette.accent)).size).toBe(5);
  });

  it("rejects unknown persisted palette names", () => {
    expect(isThemePalette("ocean")).toBe(true);
    expect(isThemePalette("sepia")).toBe(false);
  });

  it("keeps accent hexes aligned with CSS cursor tokens", () => {
    expect(THEME_PALETTES.ocean.accent).toBe("#00d8ff");
    expect(THEME_PALETTES.orchid.accent).toBe("#a855f7");
    expect(THEME_PALETTES.citrus.accent).toBe("#f59e0b");
    expect(THEME_PALETTES.forest.accent).toBe("#10b981");
    expect(THEME_PALETTES.rose.accent).toBe("#f43f5e");
  });

  it("lists six swatch rows: Base first, then the five palettes in order", () => {
    expect(THEME_SWATCH_ROWS).toHaveLength(6);
    expect(THEME_SWATCH_ROWS.map((row) => row.number)).toEqual([
      "00",
      "01",
      "02",
      "03",
      "04",
      "05",
    ]);
    expect(THEME_SWATCH_ROWS.map((row) => row.label)).toEqual([
      "Base",
      "Ocean",
      "Orchid",
      "Citrus",
      "Forest",
      "Rose",
    ]);
    expect(THEME_SWATCH_ROWS[0].key).toBeNull();
    expect(THEME_SWATCH_ROWS.slice(1).map((row) => row.key)).toEqual([
      "ocean",
      "orchid",
      "citrus",
      "forest",
      "rose",
    ]);
    expect(new Set(THEME_SWATCH_ROWS.map((row) => row.accent)).size).toBe(6);
  });

  it("gives Base the site default accent", () => {
    expect(THEME_SWATCH_ROWS[0].accent).toBe("#7dd3fc");
  });
});
