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
    // Scroll state comes from the shared snapshot publisher (run-2
    // iter 20) — one sample per frame for every consumer, no skew.
    const releaseSnapshot = subscribeScrollSnapshot();

    let raf = 0;
    let queued = false;
    let lastY = -1;
    let lastS = -1;

    const apply = () => {
      queued = false;
      const p = scrollSnapshot.progress;
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
      releaseSnapshot();
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
 * Scroll-velocity chromatic channel split (run-2 iter 29, research iter 18
 * — Codrops Juan Mora Romero 2026: RGB channel-split offset driven by
 * scroll velocity). On hard flings the background ASCII 3D objects and the
 * chapter-entry ping ring separate into R/G/B channel ghosts offset along
 * the scroll-perpendicular axis — the site's fling state had warp-stretch
 * + marquee skew but no color-fringe texture; this is the missing partner.
 * Exactly 0 below CHROMA_V_MIN (reading scrolls), eases to CHROMA_PX_MAX
 * at CHROMA_V_MAX. The at-rest contract is exact: the component skips the
 * 3-pass blit entirely below 0.5px and draws the single normal pass, so
 * settled renders are byte-identical by construction. Background only —
 * never the wordmark (BERAT chroma was deliberately reduced for
 * readability). Pure function — unit-tested in scroll-fx.test.ts.
 */
export const CHROMA_V_MIN = 300; // px/s — deadband: no split on reading scrolls
export const CHROMA_V_MAX = 2200; // px/s — full split on hard flings
export const CHROMA_PX_MAX = 6; // CSS px max spread (±3px per channel pass)

export function chromaOffsetPx(vPxPerSec: number): number {
  if (!Number.isFinite(vPxPerSec)) return 0;
  const t = (Math.abs(vPxPerSec) - CHROMA_V_MIN) / (CHROMA_V_MAX - CHROMA_V_MIN);
  return CHROMA_PX_MAX * smoothstep01(t);
}

/**
 * Fling dither storm (run-2 IDEA iter 32, built iter 35): on a hard
 * scroll fling the glyph field briefly densifies with blue-noise dots
 * — the filed idea's own objection answered by construction. The filed
 * rationale warned the surge would fight the progressive scroll blur
 * into mush at exactly the moment both fire, so the level is the
 * velocity factor TIMES a sharpness factor: 1 at 0px blur (hero) fading
 * linearly to exactly 0 at STORM_BLUR_MAX (the useScrollBlur cap), so
 * deep in the page — where the field is already a 5px melt — the storm
 * cannot fire at all. Same deadband as the chroma split (300px/s), so
 * reading scrolls never densify and the storm fires only where the
 * chroma split already fires. Additive-only dots, so when the level
 * returns to exactly 0 the frame is byte-identical to the pre-fling
 * field. Pure function — unit-tested in scroll-fx.test.ts.
 */
export const STORM_V_MIN = CHROMA_V_MIN; // px/s — shared deadband
export const STORM_V_MAX = CHROMA_V_MAX; // px/s — full storm on hard flings
export const STORM_BLUR_MAX = 5; // px — the useScrollBlur cap

export function flingStormLevel(vPxPerSec: number, blurPx: number): number {
  if (!Number.isFinite(vPxPerSec) || !Number.isFinite(blurPx)) return 0;
  const vel = smoothstep01(
    (Math.abs(vPxPerSec) - STORM_V_MIN) / (STORM_V_MAX - STORM_V_MIN),
  );
  const sharp = 1 - Math.min(1, Math.max(0, blurPx / STORM_BLUR_MAX));
  return vel * sharp;
}

/**
 * Rail tracing beam (run-2 IDEA iter 42, built iter 43): a FROST beam
 * that travels the line-sidebar rail with scroll, stretching with
 * scroll speed — Aceternity's Tracing Beam, adapted to the rail the
 * site already owns. The beam is a gradient segment CENTERED on the
 * traveler (the scroll-progress arrow), so it extends the existing
 * marker instead of duplicating it: at rest it is a short static
 * segment (the base length), on a fling it stretches symmetrically
 * toward the cap. It shares the chroma/storm deadband (300px/s) and
 * full-stretch velocity (2200px/s), so reading scrolls never stretch
 * it and it fires exactly where the other fling effects fire. The
 * snapshot velocity is already low-passed by the publisher, so under
 * Lenis easing the length eases rather than jittering — the length
 * is a pure function of that smoothed value, with no per-tick layout
 * reads. Under reduced motion the beam element is hidden by a CSS
 * media query (it always renders, so SSR and the client agree — a
 * JS-conditional render caused a hydration mismatch), so RM frames
 * are unchanged. Returns a fraction of the rail height. Pure
 * function — unit-tested in scroll-fx.test.ts.
 */
export const RAIL_BEAM_BASE = 0.06; // rail-height fraction at rest
export const RAIL_BEAM_MAX = 0.22; // rail-height fraction on a hard fling

export function railBeamLength(vPxPerSec: number): number {
  if (!Number.isFinite(vPxPerSec)) return RAIL_BEAM_BASE;
  const t = smoothstep01(
    (Math.abs(vPxPerSec) - STORM_V_MIN) / (STORM_V_MAX - STORM_V_MIN),
  );
  return RAIL_BEAM_BASE + (RAIL_BEAM_MAX - RAIL_BEAM_BASE) * t;
}

/**
 * Chapter spotlight (run-2 IDEA, research iter 36 — Hon Tran's
 * spotlight-driven atmosphere: "WebGL used for atmosphere instead of
 * spectacle"). The background had EVENTS (ping, fling, glance, storm)
 * but no persistent per-chapter ATMOSPHERE: a whisper-alpha FROST
 * radial glow that sits over the reading column as a lighting STATE.
 * On chapter-index change it crossfades toward its target (~600ms
 * ease); at rest it is static, so it never joins the event stack.
 *
 * DELIBERATE DEVIATION from the filed build note ("taper its alpha
 * with blur like the fling-storm gate"): the storm tapers to exactly
 * 0 at the 5px blur cap because a one-shot surge must never fight
 * the blur into mush — but the spotlight is a STATE, and tapering it
 * to 0 would delete the atmosphere exactly in the deep chapters
 * where it lives. So the taper only halves it (1 at 0px blur, 0.5 at
 * the 5px cap): the canvas's own CSS blur already diffuses the glow
 * further, and the additive whisper alpha under the glyphs cannot
 * re-create the v85 gray-smudge (opaque gray mass, not a 0.06-alpha
 * light). Pure functions — unit-tested in scroll-fx.test.ts.
 */
export const SPOTLIGHT_ALPHA_MAX = 0.12; // whisper cap from the filed item
export const SPOTLIGHT_EASE_RATE = 5; // /s — ~95% toward target in 600ms
export const SPOTLIGHT_SNAP = 0.001; // snap-to-target band (exact rest)

/** Target glow alpha for a chapter: 0 inside the contact window (conversion quiet), the cap elsewhere. */
export function spotlightTargetAlpha(chapterIndex: number): number {
  if (!Number.isFinite(chapterIndex)) return 0;
  if (chapterIndex < 0 || chapterIndex > CHAPTER_IDS.length - 1) return 0;
  return chapterIndex === CHAPTER_IDS.length - 1
    ? 0
    : SPOTLIGHT_ALPHA_MAX;
}

/** Blur taper: 1 at 0px blur, 0.5 at the useScrollBlur cap — the state survives depth, halved. */
export function spotlightBlurTaper(blurPx: number): number {
  if (!Number.isFinite(blurPx)) return 0;
  return 1 - 0.5 * Math.min(1, Math.max(0, blurPx / STORM_BLUR_MAX));
}

/**
 * Content-column center x for a viewport width, from the station
 * grid in app/globals.css — no per-tick layout reads. Desktop: the
 * shell is min(w, 1200px), centered, with clamp(16px, 5vw, 64px)
 * inline padding, 12 columns, clamp(14px, 1.7vw, 28px) gaps, and the
 * reading column spans 7 of 12. Mobile (≤900px): the column spans
 * the full shell, so its center is the viewport center. The jump at
 * the 900px breakpoint is the CSS's own (the media query re-spans
 * the column there), not an artifact of this formula.
 */
export function spotlightCenterX(viewportW: number): number {
  if (!Number.isFinite(viewportW) || viewportW <= 0) return 0;
  if (viewportW <= 900) return viewportW / 2;
  const pad = Math.min(64, Math.max(16, viewportW * 0.05));
  const shell = Math.min(viewportW, 1200);
  const offset = (viewportW - shell) / 2;
  const gap = Math.min(28, Math.max(14, viewportW * 0.017));
  const inner = shell - 2 * pad;
  const col = (inner - 11 * gap) / 12;
  const mainW = 7 * col + 6 * gap;
  return offset + pad + mainW / 2;
}

/**
 * Object handoff constellation (run-2 IDEA iter 38 — the filed
 * "object constellation" item, rescued as a transient EVENT). The filed
 * item failed its own critique as a persistent web: lines sitting in
 * every settled frame would cross copy and duplicate the glance/answer
 * dialogue. This form answers every objection by construction: it
 * fires ONLY when the dominant object changes (one object handing off
 * to the next), draws a single dotted segment between the two objects'
 * mid-window anchors, then decays to exactly 0 — calm at rest, zero
 * ambient cost. Legibility is structural, not tuned: all three anchors
 * sit at x≈0.84–0.88 (the quiet right rail where the objects live),
 * so the segment never crosses the reading column; the dots are 3px
 * additive FROST, not a mass, so the scroll blur diffuses them rather
 * than smudging them (no blur taper — tapering would kill the second
 * handoff, which sits at ~3.6px blur). Desktop only: mobile draws
 * just the torus, so there is nothing to hand off to. Reduced-motion
 * untouched: the field's animated ticks own it. Pure functions —
 * unit-tested in scroll-fx.test.ts.
 */
export const CONSTELLATION_ALPHA_MAX = 0.2; // dotted-line peak alpha
export const CONSTELLATION_TAU_S = 0.5; // decay tau — visible ~1s, gone by cutoff
export const CONSTELLATION_CUTOFF_S = 1.8; // exactly 0 at/past this
export const CONSTELLATION_COOLDOWN_MS = 2000; // mirrors the glance cooldown: one beat per 2s
export const CONSTELLATION_ALPHA_GATE = 0.01; // same gate the field's place() uses to draw an object

/** Index of the loudest object window, or -1 when none is drawn. Strict > keeps ties on the earlier object. */
export function dominantObject(alphas: readonly number[]): number {
  let best = -1;
  let bestVal = CONSTELLATION_ALPHA_GATE;
  for (let i = 0; i < alphas.length; i++) {
    const a = alphas[i];
    if (Number.isFinite(a) && a > bestVal) {
      best = i;
      bestVal = a;
    }
  }
  return best;
}

/** One-shot handoff envelope: 1 at t=0, exponential decay, exactly 0 at/past the cutoff. */
export function constellationEnvelope(dtS: number): number {
  if (!Number.isFinite(dtS) || dtS < 0) return 0;
  if (dtS >= CONSTELLATION_CUTOFF_S) return 0;
  return Math.exp(-dtS / CONSTELLATION_TAU_S);
}

/** Viewport-fraction segment between two objects' mid-window anchors, or null for degenerate pairs. */
export function constellationSegment(
  from: number,
  to: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= OBJECT_WINDOWS.length ||
    to >= OBJECT_WINDOWS.length ||
    from === to
  ) {
    return null;
  }
  const a = OBJECT_WINDOWS[from];
  const b = OBJECT_WINDOWS[to];
  return { x0: a.mx, y0: a.my, x1: b.mx, y1: b.my };
}

/** Exponential ease toward the target; dt<=0 holds; snaps exactly onto the target inside SPOTLIGHT_SNAP. */
export function spotlightAlphaStep(
  current: number,
  target: number,
  dtS: number,
): number {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return 0;
  if (!(dtS > 0)) return current;
  const next =
    current + (target - current) * (1 - Math.exp(-SPOTLIGHT_EASE_RATE * dtS));
  return Math.abs(target - next) < SPOTLIGHT_SNAP ? target : next;
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
 * Polar precession for the dithered sphere (run-2 IDEA iter 25 — user:
 * "more rotating 3d ascii ... as we scroll"). The sphere was the only
 * background body with a frozen pole (tiltX was a constant 0.5): it spun
 * on one axis while the torus (B) and the cube (rotX) both tip with
 * scroll. This tips the sphere's polar axis as a pure function of its
 * own window progress — 0 at the dissolve edges (no fight with the
 * blue-noise envelope), peak mid-window, and scrolling back reverses the
 * tip exactly. The world-space light stays fixed, so shading stays
 * coherent while the dot lattice tips under it: the sphere reads as
 * tumbling, not just spinning. Amplitude is small by construction
 * (±20°); no feel-tuning under swiftshader — his hardware eyes are the
 * final gate.
 * Pure function — unit-tested in scroll-fx.test.ts.
 */
export const PRECESS_AMP = 0.35; // ±20° around the 0.5 base tilt
export function objectPrecession(windowT01: number): number {
  if (!Number.isFinite(windowT01)) return 0;
  const t = Math.min(1, Math.max(0, windowT01));
  return PRECESS_AMP * Math.sin(Math.PI * t);
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
 * rule shape the line-sidebar rail uses (the rail keeps its own
 * deliberate 35% line; the background systems share the 45% line via
 * the scroll snapshot publisher). Tops for missing sections should be
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
 * Terminal keystroke ripple (run-2 IDEA iter 26, built iter 41):
 * throttle gate for the field's action-gated beat — at most one ripple
 * per interval no matter how fast the visitor types or pastes. A
 * non-finite lastFireMs is the "never fired" sentinel (the bust's
 * -Infinity lastMoveT lesson: sentinels are valid inputs, not degenerate
 * ones), so it always allows the first ripple; a non-finite nowMs is
 * degenerate and never fires. Pure function — unit-tested.
 */
export function shouldFireKeyRipple(
  lastFireMs: number,
  nowMs: number,
  intervalMs = 250,
): boolean {
  if (!Number.isFinite(nowMs)) return false;
  if (!Number.isFinite(lastFireMs)) return true;
  return nowMs - lastFireMs >= Math.max(0, intervalMs);
}

// Portrait attention glance (run-2 IDEA iter 16): on chapter activation
// with an idle pointer, the bust glances toward the new chapter's
// headline — an additive yaw offset with an exponential decay, so the
// glance is a transient directed-motion beat and rest is provably
// byte-identical (exactly 0 beyond the cutoff). Direction: the headlines
// sit in the content column, left of the right-parked bust — the same
// sign convention gazeAngles uses (pointer-left → negative yaw → nose
// turns toward the pointer). Pure function — unit-tested.
export const GLANCE_AMP_RAD = 0.105; // ≈6° — a glance, not a turn
export const GLANCE_DIR = -1; // toward the content column (left)
export const GLANCE_TAU_MS = 400; // e-folding: ~1.2s to near-zero
export const GLANCE_CUTOFF_MS = 1500; // beyond this the offset is exactly 0
export const GLANCE_IDLE_MS = 2000; // no pointermove for this long = idle

export function glanceYawOffset(
  elapsedMs: number,
  amplitudeRad: number,
): number {
  if (elapsedMs < 0 || elapsedMs >= GLANCE_CUTOFF_MS || amplitudeRad === 0)
    return 0;
  return amplitudeRad * Math.exp(-elapsedMs / GLANCE_TAU_MS);
}

/**
 * "The head meets your eyes at contact" (run-2 IDEA iter 22, built
 * iter 23): over the contact chapter's scroll window — from the 45%
 * activation line that makes contact the active chapter (the same line
 * the background systems share via the scroll snapshot) to the bottom
 * of the page — a 0→1 ramp the bust multiplies against its own scroll
 * turn to ease the head back toward front-facing. The amplitude is
 * DERIVED from the scroll turn itself, never tuned: the bust composes
 * `-BUST_MAX_TURN * smoothstep01(p) * ramp`, so at the bottom the
 * scroll turn cancels exactly (the head faces the reader at
 * "Let's connect.") and outside the window the offset is exactly 0 —
 * chapters 0–5 render byte-identical to the pre-change tree. Pure
 * function — unit-tested.
 */
export function contactFaceRamp(
  scrollYPx: number,
  topsPx: readonly number[],
  viewportHPx: number,
  maxScrollPx: number,
): number {
  const contactTop = topsPx[CHAPTER_IDS.length - 1]; // "contact"
  if (!Number.isFinite(contactTop) || viewportHPx <= 0 || maxScrollPx <= 0)
    return 0;
  const start = contactTop - viewportHPx * 0.45; // the 45% activation line
  if (maxScrollPx - start <= 0) return 0; // degenerate: no window exists
  return smoothstep01((scrollYPx - start) / (maxScrollPx - start));
}

/**
 * Object attention (run-2 IDEA iter 19, built iter 21): the 3D objects'
 * scroll windows, in the same [a, b] pairs the glyph field composites
 * them on (floating-glyphs' TORUS_DIVE / SPHERE_DIVE / CUBE_DIVE — the
 * [a, b] here must stay byte-identical to those call sites), plus each
 * window's mid-window anchor as viewport fractions (the DivePose x/y
 * midpoints), so the bust can detect the 50%-line crossing AND the
 * object's screen azimuth from the shared scroll snapshot alone — zero
 * extra layout reads. Bust mounts at >=900px only, so these are the
 * desktop windows (the mobile torus has no bust to glance at it).
 */
export interface ObjectWindow {
  id: "torus" | "sphere" | "cube";
  a: number;
  b: number;
  mx: number; // mid-window anchor x, viewport fraction
  my: number; // mid-window anchor y, viewport fraction
}
export const OBJECT_WINDOWS: ObjectWindow[] = [
  { id: "torus", a: 0.02, b: 0.48, mx: (0.875 + 0.8) / 2, my: (0.82 + 0.58) / 2 },
  { id: "sphere", a: 0.38, b: 0.78, mx: (0.9 + 0.86) / 2, my: (0.14 + 0.38) / 2 },
  { id: "cube", a: 0.66, b: 1.05, mx: (0.875 + 0.8) / 2, my: (0.82 + 0.6) / 2 },
];

/**
 * Position within an object window as 0..1 — the same smoothstep the
 * field's windowT applies, so the bust's crossing detection agrees with
 * the field's envelope frame-for-frame. Pure function — unit-tested.
 */
export function objectWindowPos(p: number, w: ObjectWindow): number {
  const t = Math.min(1, Math.max(0, (p - w.a) / (w.b - w.a)));
  return t * t * (3 - 2 * t);
}

/**
 * True iff the 50% activation line lies strictly between the two
 * samples — fires in both scroll directions, symmetric like the chapter
 * glance. Strict inequality: sitting exactly on the line is not a
 * crossing. Pure function — unit-tested.
 */
export function objectWindowCrossed(prevT: number, curT: number): boolean {
  return (prevT - 0.5) * (curT - 0.5) < 0;
}

/**
 * Unit vector (viewport-fraction space, y down) from the bust's screen
 * center toward the object's mid-window anchor — the glance's azimuth.
 * The bust reads x≈0.84 of the viewport, so the torus/cube resolve to a
 * downward nod and the sphere to an up-right glance. Degenerate
 * (object exactly on the bust center — can't happen with the shipped
 * anchors, but the pure contract needs one) → {x: 0, y: 0}: no glance
 * direction, and the caller's amplitude math then yields exactly 0.
 * Pure function — unit-tested.
 */
export function objectGlanceDir(
  mx: number,
  my: number,
  bx: number,
  by: number,
): { x: number; y: number } {
  const dx = mx - bx;
  const dy = my - by;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

/**
 * Minimum interval between ANY two glances (chapter or object) — a
 * fling that crosses a chapter line and an object line in the same
 * second fires one beat, not two. Shared across both glance sources.
 */
export const GLANCE_COOLDOWN_MS = 2000;

/* ------------------------------------------------------------------ */
/* Object dialogue (run-2 IDEA iter 21, filed — built iter 22): the    */
/* glanced-at object answers the head's glance — a one-shot spin-up   */
/* of its rotation plus a brief wireframe flash on its tile. The bust  */
/* publishes the answer into scrollShared when an OBJECT glance fires  */
/* (chapter glances have no object to answer); the glyph field reads   */
/* it on its own tick and applies the envelopes to the matching tile.  */
/* The glance's idle gate + shared cooldown are inherited — an answer  */
/* can only ever follow a real fired glance, at most one per 2s.       */
/* ------------------------------------------------------------------ */

/**
 * Peak extra angular velocity of the answering object, rad/s — over the
 * ~0.5s tau the object gains ~1.1 rad (~63°): a visible flick-spin that
 * settles, not a blur. Integrated into the tile's rotation phase, so
 * after the cutoff the rate returns to base exactly and the object
 * rests at a new (stable) orientation.
 */
export const ANSWER_SPIN_RATE = 2.2;

/**
 * One-shot spin envelope: 1 at t=0, exponential decay with a ~0.5s tau,
 * exactly 0 at/past the cutoff — the at-rest contract mirrors the
 * glance's (GLANCE_TAU_MS/GLANCE_CUTOFF_MS). Pure function —
 * unit-tested.
 */
export const ANSWER_SPIN_TAU_S = 0.5;
export const ANSWER_SPIN_CUTOFF_S = 2.0;
export function answerSpinEnvelope(dtS: number): number {
  if (!Number.isFinite(dtS) || dtS < 0) return 0;
  if (dtS >= ANSWER_SPIN_CUTOFF_S) return 0;
  return Math.exp(-dtS / ANSWER_SPIN_TAU_S);
}

/**
 * One-shot wireframe flash envelope: ~80ms rise, ~0.35s decay, exactly 0
 * at/past the cutoff — the flash is over well before the spin settles,
 * so the two beats read as call-and-response, not one smear. Pure
 * function — unit-tested.
 */
export const ANSWER_WIRE_RISE_S = 0.08;
export const ANSWER_WIRE_TAU_S = 0.35;
export const ANSWER_WIRE_CUTOFF_S = 1.4;
/** Absolute wire alpha at the flash peak (inspection whisper is 0.32). */
export const ANSWER_WIRE_ALPHA = 0.55;
export function answerWireEnvelope(dtS: number): number {
  if (!Number.isFinite(dtS) || dtS < 0) return 0;
  if (dtS >= ANSWER_WIRE_CUTOFF_S) return 0;
  return smoothstep01(dtS / ANSWER_WIRE_RISE_S) * Math.exp(-dtS / ANSWER_WIRE_TAU_S);
}

/* ------------------------------------------------------------------ */
/* Sustained attention (run-2 IDEA iter 27, filed — built iter 28):    */
/* the glance (iter 16) and object-glance (iter 21) are one-shot       */
/* impulses (~1.2s decay); between scroll gestures — while the visitor */
/* is actually READING a chapter (scroll settled, pointer idle) — the  */
/* head holds a gentle sustained yaw toward the chapter headline. A    */
/* derived fraction of the glance's amplitude (settle, not snap — the  */
/* loop eases it in with the same approachAngle the pointer gaze      */
/* uses), released to exactly 0 on any scroll movement or pointer     */
/* activity, with an anti-stare auto-release so it never holds past   */
/* ~30s. At-rest contract: disengaged ⟺ exactly 0, so settled renders */
/* are byte-identical to the pre-attention tree. Pure state machine — */
/* unit-tested.                                                        */
/* ------------------------------------------------------------------ */

/** Fraction of GLANCE_AMP_RAD the sustained gaze holds — a whisper, not a turn. */
export const ATTENTION_FRAC = 0.4;
/** Idle-pointer gate, reused from the glance: an active pointer owns the head's attention. */
export const ATTENTION_IDLE_MS = GLANCE_IDLE_MS;
/** |velocity| below this (px/s, the publisher's low-passed snapshot value) reads as settled. */
export const ATTENTION_VEL_DEADBAND = 8;
/** Consecutive settled bust ticks (~15fps) before the gaze engages — ~0.8s. */
export const ATTENTION_SETTLE_TICKS = 12;
/** Anti-stare: never hold the gaze past this; release and require a fresh settle. */
export const ATTENTION_STARE_MS = 30_000;

export type AttentionState = {
  /** Consecutive ticks with |velocity| < ATTENTION_VEL_DEADBAND. */
  settledTicks: number;
  /** rAF timestamp (ms) the gaze engaged; -Infinity = disengaged. */
  engagedAt: number;
};

export const ATTENTION_REST: AttentionState = {
  settledTicks: 0,
  engagedAt: Number.NEGATIVE_INFINITY,
};

/**
 * One tick of the sustained-attention state machine. Inputs are the
 * shared snapshot's low-passed velocity, the loop's rAF timestamp, and
 * the last pointermove timestamp (-Infinity = never moved/idle — the
 * bust also sets this on pointerleave, so a departed pointer counts as
 * idle, exactly like the glance's gate). Every release condition
 * (scroll movement, pointer activity, anti-stare) fails DISENGAGED, so
 * the caller's amplitude is exactly 0 on the same tick. Degenerate
 * input fails disengaged — but -Infinity lastMoveMs is VALID (the idle
 * sentinel), only NaN / non-finite timestamps are degenerate. Pure
 * function — unit-tested.
 */
export function attentionStep(
  prev: AttentionState,
  velocityPxS: number,
  nowMs: number,
  lastMoveMs: number,
): AttentionState {
  if (
    Number.isNaN(velocityPxS) ||
    Number.isNaN(nowMs) ||
    Number.isNaN(lastMoveMs) ||
    !Number.isFinite(nowMs)
  ) {
    return ATTENTION_REST;
  }
  const engaged = prev.engagedAt !== Number.NEGATIVE_INFINITY;
  // Any scroll movement releases — and resets the settle count, so a
  // momentum tail re-settles through the deadband before re-engaging.
  if (Math.abs(velocityPxS) >= ATTENTION_VEL_DEADBAND) {
    return ATTENTION_REST;
  }
  // An active pointer owns the head's attention (the glance's idle gate).
  if (nowMs - lastMoveMs < ATTENTION_IDLE_MS) {
    return ATTENTION_REST;
  }
  // Anti-stare: release and require a fresh settle — the visible beat
  // that keeps the gaze from becoming a stare.
  if (engaged && nowMs - prev.engagedAt >= ATTENTION_STARE_MS) {
    return ATTENTION_REST;
  }
  const settledTicks = prev.settledTicks + 1;
  if (!engaged && settledTicks >= ATTENTION_SETTLE_TICKS) {
    return { settledTicks, engagedAt: nowMs };
  }
  return { settledTicks, engagedAt: prev.engagedAt };
}

/**
 * Live attention yaw target, rad — derived from the glance's own
 * amplitude and direction (never tuned): a fraction of the 6° glance
 * toward the content column. Exactly 0 when disengaged.
 */
export function attentionTargetYaw(state: AttentionState): number {
  return state.engagedAt === Number.NEGATIVE_INFINITY
    ? 0
    : ATTENTION_FRAC * GLANCE_AMP_RAD * GLANCE_DIR;
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
 * Shared live wipe threshold. Written by the glyph-field tick
 * (floating-glyphs.tsx) on animated ticks, read by the portrait bust's
 * draw loop — so the head tears through the same chapter crossing as
 * the field without duplicating the section-top layout reads.
 * Module-level on purpose: both are singleton background layers.
 * Defaults to 0 (rest). The bust never mounts under reduced motion,
 * so no RM branch is needed.
 *
 * objectAnswer is the reverse channel (run-2 IDEA iter 22 — the object
 * dialogue): written by the bust when an OBJECT glance fires
 * ({ obj: index into OBJECT_WINDOWS, t0: rAF timestamp }), read by the
 * glyph field on its own tick. The field owns expiry — it nulls the
 * signal once both envelopes read exactly 0. Defaults to null (rest).
 */
export const scrollShared = {
  wipeThr: 0,
  objectAnswer: null as { obj: number; t0: number } | null,
};

/* ------------------------------------------------------------------ */
/* Single scroll snapshot publisher (run-2 iter 20 — the iter-19       */
/* audit's fix). Before this, every scroll consumer sampled           */
/* window.scrollY on its own cadence: the glyph field tick (3         */
/* reads/draw at ~12fps), the bust loop (2 reads/tick at 15fps), the   */
/* scroll-event-driven hooks (up to 60fps) — so during flings the     */
/* field's warp, the bust's turn, the blur/dive ramps, the rail and   */
/* hero-dim disagreed by up to a few ticks, and THREE independent     */
/* chapter resolvers (field, bust, rail) could fire the ping, the      */
/* glance and the rail highlight ~130ms apart. Now ONE full-rate rAF   */
/* loop publishes { y, progress, velocity, chapterIndex, tops, vh }    */
/* and every consumer reads the same snapshot — same-frame agreement  */
/* by construction. Ref-counted: the loop runs while at least one     */
/* subscriber exists and stops when the last one leaves, so            */
/* reduced-motion paths (which never subscribe) keep zero rAF cost.   */
/* A uniform one-frame lag vs Lenis's write is possible depending on  */
/* registration order — harmless: every consumer shares the same      */
/* value, which is what the skew fix requires (HAOI's ScrollBus has   */
/* the same property).                                                */
/* ------------------------------------------------------------------ */

/** One published scroll sample — every field is scroll state, nothing else. */
export type ScrollSnapshot = {
  /** window.scrollY at publish time, px. */
  y: number;
  /** 0 at the top, 1 at the bottom — getScrollProgress(). */
  progress: number;
  /** Signed scroll velocity, px/s — the field's warp low-pass, shared. */
  velocity: number;
  /** resolveChapterIndex over tops at the 45% activation line. */
  chapterIndex: number;
  /** Document-relative section tops in CHAPTER_IDS order (+Infinity = missing). */
  tops: number[];
  /** window.innerHeight at publish time, px. */
  vh: number;
  /** Max scroll offset (docHeight - vh) at publish time, px. */
  maxY: number;
};

/**
 * The live snapshot. Mutated in place by the publisher each frame —
 * consumers read its fields synchronously inside their own rAF
 * callbacks (single-threaded: no tearing). Only valid while at least
 * one subscriber holds the publisher alive; every subscriber reads it
 * only after subscribing, and subscribe seeds it synchronously.
 */
export const scrollSnapshot: ScrollSnapshot = {
  y: 0,
  progress: 0,
  velocity: 0,
  chapterIndex: 0,
  tops: [],
  vh: 0,
  maxY: 0,
};

/**
 * Pure snapshot computation from explicit inputs — the unit-testable
 * core of the publisher. velocity is the field's warp low-pass
 * (1 - 0.88^(dt*60), the exact formula the glyph tick used), kept
 * SIGNED here: the field takes Math.abs at its velocityStretch call,
 * the marquee needs the sign for its skew direction. Pure function —
 * unit-tested.
 */
export function computeScrollSnapshot(
  scrollYPx: number,
  docHeightPx: number,
  viewportHPx: number,
  sectionTopsPx: readonly number[],
  dtS: number,
  prevYPx: number,
  prevVelocityPxS: number,
): ScrollSnapshot {
  const max = docHeightPx - viewportHPx;
  const progress =
    max <= 0 ? 0 : Math.min(1, Math.max(0, scrollYPx / max));
  const raw = dtS > 0 ? (scrollYPx - prevYPx) / dtS : 0;
  const velocity =
    prevVelocityPxS +
    (raw - prevVelocityPxS) * (1 - Math.pow(0.88, dtS * 60));
  const chapterIndex = resolveChapterIndex(
    sectionTopsPx.map((t) =>
      Number.isFinite(t)
        ? t - scrollYPx
        : Number.POSITIVE_INFINITY,
    ),
    viewportHPx * 0.45,
  );
  return {
    y: scrollYPx,
    progress,
    velocity,
    chapterIndex,
    tops: [...sectionTopsPx],
    vh: viewportHPx,
    maxY: max,
  };
}

let snapSubscribers = 0;
let snapRaf = 0;
let snapPrevY = 0;
let snapPrevVel = 0;
let snapLastT = 0;

function publishSnapshot(seed: boolean): void {
  const now = performance.now();
  // Clamp the frame delta so a tab-return can't inject a huge raw velocity.
  const dtS = seed ? 0 : Math.min(Math.max((now - snapLastT) / 1000, 0), 0.1);
  snapLastT = now;
  const y = window.scrollY;
  const vh = window.innerHeight;
  const next = computeScrollSnapshot(
    y,
    document.documentElement.scrollHeight,
    vh,
    CHAPTER_IDS.map((id) => {
      const el = document.getElementById(id);
      return el
        ? el.getBoundingClientRect().top + y
        : Number.POSITIVE_INFINITY;
    }),
    dtS,
    snapPrevY,
    snapPrevVel,
  );
  snapPrevY = next.y;
  snapPrevVel = next.velocity;
  scrollSnapshot.y = next.y;
  scrollSnapshot.progress = next.progress;
  scrollSnapshot.velocity = next.velocity;
  scrollSnapshot.chapterIndex = next.chapterIndex;
  scrollSnapshot.tops = next.tops;
  scrollSnapshot.vh = next.vh;
  scrollSnapshot.maxY = next.maxY;
}

function publishLoop(): void {
  if (snapSubscribers === 0 || document.hidden) return;
  publishSnapshot(false);
  snapRaf = requestAnimationFrame(publishLoop);
}

/**
 * Tab-hidden pause + resume correctness (run-2 iter 40 — research
 * iter 27 item, "pause the work, not only the pixels"). Browsers pause
 * rAF on hidden tabs, but that only pauses the pixels: the publisher's
 * pending frame resumes with a delta clamped to 0.1s over a stale
 * mid-fling velocity (~46% survives one clamped frame: 0.88^6), so warp
 * stretch / chroma-split / storm could misfire on tab return with zero
 * user input. Pause the work instead: cancel the loop on hidden, and on
 * visible reseed with velocity forced to 0. A bare dt=0 seed preserves
 * prevVel (see the seed test), so the reseed must zero snapPrevVel and
 * track snapPrevY to the current scroll position first — that
 * combination yields exactly 0. The glyph-field tick
 * (floating-glyphs) takes the same pause/resume pair. Reduced-motion
 * paths never subscribe, untouched.
 */
function onSnapshotVisibility(): void {
  if (snapSubscribers === 0) return;
  cancelAnimationFrame(snapRaf);
  if (document.hidden) return; // paused: no scheduled work while hidden
  snapPrevY = window.scrollY;
  snapPrevVel = 0;
  publishSnapshot(true); // dt=0 seed over zeroed state -> velocity exactly 0
  snapRaf = requestAnimationFrame(publishLoop);
}

/**
 * Hold the snapshot publisher alive; the returned function releases
 * it. The first subscriber seeds the snapshot synchronously, so a
 * read immediately after subscribing never sees the zero initial.
 * Call only from client effects (never under prefers-reduced-motion —
 * RM paths keep their direct sampling and zero rAF cost).
 */
export function subscribeScrollSnapshot(): () => void {
  snapSubscribers += 1;
  if (snapSubscribers === 1) {
    publishSnapshot(true);
    document.addEventListener("visibilitychange", onSnapshotVisibility);
    snapRaf = requestAnimationFrame(publishLoop);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    snapSubscribers = Math.max(0, snapSubscribers - 1);
    if (snapSubscribers === 0) {
      cancelAnimationFrame(snapRaf);
      document.removeEventListener("visibilitychange", onSnapshotVisibility);
    }
  };
}

/**
 * Bust dither-dissolve at chapter boundaries (run-2 IDEA iter 14 — "the
 * head tears at the boundary"): the portrait's point relief dissolves
 * through the same hard-edged fbm grammar as the glyph field's noise
 * wipe, then re-forms as the new chapter settles — the last background
 * layer to join the scroll language's chapter grammar.
 *
 * Depth is triangular on the sweep threshold: exactly 0 at wipeThr 0/1
 * (settled chapters — the at-rest render is byte-identical because the
 * gate is skipped entirely then), rising to BUST_WIPE_MAX_DROP mid-
 * window. A point drops when its stable per-point noise (fbm2 over its
 * own (u, v) — anchored to the head, never boiling) falls under the
 * depth. The cap keeps the head readable at the tear's peak: it never
 * fully vanishes, so the beat reads as deliberate dither, not a glitch.
 * Pure functions — unit-tested.
 */

/** Max fraction of bust points dropped at the tear's peak. */
export const BUST_WIPE_MAX_DROP = 0.55;
/** Noise feature scale in the bust's own units (u, v span -1..1). */
export const BUST_WIPE_NOISE_K = 3;

export function bustWipeDepth(wipeThr01: number): number {
  const t = Math.min(1, Math.max(0, wipeThr01));
  return BUST_WIPE_MAX_DROP * (1 - Math.abs(2 * t - 1));
}

export function bustWipeDrop(noise01: number, wipeThr01: number): boolean {
  return noise01 < bustWipeDepth(wipeThr01);
}

/**
 * Phosphor-persistence rotation ghosts (run-2 IDEA iter 17 — "make my
 * head rotate and stuff"): the head's scroll rotation reads, but its
 * motion arc is invisible — on a real CRT, bright moving content leaves
 * decaying phosphor trails. The bust canvas's per-tick fade is gated on
 * turn velocity: instead of a full clearRect, a destination-out fill at
 * the returned erase alpha multiplies every pixel's alpha by
 * (1 - erase), so mid-rotation frames leave decaying dithered ghosts.
 *
 * The deadband is the load-bearing constant: the idle sway never rests
 * (0.055 rad amplitude at 0.3 rad/s => max 0.0165 rad/s), so the erase is
 * exactly 0 at/below 0.03 rad/s (~2x the sway peak) and the caller takes
 * the literal clearRect path — the at-rest render is bit-identical to
 * the pre-ghost one by construction, not by tuning. Above the deadband
 * the erase ramps linearly to BUST_GHOST_ERASE_CAP. The gain/cap are a
 * conservative first pass: brisk flings (~0.3-0.5 rad/s) leave a faint
 * ~4-frame decay, slow scrolls a whisper, the ~1.2s glance a whisper —
 * the trail's aesthetics need real-hardware eyes (no parameter-circling
 * under swiftshader). Pure function — unit-tested.
 */
export const BUST_GHOST_DEADBAND = 0.03; // rad/s — above the idle-sway peak
export const BUST_GHOST_GAIN = 0.55; // erase per (rad/s) above the deadband
export const BUST_GHOST_ERASE_CAP = 0.7; // never erase more than this/tick

export function bustGhostErase(turnVelRadS: number): number {
  if (!Number.isFinite(turnVelRadS) || turnVelRadS <= BUST_GHOST_DEADBAND)
    return 0;
  return Math.min(
    BUST_GHOST_ERASE_CAP,
    BUST_GHOST_GAIN * (turnVelRadS - BUST_GHOST_DEADBAND),
  );
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
    // Scroll state comes from the shared snapshot publisher (run-2
    // iter 20) — one sample per frame for every consumer, no skew.
    const releaseSnapshot = subscribeScrollSnapshot();

    let raf = 0;
    let queued = false;
    let lastBlur = -1;

    const apply = () => {
      queued = false;
      // Quantize to 0.5px steps.
      const b = Math.round(scrollSnapshot.progress * maxBlur * 2) / 2;
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
      releaseSnapshot();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      el.style.filter = "";
    };
  }, [maxBlur, active]);

  return ref;
}

/* ------------------------------------------------------------------ */
/* Shape-aware ASCII print (run-2 iter 15, Codrops Lunardi Sep 2026    */
/* "Beyond the Luminance Ramp"). A luminance ramp sorts tone by        */
/* brightness but knows nothing about where brightness sits inside    */
/* the cell, so diagonal edges dissolve into tone-noise (the v87      */
/* torus crop: ring arcs printed as horizontal dash streaks). Where    */
/* a cell sits on the object's silhouette boundary, pick the glyph    */
/* by the edge's screen-space tangent instead of its brightness —     */
/* the character follows the edge. Interiors keep the ramp (tone).    */
/* Reduced-motion untouched: objects never draw there.                */
/* ------------------------------------------------------------------ */

/**
 * Edge-following glyph for a screen-space tangent (y down). The
 * tangent is unoriented (a line has no arrow), so the angle folds
 * into [0, π) and quantizes to the 4 directional glyphs.
 */
export function shapeGlyphForTangent(tx: number, ty: number): string {
  let a = Math.atan2(ty, tx) % Math.PI;
  if (a < 0) a += Math.PI;
  const bin = Math.round(a / (Math.PI / 4)) % 4;
  // 0 → "-" (horizontal), π/4 → "\" (down-right), π/2 → "|",
  // 3π/4 → "/" (up-right = down-left, same unoriented line).
  return ["-", "\\", "|", "/"][bin];
}

/**
 * Silhouette-boundary glyph for a cell occupancy grid: a filled cell
 * with at least one empty 4-neighbor sits on the object's edge. The
 * outward normal is the sum of the empty-neighbor directions; the
 * edge tangent is perpendicular to it (screen space, y down).
 * Returns the edge-following glyph, or null for interior cells.
 * Out-of-grid counts as FILLED — the objects never reach the tile
 * edge, so only true sampling gaps trigger.
 */
export function boundaryShapeGlyph(
  occ: Uint8Array,
  cols: number,
  rows: number,
  col: number,
  row: number,
): string | null {
  const filled = (c: number, r: number): boolean => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return true;
    return occ[r * cols + c] !== 0;
  };
  let nx = 0;
  let ny = 0;
  if (!filled(col + 1, row)) nx += 1;
  if (!filled(col - 1, row)) nx -= 1;
  if (!filled(col, row + 1)) ny += 1;
  if (!filled(col, row - 1)) ny -= 1;
  if (nx === 0 && ny === 0) return null;
  return shapeGlyphForTangent(-ny, nx);
}
