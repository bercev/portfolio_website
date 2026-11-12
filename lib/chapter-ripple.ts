// Chapter-boundary light ripples (RUN10-RIPPLE, reel 11 #4 water
// ripples; React Bits Ripple Grid / Ripple Distortion + Kokonut
// BG-10 Rain Glass + Amicro Ripple Effect as direction references,
// rebuilt in the site's own stack, zero deps) — pure timing /
// geometry for the expanding light rings a chapter change (scroll)
// or a pointer click sends across the boundary band.
//
// Shape of one ripple: three concentric rings born at the spawn
// point and expanding outward with an ease-out cubic (fast start,
// slow finish — water-like, the rings decelerate as they spread),
// each ring staggered 180ms after the previous one, so the ripple
// reads as a traveling wave, not a single outline. A short bright
// flash at the center anchors the origin (iter-29 lesson: a burst
// with no visible origin reads as ambient dust). Distinct from
// CLICK-PULSE (a traveling head along the band) and SPARKLE (a
// radial burst at the pointer): this one is a slow radial wave
// tied to the chapter handover — the boundary band is the
// viewport's middle band, where resolveActiveChapter measures the
// active chapter, so the ripple is born at the viewport center on
// a chapter change and at the click point on a pointerdown.
//
// The rings are stroked circles in the component (accent glow pass
// + bright core pass, additive in dark); this file owns only the
// motion model, so the expansion is unit-testable and the
// verification probes can predict it exactly.

/** One live ripple. `startT` is the spawn timestamp on the same
 * clock as the rAF timestamps the draw loop receives. */
export interface ChapterRipple {
  /** Spawn point, viewport css px. */
  readonly x0: number;
  readonly y0: number;
  /** Spawn timestamp (performance.now() clock). */
  readonly startT: number;
  /** Narrow-screen profile (W < 700) — smaller rings. */
  readonly narrow: boolean;
}

/** One full ripple lifetime, milliseconds. At 2400ms a pair of
 * frames ~1.2s apart shows ring 0 at ~40% vs ~95% of its max
 * radius — wholly different rings, short enough that a ripple
 * never lingers as a second background. */
export const CHAPTER_RIPPLE_DURATION_MS = 2400;
/** Rings per ripple — three staggered waves. */
export const CHAPTER_RIPPLE_RING_COUNT = 3;
/** Stagger between rings, milliseconds. */
export const CHAPTER_RIPPLE_RING_DELAY_MS = 180;
/** Max ring radius, px — desktop rings reach past the content
 * column into the margins; narrow rings stay inside 390px. Each
 * ring has its OWN max radius, stepped down 40px (35 narrow) per
 * ring: with one shared max radius the ease-out cubic saturates
 * all three at the same size and they bunch into a triple-stroke
 * outline at full expansion (desktop critic, iter 37) — stepped
 * maxima keep them ~40px apart at every age, so the wave reads
 * as spaced water ripples, not a target. */
export const CHAPTER_RIPPLE_MAX_RADIUS_DESKTOP_PX = 420;
export const CHAPTER_RIPPLE_MAX_RADIUS_NARROW_PX = 260;
export const CHAPTER_RIPPLE_RING_STEP_DESKTOP_PX = 40;
export const CHAPTER_RIPPLE_RING_STEP_NARROW_PX = 35;
/** Peak ring alpha — a bright line, not a wash: the rings are
 * thin strokes, so 0.9 reads as light, not as a veil. */
export const CHAPTER_RIPPLE_PEAK_ALPHA = 0.9;
/** Fade-in at spawn (ms) — the first ring is born, not snapped on. */
export const CHAPTER_RIPPLE_FADE_IN_MS = 100;
/** Fraction of each ring's life over which it fades out at the end
 * (the last 30% — a slow exhale, not a cutoff). */
export const CHAPTER_RIPPLE_FADE_OUT_FRACTION = 0.3;
/** Ring stroke widths, px — a wide faint glow pass under a narrow
 * bright core pass. Both thin as the ring spreads (a real ripple
 * disperses), to 55% at full radius. */
export const CHAPTER_RIPPLE_CORE_WIDTH_DESKTOP_PX = 3;
export const CHAPTER_RIPPLE_CORE_WIDTH_NARROW_PX = 2.5;
export const CHAPTER_RIPPLE_GLOW_WIDTH_DESKTOP_PX = 12;
export const CHAPTER_RIPPLE_GLOW_WIDTH_NARROW_PX = 9;
export const CHAPTER_RIPPLE_WIDTH_END_FRACTION = 0.55;
/** Center flash: radius px, lifetime ms — the drop's bright spot,
 * gone in half a second. */
export const CHAPTER_RIPPLE_FLASH_RADIUS_DESKTOP_PX = 26;
export const CHAPTER_RIPPLE_FLASH_RADIUS_NARROW_PX = 18;
export const CHAPTER_RIPPLE_FLASH_DURATION_MS = 500;
/** Max concurrent ripples — a fling across three boundaries never
 * floods the canvas; the oldest ripple is dropped, never queued. */
export const CHAPTER_RIPPLE_MAX_CONCURRENT = 3;

/** Energy floor for the rings + flash: a ripple must read as a
 * bright object on its own, wherever it spawns — same lesson as
 * the click pulse (iter 31): raw energy() falls to ~0.25 in dark
 * gaps, and a 0.25-alpha ring is a faint smudge, not a wave of
 * light. 0.75 keeps the rings unmistakable in the column and the
 * lower viewport while leaving the margins (energy already 0.8–
 * 1.0) untouched; the rings are thin strokes alive for 2.4s, so
 * the floor never washes text. */
export const CHAPTER_RIPPLE_ENERGY_FLOOR = 0.75;

/** Floor the ribbon energy for the ripple: never dimmer than the
 * floor, never brighter than the raw energy. */
export function chapterRippleEnergyAt(rawEnergy: number): number {
  return Math.max(rawEnergy, CHAPTER_RIPPLE_ENERGY_FLOOR);
}

export function chapterRippleMaxRadius(narrow: boolean, k = 0): number {
  const base = narrow
    ? CHAPTER_RIPPLE_MAX_RADIUS_NARROW_PX
    : CHAPTER_RIPPLE_MAX_RADIUS_DESKTOP_PX;
  const step = narrow
    ? CHAPTER_RIPPLE_RING_STEP_NARROW_PX
    : CHAPTER_RIPPLE_RING_STEP_DESKTOP_PX;
  return base - k * step;
}

/** Whether a ripple of this age is still alive: not yet expired
 * (age < duration). A NEGATIVE age is alive too — it means the
 * ripple was spawned after the current frame's timestamp, which
 * happens whenever a pointerdown (performance.now() clock) lands
 * between a frame's vsync time and its callback execution: under
 * slow headless rAF the callback can execute ~100ms after its
 * timestamp, so the first draw after a click can carry a timestamp
 * BEFORE the click. The draw loop clamps such ages to 0 (below),
 * so the ripple is born on the next frame instead of being pruned
 * on the first — the pre-fix click-pulse bug (iter 31). */
export function chapterRippleActive(ageMs: number): boolean {
  return Number.isFinite(ageMs) && ageMs < CHAPTER_RIPPLE_DURATION_MS;
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Envelope 0→1→0 over one ring's life: smooth fade-in over the
 * first 100ms, hold at 1, smooth fade-out over the last 30%.
 * 0 outside the window (before spawn / after expiry). */
export function chapterRippleEnvelope(ageMs: number, lifetimeMs: number): number {
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs >= lifetimeMs) return 0;
  const fadeOutStart = lifetimeMs * (1 - CHAPTER_RIPPLE_FADE_OUT_FRACTION);
  return (
    smooth(0, CHAPTER_RIPPLE_FADE_IN_MS, ageMs) *
    (1 - smooth(fadeOutStart, lifetimeMs, ageMs))
  );
}

/** Ring k (0..RING_COUNT-1) at an age: born `k * delay` after the
 * ripple spawns, expanding ease-out cubic to ITS OWN max radius
 * (stepped down per ring, see chapterRippleMaxRadius) over its own
 * lifetime (duration − k * delay). Alpha is the ring's envelope ×
 * peak. Before its delay the ring is unborn (radius 0, alpha 0);
 * after its lifetime it is gone. A negative age (rAF timestamp
 * lagging the spawn clock — see chapterRippleActive) clamps to 0:
 * the rings are born at the spawn point, never behind it. */
export function chapterRippleRing(
  ripple: ChapterRipple,
  ageMs: number,
  k: number,
): { r: number; alpha: number; widthCore: number; widthGlow: number } {
  const age = Math.max(0, ageMs);
  const delay = k * CHAPTER_RIPPLE_RING_DELAY_MS;
  const lifetime = CHAPTER_RIPPLE_DURATION_MS - delay;
  const ringAge = age - delay;
  if (ringAge < 0 || ringAge >= lifetime) {
    return { r: 0, alpha: 0, widthCore: 0, widthGlow: 0 };
  }
  const p = ringAge / lifetime;
  // Ease-out cubic: fast start, slow finish — the rings
  // decelerate as they spread, like water.
  const eased = 1 - (1 - p) * (1 - p) * (1 - p);
  const maxR = chapterRippleMaxRadius(ripple.narrow, k);
  const widthScale =
    1 - (1 - CHAPTER_RIPPLE_WIDTH_END_FRACTION) * p;
  return {
    r: maxR * eased,
    alpha: CHAPTER_RIPPLE_PEAK_ALPHA * chapterRippleEnvelope(ringAge, lifetime),
    widthCore:
      (ripple.narrow
        ? CHAPTER_RIPPLE_CORE_WIDTH_NARROW_PX
        : CHAPTER_RIPPLE_CORE_WIDTH_DESKTOP_PX) * widthScale,
    widthGlow:
      (ripple.narrow
        ? CHAPTER_RIPPLE_GLOW_WIDTH_NARROW_PX
        : CHAPTER_RIPPLE_GLOW_WIDTH_DESKTOP_PX) * widthScale,
  };
}

/** The center flash at an age: a bright spot at the spawn point
 * that fades linearly over the first 500ms and is gone after.
 * Anchors the ripple's origin at a glance (iter-29 lesson). */
export function chapterRippleFlash(
  ripple: ChapterRipple,
  ageMs: number,
): { radius: number; alpha: number } {
  const age = Math.max(0, ageMs);
  if (age >= CHAPTER_RIPPLE_FLASH_DURATION_MS) {
    return { radius: 0, alpha: 0 };
  }
  return {
    radius: ripple.narrow
      ? CHAPTER_RIPPLE_FLASH_RADIUS_NARROW_PX
      : CHAPTER_RIPPLE_FLASH_RADIUS_DESKTOP_PX,
    alpha:
      CHAPTER_RIPPLE_PEAK_ALPHA *
      (1 - age / CHAPTER_RIPPLE_FLASH_DURATION_MS),
  };
}

/** Spawn a ripple into the live set: appends, and drops the oldest
 * past the cap — a click flurry or a fast fling never floods the
 * canvas. Returns a new array; the input is untouched. */
export function chapterRippleSpawn(
  ripples: ReadonlyArray<ChapterRipple>,
  next: ChapterRipple,
): ChapterRipple[] {
  const out = [...ripples, next];
  while (out.length > CHAPTER_RIPPLE_MAX_CONCURRENT) out.shift();
  return out;
}
