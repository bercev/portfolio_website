import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { THEME_PALETTES } from "./theme-palette";

/**
 * Contrast regression guard for the design tokens (research iter 36,
 * dev.to "The Contrast Ratio Bug Hiding in Your Color Palette").
 *
 * Contrast is a number, not a vibe — so this test reads app/globals.css,
 * resolves the actual token values (including the oklch color-mix used for
 * the light-mode accent), and asserts WCAG ratios: 4.5:1 for text, 3:1 for
 * UI-component rings. If a token declaration stops matching the patterns
 * below, the test throws instead of silently passing.
 */

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function blockOf(selector: RegExp): string {
  const m = selector.exec(css);
  if (!m) throw new Error(`contrast guard: selector not found: ${selector}`);
  return m[1];
}

function decl(block: string, name: string): string {
  const m = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(block);
  if (!m) throw new Error(`contrast guard: declaration not found: ${name}`);
  return m[1].trim();
}

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) throw new Error(`contrast guard: bad hex ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function parseRgba(value: string): { rgb: RGB; alpha: number } {
  const m =
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/.exec(value);
  if (!m) throw new Error(`contrast guard: bad rgba ${value}`);
  return {
    rgb: [Number(m[1]), Number(m[2]), Number(m[3])],
    alpha: m[4] === undefined ? 1 : Number(m[4]),
  };
}

function composite(fg: RGB, alpha: number, bg: RGB): RGB {
  return [
    fg[0] * alpha + bg[0] * (1 - alpha),
    fg[1] * alpha + bg[1] * (1 - alpha),
    fg[2] * alpha + bg[2] * (1 - alpha),
  ];
}

function relLuminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// --- oklch color-mix resolution (mirrors the CSS `color-mix(in oklch, …)`) ---

function srgbToOklch([r, g, b]: RGB): [number, number, number] {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const [l_, m_, s_] = [l, m, s].map((v) => Math.cbrt(v));
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360];
}

function oklchToSrgb(L: number, C: number, hDeg: number): RGB {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, m, s] = [l_, m_, s_].map((v) => v ** 3);
  const enc = (c: number) => {
    const x = Math.min(Math.max(c, 0), 1);
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  };
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.round(enc(c) * 255)) as RGB;
}

function mixOklch(first: RGB, firstPct: number, second: RGB): RGB {
  const [L1, C1, h1] = srgbToOklch(first);
  const [L2, C2] = srgbToOklch(second);
  const p = firstPct / 100;
  // The darkening partner is achromatic, so hue interpolation is moot.
  return oklchToSrgb(p * L1 + (1 - p) * L2, p * C1 + (1 - p) * C2, h1);
}

const lightBg = hexToRgb(decl(blockOf(/:root\s*\{([^}]*)\}/), "--background"));

function resolveLightAccent(palette: string): RGB {
  const lightBlock = blockOf(/html:not\(\.dark\)\s*\{([^}]*)\}/);
  const value = decl(lightBlock, "--portfolio-accent");
  const mix = /color-mix\(\s*in oklch\s*,\s*var\(--accent-neon\)\s*([\d.]+)%\s*,\s*(#[0-9a-fA-F]{6})\s*\)/.exec(
    value,
  );
  if (mix) {
    const neonBlock = blockOf(new RegExp(`\\[data-palette="${palette}"\\]\\s*\\{([^}]*)\\}`));
    return mixOklch(hexToRgb(decl(neonBlock, "--accent-neon")), Number(mix[1]), hexToRgb(mix[2]));
  }
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return hexToRgb(value);
  throw new Error(`contrast guard: unrecognized --portfolio-accent in light mode: ${value}`);
}

describe("design-token contrast", () => {
  it("keeps the contact-form placeholder at 4.5:1 on the dark input", () => {
    const placeholder = parseRgba(
      decl(blockOf(/\.journey-contact-form-input::placeholder\s*\{([^}]*)\}/), "color"),
    );
    const inputBg = parseRgba(
      decl(blockOf(/\.journey-contact-form-input\s*\{([^}]*)\}/), "background"),
    );
    // The input is near-opaque dark in both modes; check it against both
    // dark page surfaces it can composite over.
    const surfaces = [
      hexToRgb(decl(blockOf(/html\[data-ascii="active"\]\s*\{([^}]*)\}/), "--background")),
      hexToRgb(decl(blockOf(/\.dark\s*\{([^}]*)\}/), "--background")),
    ];
    for (const surface of surfaces) {
      const filled = composite(inputBg.rgb, inputBg.alpha, surface);
      const ratio = contrast(composite(placeholder.rgb, placeholder.alpha, filled), filled);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the light-mode accent text at 4.5:1 for every palette", () => {
    for (const palette of Object.keys(THEME_PALETTES)) {
      const ratio = contrast(resolveLightAccent(palette), lightBg);
      expect(
        ratio,
        `light --portfolio-accent (${palette}) on ${decl(blockOf(/:root\s*\{([^}]*)\}/), "--background")}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the light-mode ring at the 3:1 UI-component floor", () => {
    const root = blockOf(/:root\s*\{([^}]*)\}/);
    expect(contrast(hexToRgb(decl(root, "--ring")), lightBg)).toBeGreaterThanOrEqual(3);
  });
});
