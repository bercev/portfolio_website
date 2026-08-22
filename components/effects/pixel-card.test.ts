import { describe, expect, it } from "vitest";

import {
  getEffectivePixelSpeed,
  PIXEL_CARD_VARIANTS,
} from "./pixel-card";

describe("PixelCard configuration", () => {
  it("provides the blue palette used by portfolio cards", () => {
    expect(PIXEL_CARD_VARIANTS.blue).toEqual({
      activeColor: "#e0f2fe",
      gap: 10,
      speed: 25,
      colors: "#e0f2fe,#7dd3fc,#0ea5e9",
      noFocus: false,
    });
  });

  it("disables pixel animation when reduced motion is enabled", () => {
    expect(getEffectivePixelSpeed(25, true)).toBe(0);
    expect(getEffectivePixelSpeed(25, false)).toBe(0.025);
  });
});
