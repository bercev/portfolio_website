import { describe, expect, it } from "vitest";

import { getPrismaticPalette } from "./prismatic-palette";

describe("getPrismaticPalette", () => {
  it("keeps dark mode black with cyan and white accents", () => {
    expect(getPrismaticPalette(true)).toEqual({
      background: "#05090d",
      colors: ["#ffffff", "#00d8ff", "#78ecff"],
    });
  });

  it("keeps light mode white with black and cyan accents", () => {
    expect(getPrismaticPalette(false)).toEqual({
      background: "#f7fbfd",
      colors: ["#05090d", "#00aeca", "#ffffff"],
    });
  });
});
