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
});
