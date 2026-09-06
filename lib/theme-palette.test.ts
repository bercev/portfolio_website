import { describe, expect, it } from "vitest";

import { THEME_PALETTES, isThemePalette } from "./theme-palette";

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
});
