import { describe, expect, it } from "vitest";

import { normalizeTokenHex } from "./css-token-color";

const FALLBACK = "#64748b";

describe("normalizeTokenHex", () => {
  it("passes 6-digit hex through", () => {
    expect(normalizeTokenHex("#7dd3fc", FALLBACK)).toBe("#7dd3fc");
  });

  it("passes 3-digit hex through (OGL expands it)", () => {
    expect(normalizeTokenHex("#fff", FALLBACK)).toBe("#fff");
  });

  it("drops the alpha channel from 8-digit hex (Chromium's rgba serialization)", () => {
    expect(normalizeTokenHex("#eef4fa24", FALLBACK)).toBe("#eef4fa");
  });

  it("trims surrounding whitespace before matching", () => {
    expect(normalizeTokenHex("  #eef4fa24  ", FALLBACK)).toBe("#eef4fa");
  });

  it("falls back on rgb()/rgba() strings", () => {
    expect(normalizeTokenHex("rgba(238, 244, 250, 0.14)", FALLBACK)).toBe(
      FALLBACK,
    );
  });

  it("falls back on color-mix() and empty values", () => {
    expect(normalizeTokenHex("color-mix(in srgb, red 50%, transparent)", FALLBACK)).toBe(
      FALLBACK,
    );
    expect(normalizeTokenHex("", FALLBACK)).toBe(FALLBACK);
  });

  it("falls back on malformed #-prefixed values instead of throwing downstream", () => {
    expect(normalizeTokenHex("#12", FALLBACK)).toBe(FALLBACK);
    expect(normalizeTokenHex("#12345", FALLBACK)).toBe(FALLBACK);
    expect(normalizeTokenHex("#1234567", FALLBACK)).toBe(FALLBACK);
    expect(normalizeTokenHex("#gggggg", FALLBACK)).toBe(FALLBACK);
  });
});
