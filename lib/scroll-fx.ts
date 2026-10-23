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
