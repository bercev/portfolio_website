/**
 * Scroll-linked word reveal for the About bio lede (run-3 iter 24,
 * research survivor from iter 22: Magic UI Text Reveal / Aceternity
 * Sticky Scroll Reveal word-level pattern, minus the sticky container,
 * hand-rolled — no new dependency).
 *
 * The lede paragraph's words fade from a readable floor to full opacity
 * one by one as the paragraph travels up the viewport. Words are never
 * invisible: the floor keeps the lede legible even before the reveal
 * starts, and reduced-motion readers get full opacity via CSS (see
 * globals.css — a media query, never a conditional render, so there is
 * no SSR/client hydration mismatch).
 */

/** Lowest word opacity — the lede stays readable before/during reveal. */
export const WORD_REVEAL_FLOOR = 0.4;

/** Viewport-height fraction where the reveal starts (lede top here). */
export const WORD_REVEAL_START = 0.85;

/** Viewport-height fraction where the reveal completes (lede top here). */
export const WORD_REVEAL_END = 0.3;

/**
 * Reveal progress (0–1) from the lede paragraph's top edge and the
 * viewport height. 0 while the top is at/below the start fraction,
 * 1 once it reaches the end fraction, linear between.
 */
export function ledeRevealProgress(
  rectTopPx: number,
  viewportHeightPx: number,
): number {
  if (!(viewportHeightPx > 0)) return 1;
  const startPx = viewportHeightPx * WORD_REVEAL_START;
  const endPx = viewportHeightPx * WORD_REVEAL_END;
  const raw = (startPx - rectTopPx) / (startPx - endPx);
  if (raw <= 0) return 0;
  if (raw >= 1) return 1;
  return raw;
}

/**
 * Opacity for word `index` of `wordCount` at overall `progress`:
 * words light up in order, each completing over its 1/wordCount slice
 * of the progress range, never dropping below the floor.
 */
export function wordRevealOpacity(
  progress: number,
  index: number,
  wordCount: number,
): number {
  if (!(wordCount > 0)) return 1;
  const p = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
  const lit = p * wordCount - index;
  const t = lit <= 0 ? 0 : lit >= 1 ? 1 : lit;
  return WORD_REVEAL_FLOOR + (1 - WORD_REVEAL_FLOOR) * t;
}
