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
  // Guard against hyphenated lookalikes: a bare `color` pattern also
  // matches inside `border-color`. The char before the property must not
  // be a word char or a hyphen (run-10 iter 52: the BibTeX copy rule's
  // `border-color` shadowed its `color` until this guard landed).
  const m = new RegExp(`(?:^|[^\\w-])${name}\\s*:\\s*([^;]+);`).exec(block);
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
const lightCard = hexToRgb(decl(blockOf(/:root\s*\{([^}]*)\}/), "--card"));

function resolvePaletteNeon(palette: string): RGB {
  const neonBlock = blockOf(new RegExp(`\\[data-palette="${palette}"\\]\\s*\\{([^}]*)\\}`));
  return hexToRgb(decl(neonBlock, "--accent-neon"));
}

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
  it("keeps the contact-form placeholder at 4.5:1 on the field-plate face", () => {
    // RUN9-FIELD-PLATES: the input is a transparent face on a numbered
    // field plate now, so the placeholder sits on the plate face —
    // color-mix(var(--card) N%, transparent) — composited over the form
    // sheet face (color-mix(var(--card) M%, transparent) over the page
    // background) in every theme. The placeholder itself is
    // color-mix(var(--muted-foreground) 85%, transparent). Resolve all
    // three mixes per theme and check the composite.
    const placeholderDecl = decl(
      blockOf(/\.journey-contact-form-input::placeholder\s*\{([^}]*)\}/),
      "color",
    );
    const phMix =
      /color-mix\(\s*in srgb\s*,\s*var\(--muted-foreground\)\s*([\d.]+)%\s*,\s*transparent\s*\)/.exec(
        placeholderDecl,
      );
    if (!phMix) {
      throw new Error(
        `contrast guard: unrecognized placeholder color-mix: ${placeholderDecl}`,
      );
    }
    const phAlpha = Number(phMix[1]) / 100;
    const plateDecl = decl(
      blockOf(/\.journey-contact-form-field\s*\{([^}]*)\}/),
      "background",
    );
    const plateMix =
      /color-mix\(\s*in srgb\s*,\s*var\(--card\)\s*([\d.]+)%\s*,\s*transparent\s*\)/.exec(
        plateDecl,
      );
    if (!plateMix) {
      throw new Error(
        `contrast guard: unrecognized field-plate background color-mix: ${plateDecl}`,
      );
    }
    const plateAlpha = Number(plateMix[1]) / 100;
    const formDecl = decl(
      blockOf(/\.journey-contact-form\s*\{([^}]*)\}/),
      "background",
    );
    const formMix =
      /color-mix\(\s*in srgb\s*,\s*var\(--card\)\s*([\d.]+)%\s*,\s*transparent\s*\)/.exec(
        formDecl,
      );
    if (!formMix) {
      throw new Error(
        `contrast guard: unrecognized form background color-mix: ${formDecl}`,
      );
    }
    const cardAlpha = Number(formMix[1]) / 100;
    const themes = [
      { name: "light", selector: /:root\s*\{([^}]*)\}/ },
      { name: "dark", selector: /\.dark\s*\{([^}]*)\}/ },
      { name: "ascii", selector: /html\[data-ascii="active"\]\s*\{([^}]*)\}/ },
    ];
    for (const { name, selector } of themes) {
      const themeBlock = blockOf(selector);
      const muted = hexToRgb(decl(themeBlock, "--muted-foreground"));
      const bg = hexToRgb(decl(themeBlock, "--background"));
      const cardDecl = decl(themeBlock, "--card");
      const card = cardDecl.startsWith("#")
        ? { rgb: hexToRgb(cardDecl), alpha: 1 }
        : parseRgba(cardDecl);
      const sheetFace = composite(card.rgb, card.alpha * cardAlpha, bg);
      const plateFace = composite(
        card.rgb,
        card.alpha * plateAlpha,
        sheetFace,
      );
      const text = composite(muted, phAlpha, plateFace);
      const ratio = contrast(text, plateFace);
      expect(
        ratio,
        `placeholder on field-plate face (${name})`,
      ).toBeGreaterThanOrEqual(4.5);
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

  it("wires every small accent text to --portfolio-accent, never the raw neon", () => {
    // RUN10-LIGHT-ACCENT (run-10 iter 52): --accent-neon is the glow /
    // cursor color — raw it reads 1.4–1.6:1 on light backgrounds (404
    // chip, plate numerals/arrows, hero verb word, author-dial ordinal,
    // BibTeX copy label). --portfolio-accent is the same hue darkened in
    // light mode (the test above pins it at 4.5:1 per palette) and
    // identical to the neon in dark/ASCII modes, so this wiring is the
    // whole fix. If a selector below stops matching, the test throws
    // instead of silently passing.
    const wired: [RegExp, string][] = [
      [/\.not-found-light-chip\s*\{([^}]*)\}/, "404 chip"],
      [/\.paper-action-plate-num\s*\{([^}]*)\}/, "plate numeral"],
      [/\.paper-action-plate-arrow\s*\{([^}]*)\}/, "plate arrow"],
      [/\[data-hero-verb-word\]\s*\{([^}]*)\}/, "hero verb word"],
      [/\.author-dial-ord\s*\{([^}]*)\}/, "author-dial ordinal"],
      [
        /\.bibtex-flow-copy:hover,\s*\.bibtex-flow-copy\[data-copied="true"\]\s*\{([^}]*)\}/,
        "BibTeX copy label",
      ],
    ];
    for (const [selector, name] of wired) {
      expect(decl(blockOf(selector), "color"), name).toBe(
        "var(--portfolio-accent)",
      );
    }
  });

  it("wires the contact gold text to the darkened token, never the raw gold", () => {
    // RUN10-LIGHT-ORANGE (run-10 iter 54): the goldenHour preset tints
    // #contact's --portfolio-accent to #ffaa50, which reads ~2:1 on
    // light backgrounds as TEXT. The four text instances below route
    // through --contact-accent-text (dark amber in true light mode,
    // unset everywhere else so the var() falls back to --portfolio-accent
    // and dark/ASCII keep the gold). If a selector below stops matching,
    // the test throws instead of silently passing.
    const wired: [RegExp, string][] = [
      [/\.journey-contact-form-flownum\s*\{([^}]*?display:\s*inline-flex[^}]*)\}/, "contact flow number"],
      [/\.journey-contact-form-label\s*\{([^}]*)\}/, "contact field label"],
      [/\.journey-elsewhere-flow-num\s*\{([^}]*)\}/, "elsewhere numeral"],
      [/\.journey-contact-glow\s*\{([^}]*)\}/, "receipt glow"],
    ];
    for (const [selector, name] of wired) {
      expect(decl(blockOf(selector), "color"), name).toBe(
        "var(--contact-accent-text, var(--portfolio-accent))",
      );
    }
  });

  it("keeps the contact gold text at 4.5:1 on every contact face in light mode", () => {
    // RUN10-LIGHT-ORANGE: resolve the token the same way the CSS
    // composes it — color-mix(in oklch, var(--accent-neon) N%, #111111)
    // with the neon the goldenHour override sets inside #contact
    // (#ffbe6e) — then check it against every surface the four wired
    // instances sit on: the page background, the form face (card 78%
    // over the page), the field-plate face (card 68% over the form
    // face — flownum/label live here), and the elsewhere/receipt face
    // (card 78% over the page, same composite as the form face).
    const goldBlock = blockOf(
      /html\[data-light-preset="goldenHour"\]\s*#contact\s*\{([^}]*)\}/,
    );
    const neon = hexToRgb(decl(goldBlock, "--accent-neon"));
    const tokenBlock = blockOf(
      /html:not\(\.dark\):not\(\[data-ascii="active"\]\)\[data-light-preset="goldenHour"\]\s*#contact\s*\{([^}]*)\}/,
    );
    const tokenValue = decl(tokenBlock, "--contact-accent-text");
    const mix =
      /color-mix\(\s*in oklch\s*,\s*var\(--accent-neon\)\s*([\d.]+)%\s*,\s*(#[0-9a-fA-F]{6})\s*\)/.exec(
        tokenValue,
      );
    if (!mix) {
      throw new Error(
        `contrast guard: unrecognized --contact-accent-text mix: ${tokenValue}`,
      );
    }
    const text = mixOklch(neon, Number(mix[1]), hexToRgb(mix[2]));
    const formDecl = decl(blockOf(/\.journey-contact-form\s*\{([^}]*)\}/), "background");
    const formMix =
      /color-mix\(\s*in srgb\s*,\s*var\(--card\)\s*([\d.]+)%\s*,\s*transparent\s*\)/.exec(
        formDecl,
      );
    if (!formMix) {
      throw new Error(`contrast guard: unrecognized form background: ${formDecl}`);
    }
    const formFace = composite(lightCard, Number(formMix[1]) / 100, lightBg);
    const fieldDecl = decl(
      blockOf(/\.journey-contact-form-field\s*\{([^}]*)\}/),
      "background",
    );
    const fieldMix =
      /color-mix\(\s*in srgb\s*,\s*var\(--card\)\s*([\d.]+)%\s*,\s*transparent\s*\)/.exec(
        fieldDecl,
      );
    if (!fieldMix) {
      throw new Error(`contrast guard: unrecognized field background: ${fieldDecl}`);
    }
    const fieldFace = composite(
      lightCard,
      Number(fieldMix[1]) / 100,
      formFace,
    );
    for (const [bg, name] of [
      [lightBg, "page background"],
      [formFace, "form face"],
      [fieldFace, "field-plate face"],
    ] as [RGB, string][]) {
      expect(
        contrast(text, bg),
        `contact gold text on ${name}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the darkened contact token out of dark and ASCII modes", () => {
    // RUN10-LIGHT-ORANGE: the token must exist ONLY under the true-light
    // guard — :not(.dark) keeps dark mode gold, :not([data-ascii="active"])
    // keeps the ASCII dark canvas gold. If the selector loses either
    // guard, the dark amber would land on a dark background.
    const tokenRule =
      /html:not\(\.dark\):not\(\[data-ascii="active"\]\)\[data-light-preset="goldenHour"\]\s*#contact\s*\{[^}]*--contact-accent-text\s*:/.exec(
        css,
      );
    expect(tokenRule, "light-only --contact-accent-text rule").not.toBeNull();
    const stray = /--contact-accent-text\s*:/g;
    const hits = [...css.matchAll(stray)].map((m) => m.index);
    expect(hits.length).toBe(1);
  });

  it("leaves goldenHour/#contact the only preset that recolors accent text", () => {
    // RUN10-LIGHT-ORANGE audit (run-10 iter 54): the only
    // data-light-preset override in the stylesheet is goldenHour on
    // #contact. Every other chapter's preset lives on the ribbon canvas
    // only and never recolors DOM text tokens — if a future preset
    // override appears, this test forces a contrast review of its text
    // instances instead of silently shipping another ~2:1 gold.
    const overrides = [
      ...css.matchAll(
        /html\[data-light-preset="([^"]+)"\]\s*#([a-z-]+)\s*\{/g,
      ),
    ].map((m) => `${m[1]} #${m[2]}`);
    expect(overrides).toEqual(["goldenHour #contact"]);
  });

  it("keeps accent text at 4.5:1 on its real background in light mode", () => {
    // RUN10-LIGHT-ACCENT: the text sits on tinted washes, not the bare
    // page — resolve each surface the same way the CSS composes it:
    // chip = the solid card face (run-10 iter 52: the old 18% neon wash
    // darkened it to 4.23:1, so the wash is gone); plate numeral/arrow =
    // 8% neon wash over the card (14% on hover, a transient state held
    // to the 3:1 floor); BibTeX copy = 68% card panel over the page. The
    // hero verb word and dial ordinal sit on the bare page, covered by
    // the --portfolio-accent test above.
    for (const palette of Object.keys(THEME_PALETTES)) {
      const accent = resolveLightAccent(palette);
      const neon = resolvePaletteNeon(palette);
      expect(
        contrast(accent, lightCard),
        `404 chip (${palette}) on its card face`,
      ).toBeGreaterThanOrEqual(4.5);
      const plateBg = composite(neon, 0.08, lightCard);
      expect(
        contrast(accent, plateBg),
        `plate numeral/arrow (${palette}) on its 8% wash`,
      ).toBeGreaterThanOrEqual(4.5);
      const plateHoverBg = composite(neon, 0.14, lightCard);
      expect(
        contrast(accent, plateHoverBg),
        `plate numeral/arrow (${palette}) on its 14% hover wash`,
      ).toBeGreaterThanOrEqual(3);
      const bibtexBg = composite(lightCard, 0.68, lightBg);
      expect(
        contrast(accent, bibtexBg),
        `BibTeX copy (${palette}) on its 68% card panel`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
