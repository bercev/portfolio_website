// Section-heading ASCII glow (RUN10-ASCII-GLOW, reel 7 + React Bits
// Gradient ASCII) — pure field/scramble model for a faint gradient-ASCII
// glow layer that sits behind each section heading. Distilled from the
// React Bits GradientASCII source (MIT + Commons Clause, read in full
// 2026-11-12 from the registry `GradientASCII-TS-TW` — 978 lines, zero
// npm deps); nothing installed, no WebGL2 — the reference's mechanism is
// rebuilt in the site's own Canvas2D stack, and scoped down to what the
// item asks for: a glow layer, not a background.
//
// What survives the distillation:
//   - The gradient field: a soft horizontal ramp (deep cyan -> sky ->
//     near-white) whose luminance picks the glyph, exactly like the
//     reference's tone -> glyph-index mapping.
//   - The character set: the reference's DEFAULT_CHARACTERS
//     (" =+xX0S8#@"), density-weighted presence per cell.
//   - The pointer scramble: glyphs near the pointer re-pick at ~20fps
//     for the reference's 0.7s trail lifetime, then settle back to the
//     field-determined glyph — deterministic, so the settled state is
//     stable and identical across frames.
// What is deliberately NOT adopted:
//   - The reference's WebGL2 field/halo/blur/composite pipeline and its
//     four shape modes (horizon/pinch/rise/eclipse) — the glow is one
//     horizontal ramp, sized to the heading box, drawn on Canvas2D.
//   - The click wave/burst and the 2.4s intro reveal — a heading is not
//     a click target, and the heading's own WarpText entrance already
//     owns the reveal.
//   - Cursor tracking beyond the heading: the scramble fires only on a
//     pointer pass over the heading itself (the site never follows the
//     cursor).
// The layer is faint by construction (peak alpha 0.20) and paints
// BEHIND the heading text, so legibility is structural, not tuned.

/** Character ramp, lightest -> densest (reference DEFAULT_CHARACTERS). */
export const ASCII_GLOW_CHARS = " =+xX0S8#@";
/** Glyph cell size, px — desktop. */
export const ASCII_GLOW_CELL_PX = 14;
/** Glyph cell size, px — narrow (phone) headings. */
export const ASCII_GLOW_CELL_PX_NARROW = 11;
/** Canvas width below which the narrow cell size applies. */
export const ASCII_GLOW_NARROW_WIDTH_PX = 560;
/** One slow drift of the gradient peak, ms (reference flow is a slow
 *  noise warp; here the peak sways +/-5% of the width on a 9s cycle). */
export const ASCII_GLOW_FLOW_MS = 9000;
/** How long a cell keeps re-picking after the pointer passes it
 *  (reference TRAIL_LIFE, 0.7s). */
export const ASCII_GLOW_SCRAMBLE_MS = 700;
/** Pointer scramble radius, px (reference scrambleRadius 0.1 of the
 *  band width is ~100px on a 1000px heading). */
export const ASCII_GLOW_SCRAMBLE_RADIUS_PX = 90;
/** Reference density default: fraction of cells that can carry a glyph. */
export const ASCII_GLOW_DENSITY = 0.8;
/** Faint by construction: faintest glyph alpha / brightest glyph alpha. */
export const ASCII_GLOW_BASE_ALPHA = 0.05;
export const ASCII_GLOW_PEAK_ALPHA = 0.2;
/** Light backgrounds need stronger glyphs to read at all: the same
 *  accent at 0.20 peak is a ~1-2% luminance delta on white (both
 *  critics, round 1) — effectively invisible. Light mode multiplies
 *  the alpha by this and deepens the color (below), so the bright
 *  zone reads as a wash while staying faint. */
export const ASCII_GLOW_LIGHT_ALPHA_SCALE = 2;
/** Light-mode color deepening: scale the chapter accent toward a
 *  deep tone by this factor, hue preserved (amber stays amber, cyan
 *  stays cyan — the glow tracks the per-chapter accent in both
 *  themes; Projects/Contact read warm because their preset is
 *  goldenHour, by design). */
export const ASCII_GLOW_LIGHT_DEEPEN = 0.55;

/** Glyph alpha for a field value — faint at the edges, peak 0.20 in
 *  dark mode; light mode scales up so the wash reads on white. */
export function asciiGlowAlpha(value: number, light = false): number {
  const base =
    ASCII_GLOW_BASE_ALPHA +
    (ASCII_GLOW_PEAK_ALPHA - ASCII_GLOW_BASE_ALPHA) *
      Math.min(1, Math.max(0, value));
  return light ? base * ASCII_GLOW_LIGHT_ALPHA_SCALE : base;
}

/** Light-mode glyph color: the chapter accent deepened hue-preserving
 *  so it reads on white (the reference's light branch draws ink, not
 *  glow). Dark mode instead mixes toward white for the hot core. */
export function asciiGlowLightColor(accent: {
  r: number;
  g: number;
  b: number;
}): { r: number; g: number; b: number } {
  return {
    r: Math.round(accent.r * ASCII_GLOW_LIGHT_DEEPEN),
    g: Math.round(accent.g * ASCII_GLOW_LIGHT_DEEPEN),
    b: Math.round(accent.b * ASCII_GLOW_LIGHT_DEEPEN),
  };
}
/** Glyphs re-pick every 50ms while scrambling (reference: 20fps). */
export const ASCII_GLOW_SCRAMBLE_STEP_MS = 50;

/** Cell size for a canvas of this width. */
export function asciiGlowCellSize(widthPx: number): number {
  return widthPx < ASCII_GLOW_NARROW_WIDTH_PX
    ? ASCII_GLOW_CELL_PX_NARROW
    : ASCII_GLOW_CELL_PX;
}

/** Deterministic 0..1 hash for a cell + seed (GLSL-style fract hash). */
export function asciiGlowHash(cx: number, cy: number, seed: number): number {
  const s = Math.sin(cx * 127.1 + cy * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Per-section seed from the heading id (0..63): every section's glow
 *  gets its own drift phase and cell-hash offset, so the six headings
 *  do not all paint the same field (the reference's `variation`). */
export function asciiGlowSectionSeed(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 64;
}

/** Gradient peak position across the heading, fraction of width — sways
 *  gently with the flow clock so the bright zone drifts visibly. The
 *  section seed offsets the phase so headings drift out of sync. */
export function asciiGlowPeakU(tSec: number, seed = 0): number {
  return (
    0.3 +
    0.05 *
      Math.sin(
        (tSec * 2 * Math.PI) / (ASCII_GLOW_FLOW_MS / 1000) +
          seed * (Math.PI / 8),
      )
  );
}

/** Field luminance at normalized position (u, v) and flow time tSec.
 *  A horizontal Gaussian around the drifting peak, fading to the right,
 *  times a soft vertical falloff — bright mid-heading, quiet at the
 *  edges, so the layer reads as a glow, not a box. Always in [0, 1]. */
export function asciiGlowField(
  u: number,
  v: number,
  tSec: number,
  seed = 0,
): number {
  const peak = asciiGlowPeakU(tSec, seed);
  const du = (u - peak) / 0.3;
  const horiz = Math.exp(-(du * du) / 2);
  const dv = (v - 0.5) / 0.35;
  const vert = Math.exp(-(dv * dv) / 2);
  return Math.min(1, Math.max(0, horiz * (0.55 + 0.45 * vert)));
}

/** Glyph index for a settled cell: the field value picks the ramp slot,
 *  jittered by the cell hash so neighbours vary instead of banding. */
export function asciiGlowGlyphIndex(value: number, cellHash: number): number {
  const n = ASCII_GLOW_CHARS.length;
  const raw = value * (n - 1) + (cellHash - 0.5) * 1.2;
  return Math.min(n - 1, Math.max(0, Math.floor(raw)));
}

/** Whether a cell carries a glyph at all: denser where the field is
 *  brighter (reference presence rule, density-weighted). */
export function asciiGlowCellPresent(
  value: number,
  presenceHash: number,
): boolean {
  return presenceHash < ASCII_GLOW_DENSITY * (0.35 + 0.65 * value);
}

/** Cells within the scramble radius of a pointer point (canvas px).
 *  Returns "cx,cy" keys the component stores with an expiry. */
export function asciiGlowScrambleCells(
  px: number,
  py: number,
  cols: number,
  rows: number,
  cellPx: number,
): string[] {
  const keys: string[] = [];
  const r = ASCII_GLOW_SCRAMBLE_RADIUS_PX;
  const c0 = Math.max(0, Math.floor((px - r) / cellPx));
  const c1 = Math.min(cols - 1, Math.floor((px + r) / cellPx));
  const r0 = Math.max(0, Math.floor((py - r) / cellPx));
  const r1 = Math.min(rows - 1, Math.floor((py + r) / cellPx));
  for (let cy = r0; cy <= r1; cy++) {
    for (let cx = c0; cx <= c1; cx++) {
      const dx = (cx + 0.5) * cellPx - px;
      const dy = (cy + 0.5) * cellPx - py;
      if (dx * dx + dy * dy <= r * r) keys.push(`${cx},${cy}`);
    }
  }
  return keys;
}

/** Glyph index for a scrambling cell: re-picks from the cell hash +
 *  the 50ms time step, so the cell flickers through the ramp while the
 *  pointer is near and settles (via asciiGlowGlyphIndex) after expiry. */
export function asciiGlowScrambleGlyphIndex(
  cx: number,
  cy: number,
  nowMs: number,
): number {
  const step = Math.floor(nowMs / ASCII_GLOW_SCRAMBLE_STEP_MS);
  const h = asciiGlowHash(cx, cy, step);
  return Math.floor(h * ASCII_GLOW_CHARS.length);
}

/** Whether a scramble entry is still live at nowMs. */
export function asciiGlowScrambleLive(expiryMs: number, nowMs: number): boolean {
  return nowMs < expiryMs;
}
