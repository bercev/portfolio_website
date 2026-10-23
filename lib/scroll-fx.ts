"use client";

import { useEffect, useRef } from "react";

import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";

/**
 * Scroll-depth effects shared by the background layers (scroll-reactive
 * background v2, 2026-10-23 — user: "more rotating 3d ascii / dither
 * effects in the background as we scroll... add a blur to the background
 * as we scroll so its not bad").
 */

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
