/**
 * Edge-aware glyph selection for the portrait bust's point-relief
 * renderer (run-2 iter 32, from the research item "edge-aware ASCII for
 * the portrait bust", GlyphX mechanism).
 *
 * The bust's renderer is pure luminance-depth: every point draws a
 * character from a density ramp, so contours are only as crisp as the
 * ramp's brightness steps. Where the source image has a strong edge, a
 * direction-matched glyph (`-`, `|`, `/`, `\`) traces the contour
 * instead — one character per point, so the swap is density-neutral:
 * the point count and the alpha path are untouched, only the glyph
 * changes, and only at strong edges.
 *
 * Coordinates are screen space in the source image: x right, y DOWN
 * (canvas convention). The edge direction is the gradient rotated 90°:
 * direction = (-gy, gx) / magnitude. A vertical edge (strong gx) runs
 * vertically, so it draws `|`; a horizontal edge draws `-`; a diagonal
 * edge draws `/` when its slope is negative (up-right) and `\` when
 * positive (down-right).
 *
 * The head rotates in 3D, but glyphs are screen-aligned (the canvas
 * draws unrotated characters), so the direction must be re-projected
 * per frame: yaw compresses the horizontal component by cos(yaw) and
 * pitch compresses the vertical component by cos(pitch). At front view
 * (cos = 1) the projected glyph is exactly the source glyph; as the
 * head turns toward ~57°, vertical contours lean into diagonals —
 * which is what a turned contour actually looks like in projection.
 * Ignoring the depth (w) change along the edge is a deliberate
 * approximation: it keeps the classification a pure 2D function, and a
 * misclassified diagonal still reads as contour texture, never as a
 * brightness error.
 *
 * Blur caveat (from the research item): the user's 5px scroll blur eats
 * exactly the edge detail this buys, so the payoff concentrates at
 * hero / early chapters (blur 0–2.5px). At deep scroll the swap is
 * still harmless — blurred edge glyphs are blurred texture, same as
 * blurred ramp glyphs — so there is no depth-gated branch to audit.
 */

/** Sobel magnitude below this is not an edge: fall back to the ramp. */
export const BUST_EDGE_THRESHOLD = 0.3;

/** Sobel gradients, normalized so a full 0→1 step edge reads 1.0. */
export function sobelGradient(
  lum: readonly number[],
  w: number,
  h: number,
  x: number,
  y: number,
): { readonly gx: number; readonly gy: number } {
  // Border replication: clamp coordinates instead of zero-padding, so
  // the silhouette's outer ring still gets a real gradient.
  const at = (xx: number, yy: number): number => {
    const cx = Math.min(w - 1, Math.max(0, xx));
    const cy = Math.min(h - 1, Math.max(0, yy));
    return lum[cy * w + cx];
  };
  const gx =
    (at(x + 1, y - 1) +
      2 * at(x + 1, y) +
      at(x + 1, y + 1) -
      (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1))) /
    4;
  const gy =
    (at(x - 1, y + 1) +
      2 * at(x, y + 1) +
      at(x + 1, y + 1) -
      (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1))) /
    4;
  return { gx, gy };
}

/**
 * Unit edge direction for a gradient, or null when the gradient is
 * degenerate (NaN, or below threshold). The direction is normalized so
 * the caller never needs the magnitude again.
 */
export function edgeDirection(
  gx: number,
  gy: number,
  threshold: number = BUST_EDGE_THRESHOLD,
): { readonly eu: number; readonly ev: number } | null {
  const mag = Math.hypot(gx, gy);
  if (!Number.isFinite(mag) || mag < threshold) return null;
  // Edge direction = gradient rotated 90°: (-gy, gx), normalized.
  // -0 normalizes to 0 so a pure-axis edge never carries a sign flip.
  const eu = -gy / mag;
  const ev = gx / mag;
  return { eu: eu === 0 ? 0 : eu, ev: ev === 0 ? 0 : ev };
}

/**
 * Direction-matched glyph for a unit edge direction (eu, ev), screen
 * space, y down. Dominance ratio 2:1 keeps near-axis edges axis-aligned
 * instead of flickering between glyphs on small direction changes.
 */
export function glyphForDirection(eu: number, ev: number): string {
  const ax = Math.abs(eu);
  const ay = Math.abs(ev);
  if (ax >= 2 * ay) return "-";
  if (ay >= 2 * ax) return "|";
  // Diagonal: slope ev/eu positive (down-right) => `\`, else `/`.
  return eu * ev > 0 ? "\\" : "/";
}

/**
 * Full pipeline for one source point: Sobel direction → glyph, or null
 * (caller falls back to the luminance ramp). Kept separate from
 * edgeDirection so the renderer can precompute directions once at
 * sample time and re-project them per frame without re-running Sobel.
 */
export function edgeGlyphForGradient(
  gx: number,
  gy: number,
  threshold: number = BUST_EDGE_THRESHOLD,
): string | null {
  const dir = edgeDirection(gx, gy, threshold);
  return dir === null ? null : glyphForDirection(dir.eu, dir.ev);
}

/**
 * Re-project a precomputed source edge direction through the head's
 * yaw/pitch and return the glyph that traces the projected contour.
 * cosYaw/cosPitch are exactly 1 at front view, so the result there is
 * the source glyph. Degenerate cosines (0) collapse one axis, which is
 * the correct projection behaviour (a 90°-turned contour is a line).
 */
export function projectedEdgeGlyph(
  eu: number,
  ev: number,
  cosYaw: number,
  cosPitch: number,
): string {
  return glyphForDirection(eu * cosYaw, ev * cosPitch);
}
