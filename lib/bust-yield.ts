/**
 * bust-yield — the portrait bust yields to content (run 9, RUN9-BUST-OVERLAP).
 *
 * The fixed particle bust sits at the right of the viewport, vertically
 * centered, above the background but below page content (z-8 vs z-10). At
 * 1440px its 300px box overlaps the content column's right ~130px strip, so
 * the bright dot dome crowds the Experience stack (chips half-swallowed)
 * and the About Education panel's right edge ("Computer Systems Design"
 * ends tight to the dome). Shifting the bust column cannot
 * fix this at 1440px — clearing the column would shrink it to a postage
 * stamp — so the bust fades instead: whenever real content scrolls under
 * its box it yields to a faint ghost (0.12) and returns to full presence
 * (0.65) when the field is clear. The hero stays bright; the reading
 * sections stay calm.
 *
 * Detection is a 4x4 elementFromPoint grid inside the bust box (inset 15%
 * so samples land on the figure's core, not the faded mask rim). A point
 * counts as covered when the topmost element is real content — leaf text,
 * an interactive element, an opaque background, or a visible border — with
 * the BERAT band, canvases, and anything outside <main> excluded (the DOM
 * classifier lives in particle-portrait-bust.tsx; this module holds only
 * the pure, server-safe geometry + decision logic, unit-tested here).
 *
 * Hysteresis keeps the fade from flapping as content edges cross the
 * grid: yield at >= 3 covered points, restore at <= 1, hold in between.
 * Calibrated on HEAD 3ec642e (vf-run9-iter36-density.js): hero 0/16,
 * Experience stack 3/16, About panel 12/16, project sheet 4/16.
 */

export const BUST_YIELD_GRID = 4;
export const BUST_YIELD_INSET = 0.15;
/** Yield once this many of the 16 sample points are covered. */
export const BUST_YIELD_ON = 3;
/** Restore once covered points fall to this many. */
export const BUST_YIELD_OFF = 1;
/** Full-presence opacity of the bust box (the run-9 round-4 value). */
export const BUST_BRIGHT_OPACITY = 0.65;
/** Yielded opacity — a faint ghost; text reads on a calm field. */
export const BUST_YIELDED_OPACITY = 0.12;
/** Fade duration for the yield transition (ms). */
export const BUST_YIELD_FADE_MS = 600;
/** Re-sample interval (ms) — catches layout changes that fire no scroll
 * event (case-study expand, marquee drift) without a scroll listener. */
export const BUST_YIELD_RESAMPLE_MS = 500;

export type BustRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type BustSamplePoint = { x: number; y: number };

/** Grid of sample points inside a rect, inset so the rim is not sampled. */
export function bustYieldSamplePoints(
  rect: BustRect,
  grid: number = BUST_YIELD_GRID,
  inset: number = BUST_YIELD_INSET,
): BustSamplePoint[] {
  const points: BustSamplePoint[] = [];
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const fx = grid === 1 ? 0.5 : inset + (1 - 2 * inset) * (c / (grid - 1));
      const fy = grid === 1 ? 0.5 : inset + (1 - 2 * inset) * (r / (grid - 1));
      points.push({
        x: rect.left + rect.width * fx,
        y: rect.top + rect.height * fy,
      });
    }
  }
  return points;
}

/**
 * Hysteresis decision: yield at >= ON, restore at <= OFF, otherwise hold
 * the previous state so content edges crossing the grid cannot flap the
 * fade.
 */
export function nextBustYielded(
  prevYielded: boolean,
  coveredCount: number,
): boolean {
  if (coveredCount >= BUST_YIELD_ON) return true;
  if (coveredCount <= BUST_YIELD_OFF) return false;
  return prevYielded;
}

/** The bust box opacity for a yielded / bright state. */
export function bustYieldOpacity(yielded: boolean): number {
  return yielded ? BUST_YIELDED_OPACITY : BUST_BRIGHT_OPACITY;
}

/**
 * Alpha channel of an `rgb()` / `rgba()` color string; 1 for `rgb()`,
 * 0 for `transparent` / unparsable input.
 */
export function cssColorAlpha(color: string): number {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return 0;
  const parts = match[1].split(",").map((s) => parseFloat(s));
  if (parts.some((p) => Number.isNaN(p))) return 0;
  return parts.length === 4 ? parts[3] : 1;
}
