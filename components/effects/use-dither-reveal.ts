// Ordered-dither dissolve reveal (run-8 RUN8-STYLE-DITHER, reel 7 #6;
// reel-4 rule 16, masks for reveals).
//
// A project or publication row dissolves in through the site's blue-noise
// tile instead of fading: on first scroll into view the row's mask-image
// sweeps the 32 thresholded tiles (lib/dither-mask.ts) over 0.65s on the
// site ease-out [0.16,1,0.3,1], then the mask is cleared so the settled row
// is exactly the unmasked row — no lingering paint or hit-test effect.
// The row's own opacity is never touched: this is a mask dissolve, not a
// fade (opacity stays 1 throughout, which is what the motion proof checks).
//
// Reduced motion: no mask is ever applied — rows render instantly, as
// before. SSR / no-JS: no mask either (tiles are generated client-side
// only), so rows are fully visible. Print: globals.css clears the mask
// under @media print, so a mid-reveal row still prints whole.
"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";

import { DITHER_STEPS, ditherMaskUrl } from "@/lib/dither-mask";

/** Same guard as aceternity-ascii-art.tsx: layout effect client-side only. */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const REVEAL_DURATION = 0.65;
/** R1 site ease-out — the dissolve is an entrance. */
const SITE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** Pre-start state: fully hidden (transparent everywhere). */
const HIDDEN_MASK = "linear-gradient(transparent, transparent)";

function setMask(el: HTMLElement, url: string | null) {
  if (url === null) {
    el.style.removeProperty("mask-image");
    el.style.removeProperty("-webkit-mask-image");
  } else {
    el.style.setProperty("mask-image", `url("${url}")`);
    el.style.setProperty("-webkit-mask-image", `url("${url}")`);
  }
}

function setHidden(el: HTMLElement) {
  el.style.setProperty("mask-image", HIDDEN_MASK);
  el.style.setProperty("-webkit-mask-image", HIDDEN_MASK);
}

/**
 * Attach to a project / publication row element. Returns the ref to spread
 * onto the row (with `data-dither-reveal` for the print guard + tile
 * repeat/size rules in globals.css).
 */
export function useDitherReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const reduceMotion = useReducedMotion();

  // Pre-start: hide the row before it enters view. Runs before paint, so
  // there is no flash of the full row on the frame it scrolls in.
  useIsoLayoutEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el) return;
    setHidden(el);
  }, [reduceMotion]);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const el = ref.current;
    if (!el) return;
    const controls = animate(0, 1, {
      duration: REVEAL_DURATION,
      ease: SITE_EASE,
      onUpdate: (p) => {
        if (p <= 0) {
          setHidden(el);
          return;
        }
        const step = Math.min(
          DITHER_STEPS - 1,
          Math.floor(p * DITHER_STEPS),
        );
        const url = ditherMaskUrl(step);
        if (url) setMask(el, url);
      },
      onComplete: () => setMask(el, null),
    });
    return () => controls.stop();
  }, [inView, reduceMotion]);

  return ref;
}
