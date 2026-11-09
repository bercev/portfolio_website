import { describe, expect, it } from "vitest";

import {
  THEME_LAMP_BEAM_MS,
  THEME_LAMP_FADE_MS,
  THEME_LAMP_HOLD_MS,
  lampBeamClipPath,
  lampBeamGeometry,
  lampBeamStyle,
  themeLampPreviewKey,
} from "./theme-lamp";
import { THEME_SWATCH_ROWS } from "./theme-palette";

describe("theme lamp", () => {
  it("holds ~300ms before the lamp switches on, 250ms sweep + fade", () => {
    expect(THEME_LAMP_HOLD_MS).toBe(300);
    expect(THEME_LAMP_BEAM_MS).toBe(250);
    expect(THEME_LAMP_FADE_MS).toBe(250);
  });

  it("previews the row's own key — Base previews no override", () => {
    expect(themeLampPreviewKey(THEME_SWATCH_ROWS[0])).toBeNull();
    expect(themeLampPreviewKey(THEME_SWATCH_ROWS[1])).toBe("ocean");
    expect(themeLampPreviewKey(THEME_SWATCH_ROWS[5])).toBe("rose");
  });

  it("projects leftward from the row to the viewport edge, centred on it", () => {
    const geometry = lampBeamGeometry(
      { left: 1100, right: 1400, top: 400, height: 40 },
      1440,
      800,
    );
    expect(geometry).toEqual({ left: 0, top: 270, width: 1400, height: 300 });
  });

  it("clamps the beam inside the viewport near the top edge", () => {
    const geometry = lampBeamGeometry(
      { left: 100, right: 373, top: 20, height: 36 },
      390,
      844,
    );
    expect(geometry.left).toBe(0);
    expect(geometry.top).toBe(0);
    expect(geometry.width).toBe(373);
    expect(geometry.height).toBe(300);
  });

  it("is a cone — wide at the far edge, narrow at the row", () => {
    expect(lampBeamClipPath()).toBe(
      "polygon(0 0, 0 100%, 100% 58%, 100% 42%)",
    );
  });

  it("paints the row's accent strongest at the source, sweeping from it", () => {
    const style = lampBeamStyle(
      "#f43f5e",
      { left: 0, top: 270, width: 1400, height: 300 },
    );
    expect(style.background).toContain("#f43f5e");
    expect(style.background).toContain("to left");
    expect(style.transformOrigin).toBe("right center");
    expect(style.width).toBe(1400);
    expect(style.height).toBe(300);
  });
});
