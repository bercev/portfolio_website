"use client";

import { useEffect, useRef } from "react";

import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";

/**
 * Scroll-depth effects shared by the background layers (scroll-reactive
 * background v2, 2026-10-23 — user: "more rotating 3d ascii / dither
 * effects in the background as we scroll... add a blur to the background
 * as we scroll so its not bad").
 */

/**
 * useScrollDive — scroll-depth "dive" transform for a fixed BACKGROUND
 * element: it sinks downward (translateY) and grows slightly (scale) as
 * scroll depth increases, so scrolling reads as the viewer moving past
 * the background object rather than the object sitting still.
 *
 * Like useScrollBlur, updates are rAF-throttled, quantized to keep the
 * transform changes to a handful per scroll gesture (the change is
 * compositor-only — no repaint), and disabled under
 * prefers-reduced-motion. Only ever attach to background layers.
 */
export function useScrollDive<T extends HTMLElement>(
  sinkPx = 64,
  grow = 0.08,
  active = true,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    let raf = 0;
    let queued = false;
    let lastY = -1;
    let lastS = -1;

    const apply = () => {
      queued = false;
      const p = getScrollProgress();
      const y = Math.round(p * sinkPx);
      const s = Math.round((1 + p * grow) * 1000) / 1000;
      if (y !== lastY || s !== lastS) {
        lastY = y;
        lastS = s;
        el.style.transform =
          y === 0 && s === 1
            ? ""
            : `translate3d(0, ${y}px, 0) scale(${s.toFixed(3)})`;
      }
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        raf = requestAnimationFrame(apply);
      }
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      el.style.transform = "";
    };
  }, [sinkPx, grow, active]);

  return ref;
}

/** Scroll progress through the document: 0 at the top, 1 at the bottom. */
export function getScrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / max));
}

/** Classic smoothstep over [0, 1] — used for fades and eased turns. */
export function smoothstep01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/**
 * Scroll-velocity "warp stretch" mapping (run-2 iter 2): during fast
 * scrolls the background glyph field elongates along the scroll axis —
 * a calm data-stream warp at full-motion, exactly zero at rest so the
 * still render is byte-identical to the pre-warp field.
 *
 * Below WARP_V_MIN px/s (slow reading scrolls) there is no stretch;
 * it eases up to full stretch at WARP_V_MAX (hard flings). Pure
 * function — unit-tested in scroll-fx.test.ts.
 */
const WARP_V_MIN = 350;
const WARP_V_MAX = 2600;

export function velocityStretch(vPxPerSec: number): number {
  const t =
    (Math.max(0, vPxPerSec) - WARP_V_MIN) / (WARP_V_MAX - WARP_V_MIN);
  return smoothstep01(t);
}

/**
 * Scroll-velocity skills-marquee mappings (run-2 iter 11, research iter 6 —
 * React Bits "Scroll Velocity" pattern). The skills marquee was the site's
 * only type in constant motion that scroll never touched; velocity now
 * injects energy — speed scales up to ~3.2x on hard flings, plus a subtle
 * skewX lean into the scroll direction.
 *
 * The calm-at-rest contract is exact, not asymptotic: below MARQ_V_MIN the
 * boost is literally 0 and the skew is literally 0, so at rest each row
 * runs at its constant base rate — the still render is identical to the
 * old CSS marquee (same 42s/50s base loop durations). No direction
 * reversal: both rows keep their forward/reverse counterpoint at every
 * speed; scroll only ever adds energy, never flips the reading direction.
 * Pure functions — unit-tested in scroll-fx.test.ts.
 */
export const MARQ_V_MIN = 120; // px/s — reading-speed deadband: no boost, no skew below this
export const MARQ_V_MAX = 1600; // px/s — full boost + full skew on hard flings
export const MARQ_BOOST_MAX = 2.2; // added to the 1x base: 3.2x top speed
export const MARQ_SKEW_MAX = 8; // degrees of lean at MARQ_V_MAX

/** Speed multiplier add-on from |scroll velocity| — exactly 0 below the deadband. */
export function marqueeBoost(vPxPerSec: number): number {
  const t = (Math.abs(vPxPerSec) - MARQ_V_MIN) / (MARQ_V_MAX - MARQ_V_MIN);
  return MARQ_BOOST_MAX * smoothstep01(t);
}

/** Signed skewX lean in degrees — exactly 0 below the deadband, capped at ±MARQ_SKEW_MAX. */
export function marqueeSkewDeg(vPxPerSec: number): number {
  if (Math.abs(vPxPerSec) < MARQ_V_MIN) return 0;
  const t = Math.min(1, Math.abs(vPxPerSec) / MARQ_V_MAX);
  return Math.sign(vPxPerSec) * MARQ_SKEW_MAX * t;
}

/**
 * Depth-of-field defocus for the 3D background objects (run-2 iter 3):
 * each object passes through a focal plane as it crosses its scroll
 * window — crisp at the window center (envelope ~1), softly defocused
 * toward the window edges (envelope ~0), so entrances/exits read as
 * directed transitions instead of hard alpha pops. The glyph field keeps
 * its own progressive CSS blur; objects live on a separate canvas layer
 * so the field's melt never smudges them (v85: the sphere/cube read as
 * gray blobs at 50/100% depth under the shared 2.5-5px blur).
 * Pure function — unit-tested in scroll-fx.test.ts.
 */
export function objectDefocus(envelope01: number, maxBlur = 3): number {
  const e = Math.min(1, Math.max(0, envelope01));
  return (1 - e) * maxBlur;
}

/**
 * Pointer inspection focus (run-2 IDEA iter 9 — user: "be more bold and
 * creative"): the scroll-window envelope interpolates toward full focus
 * as the pointer's inspection amount rises. Proximity PULLS the object
 * crisp — it never adds blur — so at inspect=0 the scroll-DOF grammar is
 * untouched (contract: the rest render is byte-identical) and at
 * inspect=1 the object renders at 0px defocus wherever it sits in its
 * window. Composes with objectDefocus: pass the result there.
 * Pure function — unit-tested in scroll-fx.test.ts.
 */
export function inspectFocusEnvelope(envelope01: number, inspect01: number): number {
  const e = Math.min(1, Math.max(0, envelope01));
  const iv = Math.min(1, Math.max(0, inspect01));
  return Math.min(1, e + iv * (1 - e));
}

/**
 * Ordered-dither dissolve level for the 3D background objects (run-2
 * iter 4): instead of a plain alpha crossfade, an object's scroll-window
 * envelope sweeps a Bayer-4x4 threshold pattern (16 levels, 0..15), so
 * entrances/exits dissolve through the brand's dither grammar — the
 * "craft lives between states" half the iter-3 idea named. Level 0 =
 * nothing passes, level 15 = everything passes (the settled window
 * renders identically to the pre-dissolve object).
 * Pure function — unit-tested in scroll-fx.test.ts.
 */
export function ditherDissolveLevel(envelope01: number): number {
  const e = Math.min(1, Math.max(0, envelope01));
  return Math.round(e * 15);
}

/**
 * Gaze tracking for the ASCII portrait bust (run-2 IDEA iter 5 — user:
 * "make my head rotate and stuff"). Maps the pointer's position relative
 * to the bust box into small head-turn angles: yaw (left/right) and pitch
 * (nod up/down). The bust composes these onto its scroll-driven turn, so
 * the head turns toward the visitor between scroll gestures.
 *
 * dx/dy are the pointer offsets from the box center, normalized to [-1, 1]
 * against the box half-extents (clamped — a pointer far off-box still caps
 * at the max turn). maxYaw/maxPitch cap the turn at a few degrees so the
 * gaze reads as a slow, person-like head turn rather than laser tracking.
 * Pure function — unit-tested in scroll-fx.test.ts.
 */
export function gazeAngles(
  dx: number,
  dy: number,
  maxYaw: number,
  maxPitch: number,
): { yaw: number; pitch: number } {
  const nx = Math.min(1, Math.max(-1, dx));
  const ny = Math.min(1, Math.max(-1, dy));
  return { yaw: nx * maxYaw, pitch: ny * maxPitch };
}

/**
 * Pointer light-wash falloff (run-2 IDEA iter 6 — user: "be more bold
 * and creative"): a light source follows the pointer and illuminates the
 * glyph field around it — the pointer's half of the background's
 * reactivity (scroll owns the other half). The falloff is 1 at the light
 * center, easing to 0 at `radiusPx` (smoothstep on the normalized
 * distance), so the lit region melts into the field instead of popping
 * at a hard edge. Pure function — unit-tested.
 */
export function lightWashFalloff(distPx: number, radiusPx: number): number {
  if (radiusPx <= 0) return 0;
  const t = 1 - Math.min(1, Math.max(0, distPx) / radiusPx);
  return smoothstep01(t);
}

/**
 * Single-pole low-pass toward a moving target — the "person turning their
 * head" feel behind the gaze: converges to ~90% in about a second at the
 * default rate, so a fast pointer flick never whips the bust. dtS is
 * seconds since the last tick. Pure function — unit-tested.
 */
export function approachAngle(
  current: number,
  target: number,
  dtS: number,
  rate = 2.2,
): number {
  return current + (target - current) * (1 - Math.exp(-dtS * rate));
}

// Whisper cap on the bust's pointer rim light (run-2 IDEA iter 13): the
// maximum added alpha on the fully-lit side. The bust is an opacity-40
// background texture, so this lifts it toward — never past — solid.
// NOTE: alpha alone barely reads — the point cloud saturates from
// overlapping glyph draws — so the light's real mechanism is the ramp
// shift below (character density encodes brightness in ASCII relief).
export const BUST_RIM_MAX = 0.32;
// Maximum added source-luminance for the glyph-ramp shift: the lit side
// draws denser characters (up to ~4 ramp steps of 14), which reads as
// light even where overlapping draws have saturated the alpha.
export const BUST_RIM_LUM = 0.3;
// Relief-normal z bias: the point relief reads as a surface facing the
// viewer, so the pseudo-normal leans toward +z.
export const BUST_RIM_DEPTH = 0.55;
// Light-direction z bias: the light comes slightly from the front, so the
// relief's front faces always catch a little of it.
export const BUST_RIM_FRONT = 0.45;

/**
 * Pointer rim light on the portrait bust (run-2 IDEA iter 13 — "one light,
 * whole scene"): the pointer light that washes the glyph field (iter 6)
 * also lights the bust's point relief. lightU/lightV is the pointer
 * position in the bust's own units (-1..1 ≈ box half-extents, matching the
 * point coordinates); pu/pv are the rotated point's coordinates in the
 * same space. Returns 0..1 — the dot of the point's pseudo-normal with the
 * light direction, clamped. The caller shapes it (smoothstep) and caps it
 * (BUST_RIM_MAX) and multiplies by the eased light presence, so at rest
 * (no pointer) the render is provably identical to the unlit one.
 * Pure function — unit-tested.
 */
export function bustRimLight(
  lightU: number,
  lightV: number,
  pu: number,
  pv: number,
): number {
  const nLen = Math.hypot(pu, pv, BUST_RIM_DEPTH);
  const lLen = Math.hypot(lightU, lightV, BUST_RIM_FRONT);
  if (nLen === 0 || lLen === 0) return 0;
  const dot =
    (pu * lightU + pv * lightV + BUST_RIM_DEPTH * BUST_RIM_FRONT) /
    (nLen * lLen);
  return Math.min(1, Math.max(0, dot));
}

/**
 * Presence of the pointer light over the bust: 1 at the bust center,
 * easing to 0 at three half-extents out — the light is local, so a
 * pointer across the screen doesn't spill onto the portrait. Eased in
 * the component with approachAngle (same ~1s low-pass as the gaze) and
 * relaxed to exactly 0 on pointerleave / hidden tab, mirroring the
 * light-wash contract. Pure function — unit-tested.
 */
export function bustLightPresence(distPx: number, halfPx: number): number {
  if (halfPx <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - Math.max(0, distPx) / (3 * halfPx)));
}

/**
 * Shapes the raw rim dot into the final 0..1 lift multiplier: only the
 * clearly-lit side (dot > 0.2) lifts, ramping to full at dot 0.75, scaled
 * by the eased light presence. At presence 0 this is exactly 0, which is
 * what keeps the at-rest render byte-identical to the unlit one.
 * Pure function — unit-tested.
 */
export function bustRimShaped(rim01: number, presence01: number): number {
  return (
    smoothstep01((rim01 - 0.2) / 0.55) * Math.min(1, Math.max(0, presence01))
  );
}

/**
 * Chapter-reactive background vocabulary (run-2 IDEA iter 7): the glyph
 * field speaks each chapter's language — code glyphs over experience,
 * math over publications — while the settled calm-at-rest contract holds
 * (vocabulary changes only dissolve during scroll, blend lands exactly
 * on the new vocabulary). The ids mirror the document order and the
 * line-sidebar rail's items.
 */
export const CHAPTER_IDS = [
  "home",
  "about",
  "publications",
  "experience",
  "projects",
  "skills",
  "contact",
] as const;

/**
 * Resolve the active chapter from viewport-relative section tops: the
 * last chapter whose top is at or above the activation line — the same
 * rule the line-sidebar rail uses. Tops for missing sections should be
 * passed as +Infinity so they never activate. Pure function —
 * unit-tested.
 */
export function resolveChapterIndex(
  topsPx: readonly number[],
  activationLinePx: number,
): number {
  let idx = 0;
  for (let i = 0; i < topsPx.length; i++) {
    if (topsPx[i] <= activationLinePx) idx = i;
  }
  return idx;
}

/**
 * Chapter-entry ping (run-2 IDEA iter 8): one-shot dither ring
 * expanding across the glyph field when the active chapter changes.
 * envelope = 0 at elapsed 0, fast attack to a soft peak, smoothstep
 * decay back to exactly 0 at duration — so the ping is a transient
 * boundary beat and rest stays calm. Pure function — unit-tested.
 */
export function pingEnvelope(elapsedS: number, durationS = 1.6): number {
  if (elapsedS < 0 || elapsedS >= durationS || durationS <= 0) return 0;
  const t = elapsedS / durationS;
  const attack = smoothstep01(t / 0.15);
  const decay = 1 - smoothstep01((t - 0.15) / 0.85);
  return Math.min(attack, decay);
}

/**
 * The ring front's radius fraction (0..1) at elapsedS — monotonic,
 * reaching full radius exactly at duration, so the wavefront sweeps
 * outward once and never returns. Pure function — unit-tested.
 */
export function pingRadius01(elapsedS: number, durationS = 1.6): number {
  if (elapsedS <= 0 || durationS <= 0) return 0;
  if (elapsedS >= durationS) return 1;
  return smoothstep01(elapsedS / durationS);
}

/**
 * Deterministic 32-bit integer hash → [0, 1). The entropy source for
 * the procedural noise below (and for stable per-glyph picks) —
 * Math.imul keeps the arithmetic in 32-bit integer space, so the
 * sequence is identical on every engine. Pure function — unit-tested.
 */
export function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Value noise in [0, 1): hash-lattice values with smoothstep
 * interpolation — cheap, deterministic, tileable enough for a ~130-glyph
 * field. Pure function — unit-tested.
 */
export function valueNoise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * Fractal Brownian motion in [0, 1): `octaves` layers of value noise at
 * doubling frequency and halving amplitude — the organic, torn-edge
 * field behind the chapter-crossing wipe (the Mora Romero era-change
 * grammar). Pure function — unit-tested.
 */
export function fbm2(x: number, y: number, octaves = 2): number {
  let v = 0;
  let amp = 0.5;
  let norm = 0;
  let fx = x;
  let fy = y;
  for (let i = 0; i < octaves; i++) {
    v += amp * valueNoise2(fx, fy);
    norm += amp;
    amp *= 0.5;
    fx *= 2.03;
    fy *= 2.03;
  }
  return norm > 0 ? v / norm : 0;
}

/**
 * Chapter-crossing noise wipe (run-2 IDEA iter 12 — Codrops, Juan Mora
 * Romero '26: "For the era change I used a dissolve with a hard edge.
 * Each pixel gets a noise value, and as the timeline moves forward a
 * threshold goes up, and the pixels under it switch to the new poster").
 *
 * The wipe is the CONTINUOUS, scroll-timeline-driven counterpart to the
 * one-shot chapter-entry ping: as the visitor scrolls between chapter
 * crossings, the glyph field's vocabulary tears from the outgoing
 * chapter's dialect to the incoming chapter's through an organic
 * hard-edged front. A pure function of scrollY over the whole page — no
 * per-crossing zones, so there is no handoff pop and scrolling back
 * reverses it exactly; at rest anywhere it is a static, deliberate
 * texture, and the reduced-motion still never runs it. Mora's timeline
 * maps to our scroll position; his fbm(uv) maps to fbm2 over glyph
 * screen positions plus a downward sweep bias so the front reads as a
 * tear rather than a statistical turnover.
 */

/** Feature size of the wipe's noise field, in CSS px. */
export const WIPE_NOISE_PX = 220;
/** Weights of the organic noise vs the directional sweep bias (sum to 1). */
export const WIPE_FBM_WEIGHT = 0.74;
export const WIPE_SWEEP_BIAS = 0.26;
/**
 * The wipe event occupies the middle of each inter-crossing interval —
 * the field holds each chapter's pure dialect while settled and tears
 * across in one deliberate event per crossing, eased at both ends.
 */
export const WIPE_WIN_A = 0.3;
export const WIPE_WIN_B = 0.7;

/**
 * The scrollY at which chapter `next` takes over from `prev`: the same
 * 45%-activation-line rule resolveChapterIndex uses — the scrollY where
 * the next section's document-relative top sits exactly on the line.
 * Pure function — unit-tested.
 */
export function chapterCrossingScrollY(
  docTopNextPx: number,
  viewportHPx: number,
): number {
  return docTopNextPx - viewportHPx * 0.45;
}

/**
 * Raw 0..1 progress across one inter-crossing interval [loPx, hiPx].
 * -Infinity lo (before the first crossing) pins 0, +Infinity hi (past
 * the last) pins 1 — the wipe is a total function of scrollY.
 * Pure function — unit-tested.
 */
export function wipeRawFrac(
  scrollYPx: number,
  loPx: number,
  hiPx: number,
): number {
  if (!Number.isFinite(loPx)) return 0;
  if (!Number.isFinite(hiPx)) return 1;
  if (hiPx <= loPx) return scrollYPx >= hiPx ? 1 : 0;
  return Math.min(1, Math.max(0, (scrollYPx - loPx) / (hiPx - loPx)));
}

/**
 * The wipe threshold: the raw interval progress concentrated into the
 * window [WIPE_WIN_A, WIPE_WIN_B] with smoothstepped ends — 0 while the
 * field holds the outgoing dialect, 1 once it holds the incoming
 * dialect. Pure function — unit-tested.
 */
export function wipeSweepThreshold(raw01: number): number {
  return smoothstep01((raw01 - WIPE_WIN_A) / (WIPE_WIN_B - WIPE_WIN_A));
}

/**
 * Deterministic character pick for the wipe: stable per (glyph,
 * crossing, side) — the same glyph on the same side of the same
 * crossing always shows the same character, so the wipe never boils or
 * shimmers as the front moves; no per-glyph state, no stale state after
 * jumps. Pure function — unit-tested.
 */
export function wipeGlyphChar(
  vocab: ReadonlyArray<string>,
  glyphIndex: number,
  crossingKey: number,
  incoming: boolean,
): string {
  const h = hash2(
    glyphIndex * 2 + (incoming ? 1 : 0),
    crossingKey,
  );
  return vocab[Math.floor(h * vocab.length)];
}

/**
 * useScrollBlur — progressive scroll blur for a fixed BACKGROUND element.
 *
 * As scroll depth increases the element gains blur, 0px at the top ramping
 * linearly to `maxBlur` at the bottom of the page, so background effects
 * recede and foreground content (never blurred — this hook is only ever
 * attached to background layers) stays crisp. Updates are rAF-throttled
 * and quantized to 0.5px steps, so the CSS filter (GPU-composited on the
 * fixed layers) changes at most a handful of times per scroll gesture
 * instead of repainting every scroll tick.
 *
 * Under prefers-reduced-motion the ramp is disabled entirely: no filter
 * is ever applied.
 */
export function useScrollBlur<T extends HTMLElement>(
  maxBlur = 5,
  active = true,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    let raf = 0;
    let queued = false;
    let lastBlur = -1;

    const apply = () => {
      queued = false;
      // Quantize to 0.5px steps.
      const b = Math.round(getScrollProgress() * maxBlur * 2) / 2;
      if (b !== lastBlur) {
        lastBlur = b;
        el.style.filter = b > 0 ? `blur(${b}px)` : "";
      }
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        raf = requestAnimationFrame(apply);
      }
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      el.style.filter = "";
    };
  }, [maxBlur, active]);

  return ref;
}
