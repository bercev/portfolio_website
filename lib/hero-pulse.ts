// Hero / rail pulse rings (RUN10-PULSE, 60fps Revolut RevPoints
// coachmark border pulse, shots #2139/#2117) — pure timing math for the
// soft expanding ring in FROST cyan that marks the hero CTA and the
// active chapter. One ring language, three sizes: the hero CTA pill,
// the active rail chapter chip, and the mobile ribbon's glow dot.
//
// Shape of one cycle (reel-4 timing: the expansion is a 200ms
// ease-out, matching the site's 200ms ease-out transitions; the fade
// is a slow linear exhale, then a long rest so the pulse reads as a
// calm coachmark blink, not a strobe):
//   0–200ms   expand: scale 1 → peak, opacity 0 → 0.55 (easeOutCubic)
//   200–980ms fade:   scale peak → end, opacity 0.55 → 0 (linear)
//   980–2800ms rest:  scale end, opacity 0
// The CSS keyframes (globals.css `hero-cta-pulse-ring`, the rail and
// ribbon module keyframes) encode the same percentages — 7.14% is
// 200ms of the 2800ms cycle, 35% is 980ms — so a WAAPI freeze at a
// given currentTime must match this model exactly.
//
// Scales are per-axis ({x, y}): the desktop CTA, rail chip, and
// ribbon dot all expand uniformly, but the mobile CTA pill is
// full-width (351px in a 390px viewport), so a uniform 1.16× ring
// would clip past the viewport sides and read as two bars instead of
// a ring (iter-28 mobile critic). Under 560px the ring expands
// elliptically instead — barely wider, much taller — so the closed
// outline always stays inside the viewport (see
// HERO_CTA_PULSE_NARROW_* and the fit test below).

/** One full pulse cycle, milliseconds. */
export const HERO_PULSE_CYCLE_MS = 2800;
/** The expansion phase — reel-4's 200ms ease-out. */
export const HERO_PULSE_EXPAND_MS = 200;
/** The fade phase after the expansion. */
export const HERO_PULSE_FADE_MS = 780;
/** Peak ring opacity (border alpha is 55% on top of this). */
export const HERO_PULSE_PEAK_OPACITY = 0.55;

/** Per-axis ring scale. */
export type PulseScale = {
  readonly x: number;
  readonly y: number;
};

/** CTA pill ring (desktop, uniform): scale at the end of the 200ms expansion. */
export const HERO_CTA_PULSE_PEAK_SCALE: PulseScale = { x: 1.12, y: 1.12 };
/** CTA pill ring (desktop, uniform): scale when the fade reaches opacity 0. */
export const HERO_CTA_PULSE_END_SCALE: PulseScale = { x: 1.16, y: 1.16 };
/**
 * CTA pill ring (≤560px, elliptical): the pill is full-width, so the
 * ring grows tall instead of wide. Ring box is 359×46 (351px pill +
 * 2×4px inset); at the end scale it spans 377×67 — 7px clear of each
 * viewport side at 390px, with a ~13px gap top and bottom. The
 * vertical travel (1.28 → 1.45) is what the eye tracks.
 */
export const HERO_CTA_PULSE_NARROW_PEAK_SCALE: PulseScale = { x: 1.03, y: 1.28 };
export const HERO_CTA_PULSE_NARROW_END_SCALE: PulseScale = { x: 1.05, y: 1.45 };
/** Mobile CTA pill width at 390px (measured), for the fit check. */
export const HERO_CTA_MOBILE_PILL_WIDTH_PX = 351;
/** Ring inset around the pill, px (globals.css `.hero-cta-pulse`). */
export const HERO_CTA_PULSE_INSET_PX = 4;
/** Narrowest viewport the ring must fit (390px phone). */
export const HERO_CTA_NARROW_VIEWPORT_PX = 390;
/** Rail chapter-chip ring: the chip is small, so the ring travels further. */
export const RAIL_PULSE_PEAK_SCALE: PulseScale = { x: 1.25, y: 1.25 };
export const RAIL_PULSE_END_SCALE: PulseScale = { x: 1.45, y: 1.45 };
/** Mobile ribbon dot ring: the dot is a 9px glyph, the ring is an 11px circle. */
export const RIBBON_PULSE_PEAK_SCALE: PulseScale = { x: 1.6, y: 1.6 };
export const RIBBON_PULSE_END_SCALE: PulseScale = { x: 2.2, y: 2.2 };

/** easeOutCubic — the CSS cubic-bezier(0.215, 0.61, 0.355, 1) equivalent. */
export function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}

export type PulseRingState = {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly opacity: number;
};

/**
 * Ring state at wall-clock `timeMs` into the looping cycle, for a ring
 * that expands from scale 1 to `peakScale` and fades out at `endScale`.
 * Negative times wrap (the cycle is a loop, so any phase is valid).
 */
export function heroPulseRingAt(
  timeMs: number,
  peakScale: PulseScale,
  endScale: PulseScale,
): PulseRingState {
  const t =
    ((timeMs % HERO_PULSE_CYCLE_MS) + HERO_PULSE_CYCLE_MS) %
    HERO_PULSE_CYCLE_MS;
  if (t < HERO_PULSE_EXPAND_MS) {
    const p = easeOutCubic(t / HERO_PULSE_EXPAND_MS);
    return {
      scaleX: 1 + (peakScale.x - 1) * p,
      scaleY: 1 + (peakScale.y - 1) * p,
      opacity: HERO_PULSE_PEAK_OPACITY * p,
    };
  }
  if (t < HERO_PULSE_EXPAND_MS + HERO_PULSE_FADE_MS) {
    const p = (t - HERO_PULSE_EXPAND_MS) / HERO_PULSE_FADE_MS;
    return {
      scaleX: peakScale.x + (endScale.x - peakScale.x) * p,
      scaleY: peakScale.y + (endScale.y - peakScale.y) * p,
      opacity: HERO_PULSE_PEAK_OPACITY * (1 - p),
    };
  }
  return { scaleX: endScale.x, scaleY: endScale.y, opacity: 0 };
}
