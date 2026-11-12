// Pure model for the project-row holographic foil sheen (RUN10-FOIL):
// reel 7 holographic foil + reel 11 #20 iridescent shapes, rebuilt in
// the site's own Motion stack — no new dependency. While a project row
// is hovered/focused (desktop) or inside a tap pulse (mobile), a
// diagonal iridescent band sweeps across the liquid preview and its
// hues shift slowly, like light across a holographic foil. At rest
// there is no sheen at all; reduced motion renders the plain static
// preview (see project-preview-liquid.tsx).
//
// The band composites with `multiply` blend, NOT plain alpha and NOT
// screen blend: the screen-blend glow wash vanishes on the near-white
// Vitae screenshot (see the rim comment in globals.css), while a
// 45%-alpha normal composite washes the screenshot's small dark text
// to near-illegible at mid-sweep (iter-38 mobile critic, pixel-proven:
// zero dark-red text pixels remain under the band at 390px). Multiply
// keeps dark text dark while tinting near-white visibly, and tints the
// bright content on the dark Discord preview — no alpha value can
// satisfy both visibility and legibility, so the blend mode, not the
// number, is the fix. The transit is LINEAR — a front-
// loaded ease-out crosses a wide row in ~150ms and never reads as a
// shaft (run-10 iter-26 sign). The hue shift oscillates inside the
// cool FROST family (cyan/violet/teal), never through warm hues.

/** One sweep of the foil band across the preview, in milliseconds. */
export const FOIL_SWEEP_MS = 2800;

/** The band's width, as a percentage of the preview frame's width. */
export const FOIL_BAND_WIDTH_PCT = 45;

/**
 * The band's left edge at the start of a sweep, as a percentage of the
 * frame's width — one full band width left of the frame, fully off it.
 */
export const FOIL_BAND_START_PCT = -45;

/**
 * How far the band's left edge travels in one sweep, as a percentage
 * of the frame's width: 340% of the band's own width (45% * 3.4).
 */
export const FOIL_BAND_TRAVEL_PCT = 153;

/** The band's left edge at the end of a sweep (-45 + 153). */
export const FOIL_BAND_END_PCT = 108;

/** The band's diagonal, in degrees — the publication sweep's family. */
export const FOIL_BAND_SKEW_DEG = -12;

/** Peak alpha of the iridescent gradient: under `multiply` this is blend
 * strength, not a wash — 0.60 deepens the sheen on both previews while
 * the multiply blend keeps dark text at ~4:1 (see globals.css). */
export const FOIL_PEAK_ALPHA = 0.6;

/** One hue-oscillation cycle, in milliseconds. */
export const FOIL_HUE_CYCLE_MS = 6000;

/** Hue-rotate excursion, in degrees — stays inside the cool family. */
export const FOIL_HUE_AMPLITUDE_DEG = 30;

/** Clamp a number into [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The band's left edge (percentage of frame width) at sweep progress
 * `p` (0 = just entering, 1 = just exited). Linear — the transit
 * reads at a constant speed across the whole row.
 */
export function foilBandLeftAt(p: number): number {
  const progress = clamp(p, 0, 1);
  return FOIL_BAND_START_PCT + progress * FOIL_BAND_TRAVEL_PCT;
}

/**
 * The hue-rotate angle (degrees) at `elapsedMs` into the hue cycle:
 * a triangular wave oscillating between -30deg and +30deg, so the
 * sheen's colors drift slowly and the loop is seamless (the value at
 * the cycle's end equals the value at its start).
 */
export function foilHueAt(elapsedMs: number): number {
  const cycle = ((elapsedMs % FOIL_HUE_CYCLE_MS) + FOIL_HUE_CYCLE_MS) % FOIL_HUE_CYCLE_MS;
  const phase = cycle / FOIL_HUE_CYCLE_MS;
  const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  return -FOIL_HUE_AMPLITUDE_DEG + triangle * 2 * FOIL_HUE_AMPLITUDE_DEG;
}
