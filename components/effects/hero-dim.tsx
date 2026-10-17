"use client";

import { useEffect, useRef } from "react";

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

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const t = Math.min(1, Math.max(0, window.scrollY / vh));
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
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="hero-dim" data-hero-dim />;
}
