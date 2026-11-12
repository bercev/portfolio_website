// Pure model for the scroll-linked curtain reveal on project case
// figures (RUN10-CURTAIN): reel 7 flow / motion.dev free Scroll Image
// Reveal pattern, rebuilt in the site's own Motion stack — no new
// dependency, and NOT the paid Motion+ curtains() API (paid, access
// token — never adopt it).
//
// As a case-study figure scrolls through the viewport, a clip-path
// curtain opens from the center — inset(50% 0% 50% 0%) at entry,
// inset(0% 0% 0% 0%) once the figure is well in view — while the
// figure itself drifts gently against the scroll (parallax), so the
// reveal reads as light opening over the diagram rather than a
// hard cut. The mapping is LINEAR in scroll progress: the curtain
// tracks the scroll exactly, so the reader controls the reveal and
// a probe can pin the clip to the scroll position with no spring lag
// to chase.
//
// Scoped to the architecture diagrams inside the expanded case-study
// panels (Vitae + AI Discord Chatbot) — the only figures in the
// panels. The paper-page figures keep their iter-5 glow-in, and the
// rest-row previews keep their LIQUID/FOIL treatment. Reduced motion
// renders the figure fully (see case-curtain.tsx); print forces the
// curtain open via the @media print rule in globals.css, so the
// diagram is never clipped in the paper record.
export const CURTAIN_OPEN_END = 0.45;

/** The clip inset (percent of the figure's height, top + bottom) when the curtain is fully closed. */
export const CURTAIN_MAX_INSET_PCT = 50;

/** The parallax drift amplitude, in pixels — the figure travels +14px to -14px across its viewport journey. */
export const CURTAIN_PARALLAX_PX = 14;

/** Clamp a number into [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The clip-path inset percentage (top and bottom) at scroll progress
 * `p` (0 = figure's top just entering the viewport bottom, 1 = figure's
 * bottom just leaving the viewport top). Linear from 50% closed to 0%
 * open across the first 45% of the journey, then fully open.
 */
export function caseCurtainInsetAt(p: number): number {
  const progress = clamp(p, 0, 1);
  if (progress >= CURTAIN_OPEN_END) return 0;
  return CURTAIN_MAX_INSET_PCT * (1 - progress / CURTAIN_OPEN_END);
}

/**
 * The CSS clip-path value at scroll progress `p` — a center-opening
 * curtain: the top and bottom edges travel outward from the middle
 * together, so the diagram's center line is the first thing revealed.
 */
export function caseCurtainClipAt(p: number): string {
  const inset = caseCurtainInsetAt(p);
  return `inset(${inset}% 0% ${inset}% 0%)`;
}

/**
 * The figure's vertical parallax offset (pixels) at scroll progress
 * `p`: +14px as the figure enters (sitting low), drifting to -14px
 * as it leaves (sitting high) — the figure travels slightly faster
 * than the page, so it reads as carried by the scroll. The 14px
 * amplitude stays inside the 16px gap between detail sections plus
 * the figure's own 12px top margin, so the drifting figure never
 * overlaps the section head above or the next section below.
 */
export function caseCurtainParallaxYAt(p: number): number {
  const progress = clamp(p, 0, 1);
  return CURTAIN_PARALLAX_PX - 2 * CURTAIN_PARALLAX_PX * progress;
}

/**
 * The opacity of the curtain's glowing leading edges at scroll
 * progress `p`. The edges are the curtain made visible — without
 * them a node straddling the clip reads as a broken box (run-10
 * iter 40: the mobile critic caught the Merge engine box severed
 * mid-frame at p=0.15, its top border gone while the node was fully
 * lit). With a light lip riding each cut, the severed edge reads as
 * "behind the curtain", not broken. Full strength while the curtain
 * is travelling, fading out over the last stretch so the settled
 * figure is clean — no lines across it.
 */
export function caseCurtainEdgeOpacityAt(p: number): number {
  const progress = clamp(p, 0, 1);
  if (progress <= 0.3) return 1;
  if (progress >= CURTAIN_OPEN_END) return 0;
  return 1 - (progress - 0.3) / (CURTAIN_OPEN_END - 0.3);
}
