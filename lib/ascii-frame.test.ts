import { describe, expect, it } from "vitest";

import { imageDataToAscii, luminanceToGlyph } from "./ascii-frame";

describe("luminanceToGlyph", () => {
  it("maps the darkest and brightest values to opposite glyph extremes", () => {
    expect(luminanceToGlyph(0, " .#")).toBe(" ");
    expect(luminanceToGlyph(255, " .#")).toBe("#");
  });

  it("clamps luminance values outside the byte range", () => {
    expect(luminanceToGlyph(-10, " .#")).toBe(" ");
    expect(luminanceToGlyph(300, " .#")).toBe("#");
  });
});

describe("imageDataToAscii", () => {
  it("samples RGBA image data into stable rows", () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 0, 0, 0, 255,
    ]);

    expect(
      imageDataToAscii({
        data,
        width: 2,
        height: 2,
        cellSize: 1,
        glyphs: " .#",
      }),
    ).toBe(" #\n# ");
  });

  it("averages partial cells without reading beyond image bounds", () => {
    const data = new Uint8ClampedArray([
      255, 255, 255, 255,
      255, 255, 255, 255,
      0, 0, 0, 255,
    ]);

    expect(
      imageDataToAscii({
        data,
        width: 3,
        height: 1,
        cellSize: 2,
        glyphs: " .#",
      }),
    ).toBe("# ");
  });
});
