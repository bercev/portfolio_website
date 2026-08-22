import { describe, expect, it } from "vitest";

import { getPrismaticPalette } from "./prismatic-palette";

describe("getPrismaticPalette", () => {
  it("keeps dark mode black with cyan and white accents", () => {
    expect(getPrismaticPalette(true)).toEqual({
      background: "#000000",
      colors: ["#000000", "#00d8ff", "#000000"],
    });
  });

  it("keeps light mode white with black and cyan accents", () => {
    expect(getPrismaticPalette(false)).toEqual({
      background: "#ffffff",
      colors: ["#ffffff", "#00d8ff", "#ffffff"],
    });
  });
});
