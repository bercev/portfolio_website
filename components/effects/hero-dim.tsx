"use client";

import { useEffect, useRef } from "react";

import { REDUCED_MOTION_QUERY } from "@/lib/effect-policy";
import { scrollSnapshot, subscribeScrollSnapshot } from "@/lib/scroll-fx";

/**
 * HeroDim — a scroll-aware frosted dim over the procedural background.
 *
 * Strongest at the top of the page (hero), where the animated ASCII field is
 * most overwhelming, and fades out over the first viewport of scrolling so
 * deeper sections keep their full background energy.
 *
 * Deliberately a plain translucent gradient (no backdrop-filter): the journey
 * canvas already carries its own blur, and stacking another fullscreen
 * backdrop blur over animating WebGL would cost frames every tick. Opacity is
 * written directly to the DOM node (no React re-renders) inside rAF.
 */
export function HeroDim() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Scroll state comes from the shared snapshot publisher (run-2
    // iter 20) in full-motion — one sample per frame for every
    // consumer. Under prefers-reduced-motion the dim keeps its direct
    // sampling (today's behavior) and the publisher never starts for it.
    const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    const releaseSnapshot = reduceMotion
      ? undefined
      : subscribeScrollSnapshot();

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = (reduceMotion ? window.innerHeight : scrollSnapshot.vh) || 1;
      const y = reduceMotion ? window.scrollY : scrollSnapshot.y;
      const t = Math.min(1, Math.max(0, y / vh));
      // Smoothstep ease: full strength at scroll 0, fully gone after 1 viewport.
      const eased = t * t * (3 - 2 * t);
      const strength = 1 - eased;
      el.style.opacity = strength.toFixed(3);
      el.style.visibility = strength <= 0.01 ? "hidden" : "visible";
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      releaseSnapshot?.();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="hero-dim" data-hero-dim />;
}
